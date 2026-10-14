import Dexie from 'dexie'
import { isLegacySampleRecord, roundMoney, validateOrder, validatePaymentAmount, validateProduct } from './validation.js'

export const localDb = new Dexie('ClothesManiaPOS')

localDb.version(1).stores({
  products: '&id,sku,name,category,updatedAt,isSample',
  stockMovements: '&id,productId,type,occurredAt,isSample',
  outbox: '++sequence,&id,entityType,entityId,createdAt,status',
  metadata: '&key',
  legacyRecords: '&id,entityType,legacyId,isSample'
})

localDb.version(2).stores({
  products: '&id,sku,name,category,updatedAt,isSample,legacyId',
  stockMovements: '&id,productId,type,occurredAt,isSample',
  outbox: '++sequence,&id,entityType,entityId,createdAt,status',
  metadata: '&key',
  legacyRecords: '&id,entityType,legacyId,isSample',
  orders: '&id,legacyId,productId,orderDate,status,isSample,createdAt',
  payments: '&id,orderId,paidAt,isSample',
  refunds: '&id,orderId,refundedAt,isSample',
  liveSessions: '&id,legacyId,date,isSample',
  auditLogs: '&id,entityType,entityId,actorId,occurredAt,isSample'
})

const makeId = () => crypto.randomUUID()
const now = () => new Date().toISOString()

function normalizedTimestamp(value, fallback = null) {
  if (!value) return fallback
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? fallback : date.toISOString()
}

function normalizedDate(value, fallback) {
  const date = String(value || '')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return fallback
  const [year, month, day] = date.split('-').map(Number)
  const parsed = new Date(year, month - 1, day)
  if (Number.isNaN(parsed.getTime()) || parsed.getFullYear() !== year || parsed.getMonth() !== month - 1 || parsed.getDate() !== day) return fallback
  return date
}

function outboxEvent(entityType, entityId, operation, payload) {
  return {
    id: makeId(),
    entityType,
    entityId,
    operation,
    payload,
    createdAt: now(),
    status: 'pending',
    attempts: 0
  }
}

export async function listProducts() {
  return localDb.products.orderBy('name').toArray()
}

export async function saveProduct(input, existingId = null) {
  return localDb.transaction('rw', localDb.products, localDb.stockMovements, localDb.auditLogs, localDb.outbox, async () => {
    const products = await localDb.products.toArray()
    const existing = existingId ? await localDb.products.get(existingId) : null
    if (existingId && !existing) throw new Error('This product is no longer available. Refresh and try again.')

    const product = validateProduct({ ...input, id: existing?.id || makeId() }, products)
    const timestamp = now()
    product.createdAt = existing?.createdAt || timestamp
    product.updatedAt = timestamp
    product.quantity = existing?.quantity || 0

    if (existing) {
      await localDb.products.put(product)
    } else {
      await localDb.products.add(product)
    }

    await localDb.outbox.add(outboxEvent('product', product.id, 'upsert', { ...product }))

    const openingQuantity = Number(input.quantity || 0)
    if (!existing && openingQuantity > 0) {
      await addStockMovementInTransaction(product, openingQuantity, 'Opening stock')
    }
    const audit = auditEvent(existing ? 'product_updated' : 'product_created', 'product', product.id, `${product.name} · ${product.sku}`, product.isSample, input.actor)
    await localDb.auditLogs.add(audit)
    await localDb.outbox.add(outboxEvent('audit_log', audit.id, 'insert', audit))
    return product
  })
}

async function addStockMovementInTransaction(product, quantity, note) {
  const timestamp = now()
  const movement = {
    id: makeId(),
    productId: product.id,
    type: 'stock_in',
    quantity,
    note: String(note || '').trim(),
    occurredAt: timestamp,
    isSample: Boolean(product.isSample)
  }
  product.quantity += quantity
  product.updatedAt = timestamp
  await localDb.products.put(product)
  await localDb.stockMovements.add(movement)
  await localDb.outbox.add(outboxEvent('stock_movement', movement.id, 'apply', {
    ...movement,
    product: { id: product.id, sku: product.sku, name: product.name, isSample: product.isSample }
  }))
  return movement
}

