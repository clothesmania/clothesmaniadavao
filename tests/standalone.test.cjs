const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const serviceWorker = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');

function getFunctionSource(source, functionName) {
    const start = source.indexOf(`function ${functionName}(`);
    assert.notEqual(start, -1, `Expected ${functionName} to exist`);
    const nextFunction = source.indexOf('\n        function ', start + 1);
    return source.slice(start, nextFunction === -1 ? undefined : nextFunction);
}

test('standalone inline scripts parse as JavaScript', () => {
    const scripts = [...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/gi)]
        .filter(([, attributes]) => !/\bsrc\s*=/.test(attributes))
        .map(([, , source]) => source)
        .filter(source => source.trim());

    assert.ok(scripts.length > 0);
    for (const script of scripts) new Function(script);
});

test('offline app shell references files present in the deployment root', () => {
    const shellMatch = serviceWorker.match(/const APP_SHELL = \[([\s\S]*?)\];/);
    assert.ok(shellMatch, 'Expected the service worker to define its app shell');
    const paths = [...shellMatch[1].matchAll(/'([^']+)'/g)].map(([, assetPath]) => assetPath);

    assert.ok(paths.length > 0);
    for (const assetPath of paths) {
        assert.ok(fs.existsSync(path.join(root, assetPath.replace(/^\//, ''))), `${assetPath} must exist`);
    }
});

test('failed navigation responses are not saved over the offline app shell', () => {
    assert.match(serviceWorker, /if \(response\.ok\)\s*\{[\s\S]*?cache\.put\('\/index\.html', response\.clone\(\)\)/);
});

test('product suggestions render stored fields as text, not HTML', () => {
    const source = getFunctionSource(html, 'handleMineItemInput');

    assert.match(source, /name\.textContent\s*=\s*s\.name/);
    assert.match(source, /metadata\.textContent\s*=/);
    assert.doesNotMatch(source, /\.innerHTML\s*=\s*`/);
});

test('dashboard order rows escape stored buyer, item, date, and time fields', () => {
    const source = getFunctionSource(html, 'renderDashboardTransactions');

    for (const field of ['date', 'time', 'name', 'item']) {
        assert.match(source, new RegExp(`escapeHtml\\(m\\.${field}\\)`));
    }
});

test('cloud workspace writes go through the authenticated server encryption function', () => {
    const membershipSource = getFunctionSource(html, 'ensureCloudWorkspaceMembership');
    const syncSource = getFunctionSource(html, 'syncCloudWorkspace');
    const conflictSource = getFunctionSource(html, 'resolveWorkspaceConflict');

    assert.match(membershipSource, /invokeWorkspaceSync\(client, \{ action: 'ensure', snapshot: initialSnapshot \}\)/);
    assert.match(syncSource, /invokeWorkspaceSync\(client, \{ action: 'ensure', snapshot: syncSnapshot \}\)/);
    assert.match(syncSource, /action: 'save', snapshot: syncSnapshot/);
    assert.match(conflictSource, /action: 'save', snapshot: db/);
    assert.match(html, /functions\.invoke\('workspace-sync'/);
});

test('manual JSON backups are encrypted by the server rather than exported as raw data', () => {
    const source = getFunctionSource(html, 'exportJSONBackup');

    assert.match(source, /action: 'export', snapshot: db/);
    assert.match(source, /clothes-mania-pos-encrypted-backup/);
    assert.doesNotMatch(source, /JSON\.stringify\(db/);
});

test('fresh startup initializes device encryption without showing a passphrase prompt', () => {
    assert.match(html, /id="localEncryptionOverlay" class="hidden fixed/);
    assert.match(html, /initializeLocalWorkspace\(storedSnapshot\)/);
    assert.match(html, /encryptSnapshotWithDeviceKey\(db, localDeviceKey\)/);
    assert.match(html, /requestLegacyWorkspacePassphrase\(snapshot, applyLocally = false\)/);
});

test('workspace startup fills missing collections and preserves product inventory', () => {
    const start = html.indexOf('function normalizeWorkspaceSnapshot(');
    const end = html.indexOf('\n        function ', start + 1);
    const source = html.slice(start, end);
    const normalize = new Function('isValidWorkspaceSnapshot', `${source}; return normalizeWorkspaceSnapshot;`)(snapshot => Boolean(snapshot && typeof snapshot === 'object' && !Array.isArray(snapshot)));
    const snapshot = { products: [{ id: 'sku-1', name: 'Jacket', stock: 4, price: 1200 }], mines: [{ id: 'mine-1' }] };
    const normalized = normalize(snapshot);

    assert.deepEqual(normalized.mines, snapshot.mines);
    assert.equal(normalized.shirts[0].id, 'sku-1');
    assert.equal(normalized.shirts[0].qty, 4);
    assert.deepEqual(normalized.dailyLedger, []);
    assert.deepEqual(snapshot, { products: [{ id: 'sku-1', name: 'Jacket', stock: 4, price: 1200 }], mines: [{ id: 'mine-1' }] });
    assert.throws(() => normalize({ shirts: 'not-an-array' }), /inventory data is invalid/);
});

test('startup migration reads only locally preserved cloud backups', () => {
    assert.match(html, /dexie\.kv\.where\('key'\)\.startsWith\('cloud-backup-'\)\.toArray\(\)/);
    assert.doesNotMatch(html, /dexie\.kv\.toArray\(\)/);
    const initializeWorkspace = html.match(/async function initializeLocalWorkspace\(storedSnapshot\) \{([\s\S]*?)\n        \}/)?.[1] || '';
    assert.doesNotMatch(initializeWorkspace, /await migrateLegacyLocalBackups\(\)/);
    assert.match(html, /migrateLegacyLocalBackups\(\)\.catch\(error => \{/);
});

test('server sync endpoint uses authenticated user RPCs and never includes a service-role secret', () => {
    const endpoint = fs.readFileSync(path.join(root, 'supabase', 'functions', 'workspace-sync', 'index.ts'), 'utf8');
    const migration = fs.readFileSync(path.join(root, 'supabase', 'migrations', '202610160001_server_managed_workspace_encryption.sql'), 'utf8');

    assert.match(endpoint, /client\.auth\.getUser\(token\)/);
    assert.match(endpoint, /client\.rpc\('save_pos_workspace_snapshot'/);
    assert.match(endpoint, /WORKSPACE_ENCRYPTION_KEY/);
    assert.doesNotMatch(endpoint, /SUPABASE_SERVICE_ROLE_KEY/);
    assert.match(migration, /clothes-mania-server-encrypted/);
});

test('local server serves the app and does not expose repository files', async t => {
    const server = spawn(process.execPath, [path.join(root, 'scripts', 'serve.mjs')], {
        env: { ...process.env, HOST: '127.0.0.1', PORT: '0' },
        stdio: ['ignore', 'pipe', 'pipe']
    });
    t.after(() => server.kill());

    const baseUrl = await new Promise((resolve, reject) => {
        let output = '';
        const timeout = setTimeout(() => reject(new Error('Local server did not start')), 5000);
        server.stdout.on('data', chunk => {
            output += chunk.toString();
            const match = output.match(/http:\/\/127\.0\.0\.1:\d+\/index\.html/);
            if (match) {
                clearTimeout(timeout);
                resolve(match[0].replace('/index.html', ''));
            }
        });
        server.once('error', error => {
            clearTimeout(timeout);
            reject(error);
        });
        server.once('exit', code => {
            clearTimeout(timeout);
            reject(new Error(`Local server exited before starting (${code})`));
        });
    });

    const page = await fetch(`${baseUrl}/index.html`);
    assert.equal(page.status, 200);
    assert.match(page.headers.get('content-type'), /text\/html/);
    assert.match(await page.text(), /Clothes Mania Davao/);
    assert.equal((await fetch(`${baseUrl}/.git/config`)).status, 404);
});
