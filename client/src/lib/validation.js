export function normalizeSku(value) {
  return String(value || '').trim().toUpperCase()
}

export function validateProduct(input, products = []) {
  const name = String(input.name || '').trim()
  const sku = normalizeSku(input.sku)
  const cost = Number(input.cost)
  const price = Number(input.price)
  const quantity = Number(input.quantity ?? 0)

  if (!name) throw new Error('Enter a product name.')
  if (!sku) throw new Error('Enter a SKU.')
  if (!Number.isFinite(cost) || cost < 0) throw new Error('Cost must be zero or more.')
  if (!Number.isFinite(price) || price < 0) throw new Error('Price must be zero or more.')
  if (!Number.isInteger(quantity) || quantity < 0) throw new Error('Stock must be a whole number of zero or more.')
  if (products.some(product => normalizeSku(product.sku) === sku && product.id !== input.id)) {
    throw new Error('That SKU is already used by another product.')
  }

  return {
    id: input.id,
    name,
    sku,
    category: String(input.category || '').trim(),
    size: String(input.size || '').trim(),
    color: String(input.color || '').trim(),
    cost: Math.round(cost * 100) / 100,
    price: Math.round(price * 100) / 100,
    quantity,
    isSample: Boolean(input.isSample),
    createdAt: input.createdAt,
    updatedAt: input.updatedAt
  }
}

export function isLegacySampleRecord(record) {
  return /^m\d+$/i.test(String(record?.id || '')) || record?.isSample === true || record?.source === 'prototype-seed'
}

export function roundMoney(value) {
  const amount = Number(value)
  if (!Number.isFinite(amount)) throw new Error('Enter a valid amount.')
  return Math.round((amount + Number.EPSILON) * 100) / 100
}

export function validateOrder(input, product = null) {
  const buyer = String(input.buyer || '').trim()
  const item = String(input.item || product?.name || '').trim()
  const quantity = Number(input.quantity ?? 1)
  const unitPrice = roundMoney(input.unitPrice ?? product?.price)

  if (!buyer) throw new Error('Enter a buyer name.')
  if (!item) throw new Error('Choose a product or enter an item name.')
  if (!Number.isInteger(quantity) || quantity < 1) throw new Error('Quantity must be a whole number greater than zero.')
  if (unitPrice < 0) throw new Error('Price cannot be negative.')

  return { buyer, item, quantity, unitPrice, total: roundMoney(quantity * unitPrice) }
}

export function validatePaymentAmount(value, balance) {
  const amount = roundMoney(value)
  if (amount <= 0) throw new Error('Payment must be greater than zero.')
  if (amount > roundMoney(balance)) throw new Error('Payment cannot be greater than the remaining balance.')
  return amount
}