export async function receiveStock(productId, quantity, note, actor = null) {
  if (!Number.isInteger(quantity) || quantity < 1) throw new Error('Enter a whole-number quantity greater than zero.')
  return localDb.transaction('rw', localDb.products, localDb.stockMovements, localDb.auditLogs, localDb.outbox, async () => {
    const product = await localDb.products.get(productId)
    if (!product) throw new Error('Product not found. Refresh and try again.')
    const movement = await addStockMovementInTransaction(product, quantity, note)
    const audit = auditEvent('stock_received', 'product', product.id, `${quantity} unit(s) · ${String(note || 'Stock-in')}`, product.isSample, actor)
    await localDb.auditLogs.add(audit)
    await localDb.outbox.add(outboxEvent('audit_log', audit.id, 'insert', audit))
    return movement
  })
}

function auditEvent(action, entityType, entityId, summary, isSample = false, actor = null) {
  return {
    id: makeId(), action, entityType, entityId, summary, occurredAt: now(), isSample,
    actorId: actor?.id || null, actorEmail: actor?.email || 'Local operator'
  }
}

function movementEvent(product, type, quantity, note, orderId = null) {
  const movement = {
    id: makeId(), productId: product.id, type, quantity, note: String(note || '').trim(),
    occurredAt: now(), isSample: Boolean(product.isSample), orderId
  }
  product.quantity += type === 'stock_in' || type === 'sale_return' ? quantity : -quantity
  product.updatedAt = movement.occurredAt
  return movement
}

async function saveMovementAndQueue(product, movement) {
  await localDb.products.put(product)
  await localDb.stockMovements.add(movement)
  await localDb.outbox.add(outboxEvent('stock_movement', movement.id, 'apply', {
    ...movement,
    product: { id: product.id, sku: product.sku, name: product.name, isSample: product.isSample }
  }))
}

function orderBalance(order, payments, refunds = []) {
  const orderPayments = payments.filter(payment => payment.orderId === order.id && !payment.isSample)
  const orderRefunds = refunds.filter(refund => refund.orderId === order.id && !refund.isSample)
  const paid = orderPayments.reduce((total, payment) => total + Number(payment.amount), 0)
  const refunded = orderRefunds.reduce((total, refund) => total + Number(refund.amount), 0)
  return { paid: roundMoney(paid), refunded: roundMoney(refunded), balance: order.status === 'active' ? roundMoney(Math.max(0, order.total - paid)) : 0 }
}

