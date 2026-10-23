const assert = require('node:assert/strict');
const { webcrypto } = require('node:crypto');
const test = require('node:test');

globalThis.crypto ||= webcrypto;

const { decryptWorkspaceSnapshot, encryptWorkspaceSnapshot } = require('../supabase/functions/workspace-sync/workspace-crypto.mjs');

test('server-managed workspace encryption round-trips using a 32-byte key', async () => {
    const key = Buffer.alloc(32, 7).toString('base64');
    const snapshot = { mines: [{ buyer: 'Private buyer', ref: 'PAY-12' }], productOptions: { categories: ['Dresses'], sizes: ['XXL'] } };
    const envelope = await encryptWorkspaceSnapshot(snapshot, key);

    assert.equal(envelope.format, 'clothes-mania-server-encrypted');
    assert.deepEqual(await decryptWorkspaceSnapshot(envelope, key), snapshot);
    await assert.rejects(decryptWorkspaceSnapshot(envelope, Buffer.alloc(32, 9).toString('base64')));
});
