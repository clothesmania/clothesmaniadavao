const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const runtime = fs.readFileSync(path.join(__dirname, '../public/pos-runtime.js'), 'utf8');
const names = ['inferProductCategory', 'cleanProductOption', 'ensureProductOptions', 'productOptionUsage', 'changeProductOption'];
const sources = names.map(name => {
    const start = runtime.indexOf(`function ${name}(`);
    const end = runtime.indexOf('\n        function ', start + 1);
    assert.ok(start >= 0, `${name} exists`);
    return runtime.slice(start, end);
});
const { ensureProductOptions, changeProductOption } = new Function(`${sources.join('\n')}; return { ensureProductOptions, changeProductOption };`)();

test('legacy choices retain custom assignments, deduplicate labels, and exclude the no-size marker', () => {
    const snapshot = { shirts: [
        { id: '1', name: 'Sneakers', size: '  One   Size ', qty: 8 },
        { id: '2', name: 'Dress', category: 'Custom collection', size: 'one size', qty: 3 },
        { id: '3', name: 'Tee', size: 'N/A', qty: 1 }
    ] };
    const options = ensureProductOptions(snapshot);
    assert.ok(options.categories.includes('Shoes'));
    assert.ok(options.categories.includes('Custom collection'));
    assert.deepEqual(options.sizes, ['One Size']);
    assert.equal(snapshot.shirts[0].category, 'Shoes');
    assert.equal(snapshot.shirts[1].size, 'One Size');
    assert.deepEqual(snapshot.shirts.map(product => product.qty), [8, 3, 1]);
});

test('unused choices survive a snapshot round trip and deleted defaults do not return', () => {
    const snapshot = { shirts: [] };
    changeProductOption(snapshot, 'categories', null, 'Dresses');
    changeProductOption(snapshot, 'sizes', null, 'XXL');
    changeProductOption(snapshot, 'categories', 'Other', null);
    const restored = JSON.parse(JSON.stringify(snapshot));
    const options = ensureProductOptions(restored);
    assert.ok(options.categories.includes('Dresses'));
    assert.ok(!options.categories.includes('Other'));
    assert.deepEqual(options.sizes, ['XXL']);
    changeProductOption(restored, 'sizes', 'XXL', null);
    assert.deepEqual(ensureProductOptions(JSON.parse(JSON.stringify(restored))).sizes, []);
});

test('rename updates inferred and explicit inventory assignments and the older mirror, preserving sales', () => {
    const snapshot = {
        shirts: [{ id: '1', name: 'Sneakers', size: 'M', qty: 7, price: 500, cost: 200, soldCount: 4 }],
        products: [{ id: 'p1', name: 'Sneakers', category: 'Shoes', size: 'M', stock: 7 }],
        mines: [{ id: 'sale1', item: 'Sneakers M', total: 500, status: 'PAID' }],
        deletedRecords: [{ snapshot: { name: 'Old shoes', category: 'Shoes', size: 'M' } }]
    };
    const history = JSON.stringify([snapshot.mines, snapshot.deletedRecords]);
    changeProductOption(snapshot, 'categories', 'Shoes', 'Footwear');
    changeProductOption(snapshot, 'sizes', 'M', 'Medium');
    assert.equal(snapshot.shirts[0].category, 'Footwear');
    assert.equal(snapshot.products[0].category, 'Footwear');
    assert.equal(snapshot.shirts[0].size, 'Medium');
    assert.equal(snapshot.products[0].size, 'Medium');
    assert.deepEqual([snapshot.shirts[0].qty, snapshot.shirts[0].price, snapshot.shirts[0].cost, snapshot.shirts[0].soldCount], [7, 500, 200, 4]);
    assert.equal(JSON.stringify([snapshot.mines, snapshot.deletedRecords]), history);
    assert.ok(!ensureProductOptions(snapshot).categories.includes('Shoes'));
});

test('deletion refuses choices still assigned to products including zero-stock inventory', () => {
    const snapshot = { shirts: [{ name: 'Tee', category: 'Clothing & Apparel', size: 'M', qty: 0 }] };
    ensureProductOptions(snapshot);
    const before = JSON.stringify(snapshot);
    assert.throws(() => changeProductOption(snapshot, 'categories', 'Clothing & Apparel', null), /used by products/);
    assert.throws(() => changeProductOption(snapshot, 'sizes', 'M', null), /used by products/);
    assert.equal(JSON.stringify(snapshot), before);
    snapshot.shirts[0].size = 'L';
    changeProductOption(snapshot, 'sizes', 'M', null);
    assert.deepEqual(ensureProductOptions(snapshot).sizes, ['L']);
});

test('choice names validate whitespace, duplicate casing, reserved values and stale edits', () => {
    const snapshot = { shirts: [] };
    changeProductOption(snapshot, 'categories', null, '  New   Arrivals ');
    assert.ok(snapshot.productOptions.categories.includes('New Arrivals'));
    assert.throws(() => changeProductOption(snapshot, 'categories', null, 'new arrivals'), /already exists/);
    assert.throws(() => changeProductOption(snapshot, 'categories', 'Other', 'New Arrivals'), /already exists/);
    assert.throws(() => changeProductOption(snapshot, 'sizes', null, '  '), /Enter a name/);
    assert.throws(() => changeProductOption(snapshot, 'sizes', null, 'n/a'), /reserved/);
    assert.throws(() => changeProductOption(snapshot, 'sizes', null, 'x'.repeat(81)), /80 characters/);
    assert.throws(() => changeProductOption(snapshot, 'sizes', 'Gone', 'New'), /has changed/);
    assert.throws(() => changeProductOption(snapshot, '__proto__', null, 'New'), /Choose categories/);
    changeProductOption(snapshot, 'categories', 'New Arrivals', 'NEW ARRIVALS');
    assert.equal(snapshot.productOptions.categories.filter(value => value.toLowerCase() === 'new arrivals').length, 1);
});

test('restored inventory reintroduces any choice needed to keep its assignment usable', () => {
    const snapshot = { shirts: [], productOptions: { categories: [], sizes: [] } };
    snapshot.shirts.push({ name: 'Restored dress', category: 'Vintage', size: 'XS' });
    assert.deepEqual(ensureProductOptions(snapshot), { categories: ['Vintage'], sizes: ['XS'] });
});