function localDateKeyFromTimestamp(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export async function createOrder(input) {
  return localDb.transaction('rw', localDb.products, localDb.orders, localDb.payments, localDb.stockMovements, localDb.auditLogs, localDb.outbox, async () => {
    const product = input.productId ? await localDb.products.get(input.productId) : null
    if (input.productId && !product) throw new Error('Selected product was not found. Refresh and try again.')
    const details = validateOrder(input, product)
    if (product && product.quantity < details.quantity) throw new Error(`Only ${product.quantity} unit(s) are available.`)

    const orderId = makeId()
    const timestamp = now()
    const order = {
      id: orderId,
      legacyId: null,
      buyer: details.buyer,
      item: details.item,
      productId: product?.id || null,
      sku: product?.sku || String(input.sku || ''),
      quantity: details.quantity,
      unitPrice: details.unitPrice,
      unitCost: product?.cost || 0,
      total: details.total,
      orderDate: input.orderDate || timestamp.slice(0, 10),
      orderTime: input.orderTime || new Date(timestamp).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' }),
      sessionId: input.sessionId || null,
      sessionName: String(input.sessionName || '').trim(),
      seller: String(input.seller || '').trim(),
      status: 'active',
      isSample: false,
      createdAt: timestamp,
      updatedAt: timestamp
    }

    const paymentAmount = input.initialPayment === '' || input.initialPayment == null ? 0 : roundMoney(input.initialPayment)
    if (paymentAmount < 0 || paymentAmount > order.total) throw new Error('Initial payment must be between zero and the order total.')
    const payment = paymentAmount > 0 ? {
      id: makeId(), orderId, amount: paymentAmount,
      method: String(input.paymentMethod || 'Cash').trim(),
      reference: String(input.paymentReference || '').trim(),
      paidAt: timestamp, isSample: false
    } : null

    if (product) {
      const movement = movementEvent(product, 'stock_out', details.quantity, `Mine order ${orderId}`, orderId)
      await saveMovementAndQueue(product, movement)
    }
    await localDb.orders.add(order)
    await localDb.outbox.add(outboxEvent('sales_order', order.id, 'upsert', order))
    if (payment) {
      await localDb.payments.add(payment)
      await localDb.outbox.add(outboxEvent('payment', payment.id, 'insert', payment))
    }
    const audit = auditEvent('order_created', 'sales_order', order.id, `${order.buyer} · ${order.item} · ${order.total}`, false, input.actor)
    await localDb.auditLogs.add(audit)
    await localDb.outbox.add(outboxEvent('audit_log', audit.id, 'insert', audit))
    return order
  })
}

export async function listOrders() {
  return localDb.orders.orderBy('createdAt').reverse().toArray()
}

export async function getOrderDetails(orderId) {
  const order = await localDb.orders.get(orderId)
  if (!order) return null
  const [payments, refunds] = await Promise.all([
    localDb.payments.where('orderId').equals(orderId).toArray(),
    localDb.refunds.where('orderId').equals(orderId).toArray()
  ])
  return { order, payments, refunds, ...orderBalance(order, payments, refunds) }
}

export async function listOrderDetails() {
  const [orders, payments, refunds] = await Promise.all([
    localDb.orders.orderBy('createdAt').reverse().toArray(),
    localDb.payments.toArray(),
    localDb.refunds.toArray()
  ])
  return orders.map(order => ({ order, ...orderBalance(order, payments, refunds) }))
}

export async function listAuditLogs() {
  return localDb.auditLogs.orderBy('occurredAt').reverse().toArray()
}

export async function addOrderPayment(orderId, input) {
  return localDb.transaction('rw', localDb.orders, localDb.payments, localDb.refunds, localDb.auditLogs, localDb.outbox, async () => {
    const order = await localDb.orders.get(orderId)
    if (!order || order.status !== 'active') throw new Error('Only active orders can receive payments.')
    const [payments, refunds] = await Promise.all([
      localDb.payments.where('orderId').equals(orderId).toArray(),
      localDb.refunds.where('orderId').equals(orderId).toArray()
    ])
    const current = orderBalance(order, payments, refunds)
    const amount = validatePaymentAmount(input.amount, current.balance)
    const timestamp = now()
    const payment = {
      id: makeId(), orderId, amount,
      method: String(input.method || '').trim(),
      reference: String(input.reference || '').trim(),
      paidAt: input.paidAt || timestamp, isSample: false
    }
    if (!payment.method) throw new Error('Select a payment method.')
    await localDb.payments.add(payment)
    await localDb.outbox.add(outboxEvent('payment', payment.id, 'insert', payment))
    const audit = auditEvent('payment_received', 'sales_order', orderId, `${amount} via ${payment.method}`, false, input.actor)
    await localDb.auditLogs.add(audit)
    await localDb.outbox.add(outboxEvent('audit_log', audit.id, 'insert', audit))
    return payment
  })
}

export async function cancelOrder(orderId, reason = '', actor = null) {
  return localDb.transaction('rw', localDb.orders, localDb.products, localDb.stockMovements, localDb.auditLogs, localDb.outbox, async () => {
    const order = await localDb.orders.get(orderId)
    if (!order || order.status !== 'active') throw new Error('This order is no longer active.')
    if (order.productId) {
      const product = await localDb.products.get(order.productId)
      if (!product) throw new Error('The linked product is missing; cancellation was not applied.')
      const movement = movementEvent(product, 'sale_return', order.quantity, `Cancelled order ${orderId}`, orderId)
      await saveMovementAndQueue(product, movement)
    }
    order.status = 'cancelled'
    order.cancelledAt = now()
    order.cancellationReason = String(reason || '').trim()
    order.updatedAt = order.cancelledAt
    await localDb.orders.put(order)
    await localDb.outbox.add(outboxEvent('sales_order', order.id, 'upsert', order))
    const audit = auditEvent('order_cancelled', 'sales_order', order.id, order.cancellationReason || 'No reason provided', false, actor)
    await localDb.auditLogs.add(audit)
    await localDb.outbox.add(outboxEvent('audit_log', audit.id, 'insert', audit))
    return order
  })
}

export async function recordOrderRefund(orderId, input) {
  return localDb.transaction('rw', localDb.orders, localDb.payments, localDb.refunds, localDb.auditLogs, localDb.outbox, async () => {
    const order = await localDb.orders.get(orderId)
    if (!order || order.status !== 'cancelled') throw new Error('Refunds can only be recorded for cancelled orders.')
    const [payments, refunds] = await Promise.all([
      localDb.payments.where('orderId').equals(orderId).toArray(),
      localDb.refunds.where('orderId').equals(orderId).toArray()
    ])
    const current = orderBalance(order, payments, refunds)
    const amount = validatePaymentAmount(input.amount, roundMoney(current.paid - current.refunded))
    const refund = {
      id: makeId(), orderId, amount, method: String(input.method || '').trim(),
      reference: String(input.reference || '').trim(), reason: String(input.reason || '').trim(),
      refundedAt: now(), isSample: false
    }
    await localDb.refunds.add(refund)
    await localDb.outbox.add(outboxEvent('refund', refund.id, 'insert', refund))
    const audit = auditEvent('refund_recorded', 'sales_order', orderId, `${amount} refunded`, false, input.actor)
    await localDb.auditLogs.add(audit)
    await localDb.outbox.add(outboxEvent('audit_log', audit.id, 'insert', audit))
    return refund
  })
}

export async function getFinancialSummary(startDate, endDate) {
  const [orders, payments, refunds] = await Promise.all([
    localDb.orders.toArray(), localDb.payments.toArray(), localDb.refunds.toArray()
  ])
  const businessOrders = orders.filter(order => !order.isSample)
  const orderPeriodOrders = businessOrders.filter(order => order.orderDate >= startDate && order.orderDate <= endDate)
  const included = orderPeriodOrders.filter(order => order.status === 'active')
  const businessOrderIds = new Set(businessOrders.map(order => order.id))
  const orderIds = new Set(included.map(order => order.id))
  const paid = payments.filter(payment => businessOrderIds.has(payment.orderId) && !payment.isSample && localDateKeyFromTimestamp(payment.paidAt) >= startDate && localDateKeyFromTimestamp(payment.paidAt) <= endDate)
  const returned = refunds.filter(refund => businessOrderIds.has(refund.orderId) && !refund.isSample && localDateKeyFromTimestamp(refund.refundedAt) >= startDate && localDateKeyFromTimestamp(refund.refundedAt) <= endDate)
  const grossSales = included.reduce((sum, order) => sum + Number(order.total), 0)
  const cashCollected = paid.reduce((sum, payment) => sum + Number(payment.amount), 0) - returned.reduce((sum, refund) => sum + Number(refund.amount), 0)
  const activePayments = payments.filter(payment => orderIds.has(payment.orderId) && !payment.isSample)
  const activeRefunds = refunds.filter(refund => orderIds.has(refund.orderId) && !refund.isSample)
  const pending = included.reduce((sum, order) => sum + orderBalance(order, activePayments, activeRefunds).balance, 0)
  const cost = included.reduce((sum, order) => sum + Number(order.unitCost || 0) * Number(order.quantity || 1), 0)
  return { grossSales: roundMoney(grossSales), cashCollected: roundMoney(cashCollected), pending: roundMoney(pending), profit: roundMoney(grossSales - cost), orders: included.length }
}

export async function getInventorySummary() {
  const products = await localDb.products.toArray()
  return products.reduce((summary, product) => {
    summary.products += 1
    summary.units += product.quantity
    if (product.quantity <= 5) summary.lowStock += 1
    summary.costValue += product.quantity * product.cost
    return summary
  }, { products: 0, units: 0, lowStock: 0, costValue: 0 })
}

export async function getSyncSummary() {
  const pending = await localDb.outbox.where('status').anyOf('pending', 'failed', 'syncing').count()
  const failed = await localDb.outbox.where('status').equals('failed').count()
  const metadata = await localDb.metadata.get('sync')
  return { pending, failed, lastSyncedAt: metadata?.lastSyncedAt || null }
}

export async function getPendingOutboxEvents() {
  return localDb.outbox.where('status').anyOf('pending', 'failed', 'syncing').sortBy('sequence')
}

export async function updateOutboxEvent(id, changes) {
  const event = await localDb.outbox.where('id').equals(id).first()
  if (!event) return 0
  return localDb.outbox.update(event.sequence, changes)
}

export async function markSyncCompleted(at) {
  return localDb.metadata.put({ key: 'sync', lastSyncedAt: at })
}

export async function bindLocalWorkspaceToUser(user) {
  if (!user?.id) throw new Error('A valid signed-in account is required for this device.')
  const bound = await localDb.metadata.get('workspaceOwner')
  if (bound && bound.userId !== user.id) {
    throw new Error('This device’s local business data is linked to a different account. Use that account or a separate browser profile/device; local records were not exposed or synced.')
  }
  if (!bound) await localDb.metadata.put({ key: 'workspaceOwner', userId: user.id, email: user.email || '' })
  return true
}

export function unwrapLegacySnapshot(payload) {
  const snapshot = payload?.format === 'clothes-mania-legacy-backup' ? payload.snapshot : payload
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) {
    throw new Error('The selected file is not a valid Clothes Mania JSON backup.')
  }
  const legacyCollections = ['shirts', 'mines', 'liveSessions', 'dailyLedger', 'auditLogs', 'deletedRecords']
  if (!legacyCollections.some(collection => Array.isArray(snapshot[collection]))) {
    throw new Error('The backup does not contain recognized legacy records.')
  }
  return snapshot
}

