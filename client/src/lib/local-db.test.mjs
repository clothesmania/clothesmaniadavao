import 'fake-indexeddb/auto'
import test, { beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import Dexie from 'dexie'
import { addOrderPayment, bindLocalWorkspaceToUser, cancelOrder, createOrder, getFinancialSummary, getOrderDetails, getPendingOutboxEvents, importLegacySnapshot, listProducts, localDb, receiveStock, recordOrderRefund, saveProduct, unwrapLegacySnapshot, updateOutboxEvent } from './local-db.js'

beforeEach(async () => {
  if (localDb.isOpen()) localDb.close()
  await localDb.delete()
  await localDb.open()
})

test('product creation and opening stock commit with movement and outbox records', async () => {
  const product = await saveProduct({ name: 'Classic Tee', sku: 'tee-01', cost: 120, price: 350, quantity: 4 })
  const stored = await localDb.products.get(product.id)
  const movements = await localDb.stockMovements.where('productId').equals(product.id).toArray()
  const events = await getPendingOutboxEvents()

  assert.equal(stored.quantity, 4)
  assert.equal(movements.length, 1)
  assert.equal(movements[0].quantity, 4)
  assert.deepEqual(events.map(event => event.entityType), ['product', 'stock_movement', 'audit_log'])
})

test('stock-in updates quantity and creates one corresponding movement and sync event', async () => {
  const product = await saveProduct({ name: 'Pants', sku: 'pants-01', cost: 200, price: 450, quantity: 0 })
  await receiveStock(product.id, 3, 'Supplier delivery')

  assert.equal((await localDb.products.get(product.id)).quantity, 3)
  assert.equal(await localDb.stockMovements.where('productId').equals(product.id).count(), 1)
  assert.equal(await localDb.outbox.where('entityType').equals('stock_movement').count(), 1)
})

test('product order deducts stock atomically and records an initial payment', async () => {
  const product = await saveProduct({ name: 'Pants', sku: 'pants-02', cost: 100, price: 250, quantity: 4 })
  const order = await createOrder({ buyer: 'Buyer A', productId: product.id, quantity: 2, unitPrice: 240, initialPayment: 100, paymentMethod: 'GCash', actor: { id: 'admin-1', email: 'admin@example.com' } })
  const details = await getOrderDetails(order.id)
  const movements = await localDb.stockMovements.where('productId').equals(product.id).toArray()

  assert.equal((await localDb.products.get(product.id)).quantity, 2)
  assert.equal(details.order.total, 480)
  assert.equal(details.paid, 100)
  assert.equal(details.balance, 380)
  assert.equal(movements.find(movement => movement.type === 'stock_out').quantity, 2)
  assert.equal(await localDb.payments.where('orderId').equals(order.id).count(), 1)
  assert.equal((await localDb.auditLogs.where('entityId').equals(order.id).first()).actorEmail, 'admin@example.com')
})

test('overselling rejects without creating an order or changing stock', async () => {
  const product = await saveProduct({ name: 'Hat', sku: 'hat-01', cost: 20, price: 50, quantity: 1 })
  await assert.rejects(createOrder({ buyer: 'Buyer B', productId: product.id, quantity: 2 }))
  assert.equal((await localDb.products.get(product.id)).quantity, 1)
  assert.equal(await localDb.orders.count(), 0)
})

test('free-form order has no inventory movement', async () => {
  const order = await createOrder({ buyer: 'Buyer C', item: 'Custom bundle', quantity: 1, unitPrice: 150 })
  assert.equal(order.productId, null)
  assert.equal(await localDb.stockMovements.count(), 0)
  assert.equal(await localDb.orders.count(), 1)
})

test('local workspace binds to one account and rejects another account', async () => {
  await bindLocalWorkspaceToUser({ id: 'admin-one', email: 'one@example.com' })
  await assert.rejects(bindLocalWorkspaceToUser({ id: 'admin-two', email: 'two@example.com' }), /linked to a different account/)
  assert.equal((await localDb.metadata.get('workspaceOwner')).userId, 'admin-one')
})

test('payment, cancellation, stock return, and refund remain auditable', async () => {
  const product = await saveProduct({ name: 'Jacket', sku: 'jacket-01', cost: 300, price: 700, quantity: 3 })
  const order = await createOrder({ buyer: 'Buyer D', productId: product.id, quantity: 1 })
  await addOrderPayment(order.id, { amount: 300, method: 'Cash', reference: 'RCPT-1' })
  await cancelOrder(order.id, 'Customer cancelled')
  await recordOrderRefund(order.id, { amount: 100, method: 'Cash', reason: 'Partial refund' })

  const details = await getOrderDetails(order.id)
  assert.equal(details.order.status, 'cancelled')
  assert.equal(details.paid, 300)
  assert.equal(details.refunded, 100)
  assert.equal(details.balance, 0)
  assert.equal((await localDb.products.get(product.id)).quantity, 3)
  const movements = await localDb.stockMovements.where('productId').equals(product.id).toArray()
  assert.equal(movements.sort((first, second) => first.occurredAt.localeCompare(second.occurredAt)).at(-1).type, 'sale_return')
  assert.equal((await localDb.auditLogs.where('entityId').equals(order.id).count()), 4)
})

test('financial summary excludes samples and cancelled sales but nets refunds from collected cash', async () => {
  const active = await createOrder({ buyer: 'Active', item: 'Free item', unitPrice: 200, initialPayment: 100 })
  const cancelled = await createOrder({ buyer: 'Cancelled', item: 'Free item', unitPrice: 80, initialPayment: 80 })
  await cancelOrder(cancelled.id, 'Cancelled before delivery')
  await recordOrderRefund(cancelled.id, { amount: 30, method: 'Cash' })
  await localDb.orders.update(active.id, { isSample: true })

  const summary = await getFinancialSummary('0000-01-01', '9999-12-31')
  assert.equal(summary.grossSales, 0)
  assert.equal(summary.cashCollected, 50)
  assert.equal(summary.pending, 0)
  assert.equal(summary.orders, 0)
})

test('duplicate SKU failure leaves the original product unchanged', async () => {
  const product = await saveProduct({ name: 'Original', sku: 'unique-01', cost: 1, price: 2, quantity: 2 })
  await assert.rejects(saveProduct({ name: 'Duplicate', sku: 'UNIQUE-01', cost: 1, price: 2, quantity: 1 }))
  assert.equal(await localDb.products.count(), 1)
  assert.equal((await localDb.products.get(product.id)).quantity, 2)
})

test('outbox updates use their stable event id and legacy migration preserves records and sample flags', async () => {
  const legacy = new Dexie('ClothesManiaDB')
  legacy.version(1).stores({ kv: '&key' })
  await legacy.open()
  const snapshot = {
    shirts: [
      { id: 's1', name: 'Seed item', size: 'M', cost: 10, price: 20, qty: 2 },
      { id: 's_custom', name: 'Live item', size: 'L', cost: 30, price: 60, qty: 0 }
    ],
    mines: [{ id: 'm1', name: 'Sample buyer', item: 'Sample shirt', total: 20, status: 'PAID' }, { id: 'm_custom', name: 'Real buyer', item: 'Real shirt', total: 60, dp: 10, status: 'UNPAID' }],
    dailyLedger: [{ date: '2026-10-14', afternoon: 20 }],
    liveSessions: [{ id: 'session-a', date: '2026-10-14' }]
  }
  await legacy.kv.put({ key: 'db', value: snapshot })
  legacy.close()

  const imported = await importLegacySnapshot(snapshot)
  const products = await listProducts()
  const storedSnapshot = await localDb.legacyRecords.get('legacy-snapshot-v1')
  const snapshotEvent = await localDb.outbox.where('entityType').equals('legacy_snapshot').first()
  const importedOrders = await localDb.orders.orderBy('legacyId').toArray()
  await updateOutboxEvent(snapshotEvent.id, { status: 'failed', lastError: 'retry me' })
  const updatedEvent = await localDb.outbox.where('id').equals(snapshotEvent.id).first()

  assert.equal(imported.products, 2)
  assert.equal(products.find(product => product.legacyId === 's1').isSample, true)
  assert.equal(products.find(product => product.legacyId === 's_custom').isSample, false)
  assert.equal(products.find(product => product.legacyId === 's1').quantity, 2)
  assert.equal((await localDb.stockMovements.where('productId').equals(products.find(product => product.legacyId === 's1').id).first()).quantity, 2)
  assert.deepEqual(storedSnapshot.payload, snapshot)
  assert.equal(updatedEvent.status, 'failed')
  assert.equal(await localDb.outbox.where('entityType').equals('legacy_snapshot').count(), 1)
  assert.equal(importedOrders.length, 2)
  assert.equal(importedOrders.find(order => order.legacyId === 'm1').isSample, true)
  assert.equal(importedOrders.find(order => order.legacyId === 'm_custom').isSample, false)
  assert.equal((await localDb.payments.where('orderId').equals(importedOrders.find(order => order.legacyId === 'm1').id).first()).amount, 20)
  assert.equal((await localDb.payments.where('orderId').equals(importedOrders.find(order => order.legacyId === 'm_custom').id).first()).amount, 10)
})

test('legacy backup files accept raw and wrapped exports but reject unrelated JSON', () => {
  const snapshot = { shirts: [], mines: [], dailyLedger: [] }
  assert.deepEqual(unwrapLegacySnapshot(snapshot), snapshot)
  assert.deepEqual(unwrapLegacySnapshot({ format: 'clothes-mania-legacy-backup', version: 1, snapshot }), snapshot)
  assert.throws(() => unwrapLegacySnapshot({ products: [] }), /recognized legacy records/)
})
