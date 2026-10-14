import test from 'node:test'
import assert from 'node:assert/strict'
import { isLegacySampleRecord, normalizeSku, validateProduct } from './validation.js'

test('normalizes SKUs and validates unique product data', () => {
  assert.equal(normalizeSku(' cm-001 '), 'CM-001')
  assert.equal(validateProduct({ name: ' Tee ', sku: 'cm-001', cost: '1.25', price: '2', quantity: '4' }).quantity, 4)
  assert.throws(() => validateProduct({ name: 'Tee', sku: 'cm-001', cost: 1, price: 2 }, [{ id: 'a', sku: 'CM-001' }]), /already used/)
  assert.throws(() => validateProduct({ name: 'Tee', sku: 'cm-002', cost: 1, price: 2, quantity: 1.5 }), /whole number/)
})

test('detects seeded legacy sample orders by the existing seed ID convention', () => {
  assert.equal(isLegacySampleRecord({ id: 'm28' }), true)
  assert.equal(isLegacySampleRecord({ id: 'm_1729000' }), false)
  assert.equal(isLegacySampleRecord({ id: 'real-order', isSample: true }), true)
})