export async function previewLegacyMigration(snapshotOverride) {
  const legacy = new Dexie('ClothesManiaDB')
  legacy.version(1).stores({ kv: '&key' })
  try {
    const snapshot = snapshotOverride === undefined ? await legacy.kv.get('db') : null
    let localStorageValue = null
    try {
      const stored = typeof localStorage === 'undefined' ? null : localStorage.getItem('clothesManiaDavaoDB_v4')
      if (stored) localStorageValue = JSON.parse(stored)
    } catch (error) {
      console.warn('Could not read legacy localStorage snapshot; using IndexedDB copy when available.', error)
    }
    const value = snapshotOverride === undefined ? localStorageValue || snapshot?.value || {} : unwrapLegacySnapshot(snapshotOverride)
    const mines = Array.isArray(value.mines) ? value.mines : []
    const products = Array.isArray(value.shirts) ? value.shirts : []
    return {
      products: products.length,
      orders: mines.length,
      sampleOrders: mines.filter(order => /^m\d+$/i.test(String(order.id || ''))).length,
      liveSessions: Array.isArray(value.liveSessions) ? value.liveSessions.length : 0,
      ledgerDays: Array.isArray(value.dailyLedger) ? value.dailyLedger.length : 0,
      auditRecords: Array.isArray(value.auditLogs) ? value.auditLogs.length : 0,
      deletedRecords: Array.isArray(value.deletedRecords) ? value.deletedRecords.length : 0,
      alreadyImported: Boolean(await localDb.metadata.get('legacyMigration')),
      snapshot: value
    }
  } finally {
    legacy.close()
  }
}

