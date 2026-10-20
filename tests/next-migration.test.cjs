const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const { createOfflineWorker } = require('../scripts/offline-worker.cjs');

function storageWithSession(session) {
    const entries = new Map([['cm-pos-supabase-auth-v1', JSON.stringify(session)], ['business-records', 'preserved']]);
    return { getItem: key => entries.get(key) || null, removeItem: key => entries.delete(key) };
}
const previousSession = { access_token: 'old-access', refresh_token: 'old-refresh', user: { id: 'admin-1' } };

test('Next.js starts the full POS once and loads its dependencies in order', async () => {
    const { bootPos } = await import('../lib/boot-pos.mjs');
    const loaded = [];
    let initialized = 0;
    const target = { startClothesManiaPos: async () => { initialized++; } };
    const doc = {
        createElement: () => ({}),
        body: { appendChild: script => { loaded.push(script.src); queueMicrotask(() => script.onload()); } }
    };
    const first = bootPos(target, doc);
    assert.equal(first, bootPos(target, doc));
    await first;
    assert.deepEqual(loaded, ['/vendor.js', '/workspace-crypto.js', '/pos-runtime.js', '/report-io.js']);
    assert.equal(initialized, 1);
});

test('failed script downloads do not initialize an incomplete POS', async () => {
    const { bootPos } = await import('../lib/boot-pos.mjs');
    let initialized = false;
    const target = { startClothesManiaPos: () => { initialized = true; } };
    const doc = { createElement: () => ({}), body: { appendChild: script => queueMicrotask(() => script.onerror()) } };
    await assert.rejects(bootPos(target, doc), /Could not load/);
    assert.equal(initialized, false);
});

test('legacy Supabase sessions move to cookies only after successful restoration', async () => {
    const { migrateLegacySession, legacySessionKey } = await import('../lib/supabase/migrate-session.mjs');
    const storage = storageWithSession(previousSession);
    let received;
    const client = { auth: {
        getSession: async () => ({ data: { session: null } }),
        setSession: async tokens => { received = tokens; return { data: { session: previousSession } }; }
    } };
    await migrateLegacySession(client, storage);
    assert.deepEqual(received, { access_token: 'old-access', refresh_token: 'old-refresh' });
    assert.equal(storage.getItem(legacySessionKey), null);
    assert.equal(storage.getItem('business-records'), 'preserved');
});

test('failed session restoration preserves the previous session and records', async () => {
    const { migrateLegacySession, legacySessionKey } = await import('../lib/supabase/migrate-session.mjs');
    const storage = storageWithSession(previousSession);
    const client = { auth: {
        getSession: async () => ({ data: { session: null } }),
        setSession: async () => ({ error: new Error('Network unavailable') })
    } };
    await assert.rejects(migrateLegacySession(client, storage), /Network unavailable/);
    assert.equal(JSON.parse(storage.getItem(legacySessionKey)).user.id, 'admin-1');
    assert.equal(storage.getItem('business-records'), 'preserved');
});

test('session migration refuses to mix two signed-in admin identities', async () => {
    const { migrateLegacySession, legacySessionKey } = await import('../lib/supabase/migrate-session.mjs');
    const storage = storageWithSession(previousSession);
    const client = { auth: { getSession: async () => ({ data: { session: { user: { id: 'admin-2' } } } }) } };
    await assert.rejects(migrateLegacySession(client, storage), /Two different admin sessions/);
    assert.ok(storage.getItem(legacySessionKey));
});

test('expired legacy tokens do not prevent a subsequent explicit sign-in', async () => {
    const runtime = fs.readFileSync(path.join(__dirname, '../public/pos-runtime.js'), 'utf8');
    const start = runtime.indexOf('async function getSupabaseClient(');
    const end = runtime.indexOf('// System Application State', start);
    const client = { auth: { onAuthStateChange: () => {} } };
    const getClient = new Function('window', `
        const SUPABASE_URL = 'https://example.supabase.co';
        const SUPABASE_PUBLISHABLE_KEY = 'public-key';
        let supabaseClient = null;
        let supabaseClientPromise = null;
        ${runtime.slice(start, end)}
        return getSupabaseClient;
    `)({ ClothesManiaDependencies: {
        createClient: () => client,
        migrateLegacySession: async () => { throw new Error('Refresh token expired'); }
    } });
    await assert.rejects(getClient(), /Refresh token expired/);
    assert.equal(await getClient(), client);
});

