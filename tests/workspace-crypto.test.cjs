const assert = require('node:assert/strict');
const { webcrypto } = require('node:crypto');
const test = require('node:test');

globalThis.crypto ||= webcrypto;

const workspaceCrypto = require('../workspace-crypto.js');

test('encrypted workspace snapshots round-trip with the configured KDF', async () => {
    const profile = await workspaceCrypto.createProfile('correct horse battery staple 42');
    const snapshot = { mines: [{ name: 'Private buyer', ref: 'PAYMENT-123' }], shirts: [] };
    const encrypted = await workspaceCrypto.encryptSnapshot(snapshot, profile);
    const opened = await workspaceCrypto.unlockSnapshot(encrypted, 'correct horse battery staple 42');

    assert.equal(encrypted.encrypted, true);
    assert.equal(encrypted.algorithm, 'AES-GCM');
    assert.equal(encrypted.kdf, 'PBKDF2-SHA-256');
    assert.equal(encrypted.iterations, 600000);
    assert.deepEqual(opened.snapshot, snapshot);
});

test('encrypted snapshots reject incorrect passphrases and tampering', async () => {
    const profile = await workspaceCrypto.createProfile('correct horse battery staple 42');
    const encrypted = await workspaceCrypto.encryptSnapshot({ value: 'private' }, profile);

    await assert.rejects(
        workspaceCrypto.unlockSnapshot(encrypted, 'incorrect horse battery staple 99'),
        /passphrase is incorrect or.*damaged/i
    );
    const tampered = { ...encrypted, ciphertext: `${encrypted.ciphertext.slice(0, -4)}AAAA` };
    await assert.rejects(
        workspaceCrypto.unlockSnapshot(tampered, 'correct horse battery staple 42'),
        /passphrase is incorrect or.*damaged/i
    );
});

test('encrypted snapshots reject short passphrases and use fresh IVs', async () => {
    await assert.rejects(workspaceCrypto.createProfile('too short'), /at least 14 characters/);
    const profile = await workspaceCrypto.createProfile('correct horse battery staple 42');
    const first = await workspaceCrypto.encryptSnapshot({ value: 'same' }, profile);
    const second = await workspaceCrypto.encryptSnapshot({ value: 'same' }, profile);

    assert.notEqual(first.iv, second.iv);
    assert.notEqual(first.ciphertext, second.ciphertext);
});

test('device keys encrypt local snapshots without exposing an extractable key', async () => {
    const key = await workspaceCrypto.createDeviceKey();
    const snapshot = { mines: [{ buyer: 'Private buyer' }] };
    const envelope = await workspaceCrypto.encryptSnapshotWithDeviceKey(snapshot, key);

    assert.equal(key.extractable, false);
    assert.equal(workspaceCrypto.isDeviceEncryptedSnapshot(envelope), true);
    assert.deepEqual(await workspaceCrypto.unlockDeviceSnapshot(envelope, key), snapshot);
});
