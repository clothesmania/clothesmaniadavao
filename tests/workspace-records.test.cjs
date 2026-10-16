const assert = require('node:assert/strict');
const { webcrypto } = require('node:crypto');
const test = require('node:test');

globalThis.crypto ||= webcrypto;

const { decryptWorkspaceSnapshot } = require('../supabase/functions/workspace-sync/workspace-crypto.mjs');
const { collectWorkspaceRecords, encryptWorkspaceRecords } = require('../supabase/functions/workspace-sync/workspace-records.mjs');

test('workspace projection keeps each collection entry separately encrypted', async () => {
    const key = Buffer.alloc(32, 11).toString('base64');
    const snapshot = {
        mines: [{ id: 'mine-1', buyer: 'Private buyer', paymentRef: 'PAY-12' }],
        shirts: [{ id: 'shirt-1', name: 'Blue shirt' }],
        liveSessions: [{ id: 'session-1', name: 'Evening live' }],
        dailyLedger: [{ date: '2026-10-16', sales: 1200 }]
    };

    const projected = await encryptWorkspaceRecords(snapshot, key);

    assert.deepEqual(projected.map(({ recordType, recordId }) => [recordType, recordId]), [
        ['mine_order', 'mine-1'],
        ['product', 'shirt-1'],
        ['live_session', 'session-1'],
        ['daily_ledger', '2026-10-16']
    ]);
    assert.equal(JSON.stringify(projected).includes('Private buyer'), false);
    assert.equal(JSON.stringify(projected).includes('PAY-12'), false);
    assert.deepEqual(await decryptWorkspaceSnapshot(projected[0].payload, key), {
        recordType: 'mine_order',
        recordId: 'mine-1',
        record: snapshot.mines[0]
    });
});

test('workspace projection rejects malformed entries and duplicate IDs', () => {
    assert.throws(() => collectWorkspaceRecords({ mines: ['invalid'] }), /invalid record/i);
    assert.throws(() => collectWorkspaceRecords({ mines: [{ id: 'same' }, { id: 'same' }] }), /duplicate record IDs/i);
});
