(function (root, createCrypto) {
    const api = createCrypto();
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.ClothesManiaWorkspaceCrypto = api;
})(globalThis, function () {
    const VERSION = 1;
    const DEVICE_VERSION = 2;
    const SERVER_VERSION = 2;
    const ITERATIONS = 600000;
    const MINIMUM_PASSPHRASE_LENGTH = 14;
    const ADDITIONAL_DATA = new TextEncoder().encode('clothes-mania-pos-workspace-v1');

    function bytesToBase64(bytes) {
        let binary = '';
        for (let offset = 0; offset < bytes.length; offset += 0x8000) {
            binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
        }
        return btoa(binary);
    }

    function base64ToBytes(value) {
        const binary = atob(value);
        return Uint8Array.from(binary, character => character.charCodeAt(0));
    }

    async function deriveKey(passphrase, salt, iterations) {
        const material = await crypto.subtle.importKey(
            'raw',
            new TextEncoder().encode(passphrase),
            'PBKDF2',
            false,
            ['deriveKey']
        );
        return crypto.subtle.deriveKey(
            { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
            material,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt', 'decrypt']
        );
    }

    function isEncryptedSnapshot(value) {
        return Boolean(value && typeof value === 'object' && value.encrypted === true && value.version === VERSION);
    }

    async function createProfile(passphrase) {
        if (typeof passphrase !== 'string' || passphrase.length < MINIMUM_PASSPHRASE_LENGTH) {
            throw new Error(`Use a passphrase with at least ${MINIMUM_PASSPHRASE_LENGTH} characters.`);
        }
        const salt = crypto.getRandomValues(new Uint8Array(16));
        return {
            key: await deriveKey(passphrase, salt, ITERATIONS),
            iterations: ITERATIONS,
            salt: bytesToBase64(salt)
        };
    }

    async function profileForSnapshot(passphrase, envelope) {
        if (!isEncryptedSnapshot(envelope) || envelope.algorithm !== 'AES-GCM' || envelope.kdf !== 'PBKDF2-SHA-256') {
            throw new Error('This encrypted workspace format is not supported.');
        }
        if (!Number.isInteger(envelope.iterations) || envelope.iterations < ITERATIONS || envelope.iterations > 1000000) {
            throw new Error('The encrypted workspace has invalid key-derivation settings.');
        }
        const salt = base64ToBytes(envelope.salt);
        if (salt.length !== 16) throw new Error('The encrypted workspace has an invalid salt.');
        return {
            key: await deriveKey(passphrase, salt, envelope.iterations),
            iterations: envelope.iterations,
            salt: envelope.salt
        };
    }

    async function encryptSnapshot(snapshot, profile) {
        if (!profile?.key || !profile?.salt || !Number.isInteger(profile.iterations)) {
            throw new Error('Unlock the workspace before saving encrypted data.');
        }
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const plaintext = new TextEncoder().encode(JSON.stringify(snapshot));
        const ciphertext = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv, additionalData: ADDITIONAL_DATA, tagLength: 128 },
            profile.key,
            plaintext
        );
        return {
            encrypted: true,
            version: VERSION,
            algorithm: 'AES-GCM',
            kdf: 'PBKDF2-SHA-256',
            iterations: profile.iterations,
            salt: profile.salt,
            iv: bytesToBase64(iv),
            ciphertext: bytesToBase64(new Uint8Array(ciphertext))
        };
    }

    async function unlockSnapshot(envelope, passphrase) {
        const profile = await profileForSnapshot(passphrase, envelope);
        const iv = base64ToBytes(envelope.iv);
        if (iv.length !== 12) throw new Error('The encrypted workspace has an invalid initialization vector.');
        try {
            const plaintext = await crypto.subtle.decrypt(
                { name: 'AES-GCM', iv, additionalData: ADDITIONAL_DATA, tagLength: 128 },
                profile.key,
                base64ToBytes(envelope.ciphertext)
            );
            return { profile, snapshot: JSON.parse(new TextDecoder().decode(plaintext)) };
        } catch {
            throw new Error('The passphrase is incorrect or the encrypted workspace data is damaged.');
        }
    }

    async function createDeviceKey() {
        return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    }

    async function encryptSnapshotWithDeviceKey(snapshot, key) {
        if (!key || key.type !== 'secret' || key.extractable) throw new Error('A protected device key is required.');
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const plaintext = new TextEncoder().encode(JSON.stringify(snapshot));
        const ciphertext = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv, additionalData: ADDITIONAL_DATA, tagLength: 128 },
            key,
            plaintext
        );
        return {
            format: 'clothes-mania-device-encrypted',
            encrypted: true,
            version: DEVICE_VERSION,
            algorithm: 'AES-GCM-256',
            iv: bytesToBase64(iv),
            ciphertext: bytesToBase64(new Uint8Array(ciphertext))
        };
    }

    function isDeviceEncryptedSnapshot(value) {
        return Boolean(value && typeof value === 'object' && value.format === 'clothes-mania-device-encrypted' && value.encrypted === true && value.version === DEVICE_VERSION);
    }

    function isServerEncryptedSnapshot(value) {
        return Boolean(value && typeof value === 'object' && value.format === 'clothes-mania-server-encrypted' && value.encrypted === true && value.version === SERVER_VERSION);
    }

    async function unlockDeviceSnapshot(envelope, key) {
        if (!isDeviceEncryptedSnapshot(envelope) || !key || key.type !== 'secret' || key.extractable) {
            throw new Error('The protected device workspace cannot be opened with this key.');
        }
        const iv = base64ToBytes(envelope.iv);
        if (iv.length !== 12) throw new Error('The protected device workspace has an invalid initialization vector.');
        try {
            const plaintext = await crypto.subtle.decrypt(
                { name: 'AES-GCM', iv, additionalData: ADDITIONAL_DATA, tagLength: 128 },
                key,
                base64ToBytes(envelope.ciphertext)
            );
            return JSON.parse(new TextDecoder().decode(plaintext));
        } catch {
            throw new Error('The protected device workspace is damaged or its local key is missing.');
        }
    }

    return {
        createProfile,
        createDeviceKey,
        encryptSnapshot,
        encryptSnapshotWithDeviceKey,
        isEncryptedSnapshot,
        isDeviceEncryptedSnapshot,
        isServerEncryptedSnapshot,
        minimumPassphraseLength: MINIMUM_PASSPHRASE_LENGTH,
        unlockDeviceSnapshot,
        unlockSnapshot
    };
});