export async function importLegacySnapshot(snapshot) {
  const migrationId = 'legacy-snapshot-v1'
  const previous = await localDb.metadata.get('legacyMigration')
  if (previous) throw new Error('Legacy browser records were already imported on this device.')
  if (!snapshot || typeof snapshot !== 'object') throw new Error('The legacy browser data is not a valid snapshot.')

  const importedAt = now()
  const remoteId = makeId()
  const shirts = Array.isArray(snapshot.shirts) ? snapshot.shirts : []
  const legacyMines = Array.isArray(snapshot.mines) ? snapshot.mines : []
  const legacySessions = Array.isArray(snapshot.liveSessions) ? snapshot.liveSessions : []
  const migrationProducts = shirts.map(shirt => {
    const isSample = /^s\d+$/i.test(String(shirt.id || ''))
    const quantity = Number(shirt.qty ?? shirt.quantity ?? 0)
    if (!Number.isInteger(quantity) || quantity < 0) {
      throw new Error(`Legacy product ${shirt.name || shirt.id || '(unnamed)'} has invalid stock. Nothing was imported.`)
    }
    return {
      ...validateProduct({
        id: makeId(),
        name: shirt.name,
        sku: shirt.sku || shirt.id,
        category: shirt.category || '',
        size: shirt.size || '',
        color: shirt.color || '',
        cost: shirt.cost || 0,
        price: shirt.price || 0,
        quantity: 0,
        isSample
      }),
      legacyId: String(shirt.id || ''),
      openingQuantity: quantity,
      createdAt: importedAt,
      updatedAt: importedAt
    }
  })

  if (new Set(migrationProducts.map(product => product.sku.toLowerCase())).size !== migrationProducts.length) {
    throw new Error('The legacy product list has duplicate SKUs. Resolve those before importing so no product is overwritten.')
  }

  return localDb.transaction('rw', localDb.products, localDb.stockMovements, localDb.orders, localDb.payments, localDb.liveSessions, localDb.auditLogs, localDb.outbox, localDb.legacyRecords, localDb.metadata, async () => {
    if (await localDb.metadata.get('legacyMigration')) throw new Error('Legacy browser records were already imported on this device.')

    await localDb.legacyRecords.add({
      id: migrationId,
      entityType: 'legacy_snapshot',
      legacyId: 'ClothesManiaDB/db',
      importedAt,
      isSample: false,
      payload: snapshot
    })

    const productIdsByLegacyId = new Map()
    for (const product of migrationProducts) {
      const openingQuantity = product.openingQuantity
      delete product.openingQuantity
      await localDb.products.add(product)
      productIdsByLegacyId.set(product.legacyId, product.id)
      await localDb.outbox.add(outboxEvent('product', product.id, 'upsert', { ...product }))
      if (openingQuantity > 0) await addStockMovementInTransaction(product, openingQuantity, 'Imported opening stock')
    }

    const sessionIdsByLegacyId = new Map()
    for (const session of legacySessions) {
      const id = makeId()
      const stored = {
        id,
        legacyId: String(session.id || ''),
        name: String(session.name || 'Legacy live session'),
        seller: String(session.seller || session.host || ''),
        date: String(session.date || ''),
        startedAt: normalizedTimestamp(session.startedAt || session.createdAt),
        endedAt: normalizedTimestamp(session.endedAt),
        isSample: false
      }
      await localDb.liveSessions.add(stored)
      sessionIdsByLegacyId.set(stored.legacyId, stored.id)
      await localDb.outbox.add(outboxEvent('live_session', stored.id, 'upsert', stored))
    }

    let importedPayments = 0
    for (const mine of legacyMines) {
      const id = makeId()
      const legacyId = String(mine.id || '')
      const isSample = isLegacySampleRecord(mine)
      const quantity = Number(mine.quantity ?? mine.qty ?? 1)
      if (!Number.isInteger(quantity) || quantity < 1) {
        throw new Error(`Legacy order ${legacyId || '(unnamed)'} has invalid quantity. Nothing was imported.`)
      }
      const total = roundMoney(mine.total ?? (Number(mine.price || 0) * quantity))
      const unitPrice = roundMoney(mine.price ?? (total / quantity))
      if (total < 0 || unitPrice < 0) throw new Error(`Legacy order ${legacyId || '(unnamed)'} has a negative amount. Nothing was imported.`)
      const productLegacyId = String(mine.shirtId || mine.productId || '')
      const order = {
        id,
        legacyId,
        buyer: String(mine.name || mine.buyer || 'Unknown buyer'),
        item: String(mine.item || mine.productName || 'Legacy item'),
        productId: productIdsByLegacyId.get(productLegacyId) || null,
        sku: String(mine.sku || ''),
        quantity,
        unitPrice,
        unitCost: Number(mine.unitCost || 0),
        total,
        orderDate: normalizedDate(mine.date, importedAt.slice(0, 10)),
        orderTime: String(mine.time || ''),
        sessionId: sessionIdsByLegacyId.get(String(mine.sessionId || '')) || null,
        legacySessionId: String(mine.sessionId || ''),
        sessionName: String(mine.sessionName || ''),
        seller: String(mine.seller || mine.host || ''),
        status: String(mine.status || '').toUpperCase() === 'CANCELLED' ? 'cancelled' : 'active',
        isSample,
        createdAt: importedAt,
        updatedAt: importedAt
      }
      await localDb.orders.add(order)
      await localDb.outbox.add(outboxEvent('sales_order', id, 'upsert', order))
      const paidAmount = String(mine.status || '').toUpperCase() === 'PAID'
        ? total
        : Math.min(total, Math.max(0, roundMoney(mine.dp || 0)))
      if (paidAmount > 0) {
        const estimatedPaymentDate = new Date(`${order.orderDate}T00:00:00`)
        const payment = {
          id: makeId(), orderId: id, amount: paidAmount,
          method: String(mine.mop || mine.paymentMethod || 'Legacy'),
          reference: String(mine.ref || mine.reference || mine.referenceNo || ''),
          paidAt: normalizedTimestamp(estimatedPaymentDate, importedAt),
          isSample, legacyPaymentDateEstimated: true
        }
        await localDb.payments.add(payment)
        await localDb.outbox.add(outboxEvent('payment', payment.id, 'insert', payment))
        importedPayments += 1
      }
      const audit = auditEvent('legacy_order_imported', 'sales_order', id, `Imported legacy order ${legacyId || id}`, isSample)
      await localDb.auditLogs.add(audit)
      await localDb.outbox.add(outboxEvent('audit_log', audit.id, 'insert', audit))
    }

    const sourceAudits = Array.isArray(snapshot.auditLogs) ? snapshot.auditLogs : []
    for (const sourceAudit of sourceAudits) {
      const audit = {
        id: makeId(), legacyId: String(sourceAudit.id || ''), action: String(sourceAudit.action || 'legacy_action'),
        entityType: String(sourceAudit.entityType || sourceAudit.entity || 'legacy'),
        entityId: String(sourceAudit.entityId || ''), summary: String(sourceAudit.summary || sourceAudit.details || ''),
        occurredAt: normalizedTimestamp(sourceAudit.createdAt || sourceAudit.at || sourceAudit.timestamp, importedAt),
        actorId: null, actorEmail: String(sourceAudit.email || sourceAudit.actor || 'Legacy operator'), isSample: false
      }
      await localDb.auditLogs.add(audit)
      await localDb.outbox.add(outboxEvent('audit_log', audit.id, 'insert', audit))
    }

    await localDb.outbox.add(outboxEvent('legacy_snapshot', remoteId, 'import', {
      snapshot,
      source: 'legacy-browser-database',
      seededOrderCount: legacyMines.filter(isLegacySampleRecord).length
    }))
    await localDb.metadata.put({ key: 'legacyMigration', importedAt, remoteId, recordCount: Object.values(snapshot).reduce((count, value) => count + (Array.isArray(value) ? value.length : 0), 0) })
    return { products: migrationProducts.length, orders: legacyMines.length, payments: importedPayments, liveSessions: legacySessions.length, remoteId }
  })
}