test('the installed Supabase SSR SDK writes and restores the POS cookie session', async () => {
    const { createBrowserClient } = require('@supabase/ssr');
    const jar = new Map();
    const expiresAt = Math.floor(Date.now() / 1000) + 3600;
    const token = [
        Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url'),
        Buffer.from(JSON.stringify({ sub: 'admin-1', exp: expiresAt })).toString('base64url'),
        'test-signature'
    ].join('.');
    const options = {
        isSingleton: false,
        cookieOptions: { name: 'cm-pos-supabase-auth-v1' },
        auth: { storageKey: 'cm-pos-supabase-auth-v1', autoRefreshToken: false, detectSessionInUrl: false },
        cookies: {
            getAll: () => [...jar].map(([name, value]) => ({ name, value })),
            setAll: values => values.forEach(({ name, value }) => value ? jar.set(name, value) : jar.delete(name))
        },
        global: { fetch: async () => new Response(JSON.stringify({
            access_token: token, refresh_token: 'test-refresh', expires_in: 3600, expires_at: expiresAt,
            token_type: 'bearer', user: { id: 'admin-1', email: 'admin@example.test' }
        }), { status: 200, headers: { 'Content-Type': 'application/json' } }) }
    };
    const first = createBrowserClient('https://example.supabase.co', 'public-test-key', options);
    const signedIn = await first.auth.signInWithPassword({ email: 'admin@example.test', password: 'test-only' });
    assert.equal(signedIn.error, null);
    assert.ok([...jar.keys()].some(name => name.startsWith('cm-pos-supabase-auth-v1')));
    const reopened = createBrowserClient('https://example.supabase.co', 'public-test-key', options);
    const { data, error } = await reopened.auth.getSession();
    assert.equal(error, null);
    assert.equal(data.session.user.id, 'admin-1');
});

function workerHarness({ fetch, cached }) {
    const listeners = {};
    const writes = [];
    const cache = { match: async () => cached, put: async (...args) => writes.push(args) };
    vm.runInNewContext(createOfflineWorker('test', ['/', '/index.html', '/pos-runtime.js']), {
        self: { location: { origin: 'https://pos.example' }, addEventListener: (name, fn) => { listeners[name] = fn; } },
        caches: { open: async () => cache }, URL, Set, Response, fetch
    });
    return { listeners, writes };
}

test('offline navigation restores the public Next.js shell', async () => {
    const cached = new Response('offline app');
    const { listeners } = workerHarness({ cached, fetch: async () => { throw new Error('Offline'); } });
    let result;
    listeners.fetch({ request: { method: 'GET', mode: 'navigate', url: 'https://pos.example/index.html' }, respondWith: value => { result = value; } });
    assert.equal(await (await result).text(), 'offline app');
});

test('offline worker leaves Supabase, API requests, and non-GET requests uncached', () => {
    const { listeners } = workerHarness({});
    for (const request of [
        { method: 'GET', url: 'https://project.supabase.co/rest/v1/pos_workspaces' },
        { method: 'GET', url: 'https://pos.example/api/private' },
        { method: 'POST', url: 'https://pos.example/pos-runtime.js' },
        { method: 'GET', url: 'https://pos.example/?_rsc=private', mode: 'cors' }
    ]) {
        listeners.fetch({ request, respondWith: () => assert.fail('Private traffic must not be intercepted') });
    }
});

test('Next.js preserves storage identifiers and receipt printing through its wrapper', () => {
    const runtime = fs.readFileSync(path.join(__dirname, '../public/pos-runtime.js'), 'utf8');
    assert.match(runtime, /new Dexie\('ClothesManiaDB'\)/);
    assert.match(runtime, /clothesManiaDavaoDB_v4/);
    assert.match(runtime, /cm-pos-supabase-auth-v1/);
    assert.doesNotMatch(runtime, /cdn\.jsdelivr\.net|window\.onload\s*=/);
    const css = fs.readFileSync(path.join(__dirname, '../app/pos.css'), 'utf8');
    assert.match(css, /#pos-root > \*:not\(#receiptPrintArea\)/);
    assert.doesNotMatch(css, /body\.printing-receipt > \*:not\(#receiptPrintArea\)/);
});
