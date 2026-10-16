const encoder = new TextEncoder();
const decoder = new TextDecoder();
const additionalData = encoder.encode('clothes-mania-pos-workspace-server-v2');

function toBase64(bytes) {
    let binary = '';
    for (let offset = 0; offset < bytes.length; offset += 0x8000) {
        binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
    }
    return btoa(binary);
}

function fromBase64(value) {
    const binary = atob(value);
    return Uint8Array.from(binary, character => character.charCodeAt(0));
}

export async function encryptWorkspaceSnapshot(snapshot, encodedKey) {
    const keyBytes = fromBase64(encodedKey);
    if (keyBytes.length !== 32) throw new Error('WORKSPACE_ENCRYPTION_KEY must decode to exactly 32 bytes.');
    const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'AES-GCM' }, false, ['encrypt']);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv, additionalData, tagLength: 128 },
        key,
        encoder.encode(JSON.stringify(snapshot))
    );
    return {
        format: 'clothes-mania-server-encrypted',
        encrypted: true,
        version: 2,
        algorithm: 'AES-GCM-256',
        iv: toBase64(iv),
        ciphertext: toBase64(new Uint8Array(ciphertext))
    };
}

export async function decryptWorkspaceSnapshot(envelope, encodedKey) {
    if (!envelope || envelope.format !== 'clothes-mania-server-encrypted' || envelope.version !== 2 || envelope.algorithm !== 'AES-GCM-256') {
        throw new Error('Unsupported server-encrypted workspace format.');
    }
    const keyBytes = fromBase64(encodedKey);
    if (keyBytes.length !== 32) throw new Error('WORKSPACE_ENCRYPTION_KEY must decode to exactly 32 bytes.');
    const iv = fromBase64(envelope.iv);
    if (iv.length !== 12) throw new Error('Invalid workspace initialization vector.');
    const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'AES-GCM' }, false, ['decrypt']);
    const plaintext = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv, additionalData, tagLength: 128 },
        key,
        fromBase64(envelope.ciphertext)
    );
    const snapshot = JSON.parse(decoder.decode(plaintext));
    if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) throw new Error('Invalid workspace snapshot.');
    return snapshot;
}
