const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const runtime = fs.readFileSync(path.join(root, 'public/pos-runtime.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'src/pos/shell.html'), 'utf8') + '\n<script>' + runtime + '</script>';
const serviceWorker = require('../scripts/offline-worker.cjs').createOfflineWorker('test', ['/pos-runtime.js', '/workspace-crypto.js', '/report-io.js', '/images/favicon.png']);

function getFunctionSource(source, functionName) {
    const start = source.indexOf(`function ${functionName}(`);
    assert.notEqual(start, -1, `Expected ${functionName} to exist`);
    const nextFunction = source.indexOf('\n        function ', start + 1);
    return source.slice(start, nextFunction === -1 ? undefined : nextFunction);
}

test('the migrated POS runtime parses as JavaScript', () => {
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
    const paths = [...shellMatch[1].matchAll(/"([^"]+)"/g)].map(([, assetPath]) => assetPath);

    assert.ok(paths.length > 0);
    for (const assetPath of paths) {
        const directory = assetPath === '/pos-runtime.js' ? path.join(root, 'public') : root;
        assert.ok(fs.existsSync(path.join(directory, assetPath.replace(/^\//, ''))), `${assetPath} must exist`);
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

test('offline mode blocks writes while preserving view navigation', () => {
    const viewStart = html.indexOf('function isOfflineViewControl(');
    const viewEnd = html.indexOf('\n        function ', viewStart + 1);
    const source = html.slice(viewStart, viewEnd);
    const isOfflineViewControl = new Function(`${source}; return isOfflineViewControl;`)();
    const button = (id, text, className = '', parent = '') => ({
        id,
        textContent: text,
        classList: { contains: name => className.split(' ').includes(name) },
        closest: selector => selector === parent ? {} : null,
        getAttribute: () => ''
    });

    assert.equal(isOfflineViewControl(button('nav-products', 'Products & Inventory', '', '#sidebar')), true);
    assert.equal(isOfflineViewControl(button('viewMine', 'View order')), true);
    assert.equal(isOfflineViewControl(button('filter-btn-PAID', 'Paid', 'mine-filter-btn')), true);
    assert.equal(isOfflineViewControl(button('status', 'Paid')), false);
    assert.equal(isOfflineViewControl(button('saveMine', 'Save Mine Order')), false);
    assert.match(html, /querySelectorAll\?\.\('button, \[role="button"\], a\[onclick\], input, textarea, select'\)/);
    assert.match(html, /offlineReadonlyObserver\.observe\(document\.body/);
    assert.match(html, /if \(!navigator\.onLine\) \{[\s\S]*?Offline view only/);
    assert.match(html, /document\.addEventListener\('submit',[\s\S]*?stopImmediatePropagation\(\)/);
    assert.match(html, /window\.addEventListener\('offline',[\s\S]*?setOfflineViewMode\(true\)/);
});

test('reports identify shared workspace data and use the autosave-to-cloud path', () => {
    const saveSource = getFunctionSource(html, 'saveToLocalStorage');
    const ledgerSaveSource = getFunctionSource(html, 'saveReportLedgerEdit');
    const sessionSaveSource = getFunctionSource(html, 'saveReportSessionEdit');

    assert.match(html, /Workspace report data/);
    assert.doesNotMatch(html, /Local report data/);
    assert.doesNotMatch(html, /id="reportGridView" class="overflow-x-auto"[\s\S]*?min-w-\[840px\]/);
    assert.match(fs.readFileSync(path.join(root, 'app/pos.css'), 'utf8'), /#reportCalendarGrid > button, #reportCalendarGrid > div/);
    assert.match(ledgerSaveSource, /saveToLocalStorage\(\)/);
    assert.match(sessionSaveSource, /saveToLocalStorage\(\)/);
    assert.match(saveSource, /if \(localSaved\) queueCloudSnapshotSync\(\)/);
    assert.match(html, /action: 'save', snapshot: syncSnapshot/);
});

test('shared workspace updates use authorized Realtime notifications with polling fallback', () => {
    const migration = fs.readFileSync(path.join(root, 'supabase', 'migrations', '202610160003_workspace_realtime.sql'), 'utf8');
    const subscription = getFunctionSource(html, 'subscribeToWorkspaceChanges');

    assert.match(migration, /alter publication supabase_realtime add table public\.pos_workspace_sync_events/i);
    assert.match(migration, /enable row level security/i);
    assert.match(migration, /notify_pos_workspace_change/);
    assert.match(subscription, /event: 'UPDATE'/);
    assert.match(subscription, /table: 'pos_workspace_sync_events'/);
    assert.match(subscription, /filter: `workspace_owner_id=eq\.\$\{workspaceOwnerId\}`/);
    assert.match(subscription, /syncCloudWorkspace\(\)/);
    assert.match(html, /subscribeToWorkspaceChanges\(client, cloudWorkspaceOwnerId\)/);
    assert.match(html, /\}, 15000\)/);
    assert.match(html, /action: 'get'/);
});

test('sign-in failures show plain-language guidance instead of backend errors', () => {
    const start = html.indexOf('function friendlySignInError(');
    const end = html.indexOf('\n        async function handlePasswordResetRequest', start);
    const source = html.slice(start, end);

    assert.match(source, /email and password do not match/i);
    assert.match(source, /password needs to be updated before you can sign in/i);
    assert.match(source, /check your internet connection/i);
    assert.match(source, /administrator to check your access/i);
    assert.doesNotMatch(source, /database|supabase|migration|schema/i);
    assert.match(html, /showLocalSessionScreen\('signin', friendlySignInError\(error\)\)/);
});

test('admin password visibility toggles are accessible and reset when switching auth screens', () => {
    const source = getFunctionSource(html, 'togglePasswordVisibility');
    const input = { type: 'password' };
    const icon = { className: '' };
    const attributes = {};
    const button = {
        setAttribute: (name, value) => { attributes[name] = value; },
        querySelector: selector => selector === 'i' ? icon : null
    };
    const togglePasswordVisibility = new Function('document', `${source}; return togglePasswordVisibility;`)({ getElementById: id => id === 'testPassword' ? input : null });

    togglePasswordVisibility('testPassword', button);
    assert.equal(input.type, 'text');
    assert.equal(attributes['aria-label'], 'Hide password');
    assert.equal(attributes['aria-pressed'], 'true');
    assert.equal(icon.className, 'fa-solid fa-eye-slash');
    togglePasswordVisibility('testPassword', button);
    assert.equal(input.type, 'password');
    assert.equal(attributes['aria-label'], 'Show password');
    assert.match(html, /function showLocalSessionScreen\([^)]*\) \{\s*resetPasswordVisibility\(\)/);
    for (const inputId of ['localLoginPassword', 'localSignUpPassword', 'localSignUpConfirm', 'localNewPassword', 'localNewPasswordConfirm']) {
        assert.match(html, new RegExp(`aria-controls="${inputId}"`));
    }
});

test('new and recovered admin passwords must meet the strong password policy', () => {
    const source = getFunctionSource(html, 'getAdminPasswordValidationMessage');
    const validate = new Function(`${source}; return getAdminPasswordValidationMessage;`)();

    assert.match(validate('Abc1!'), /14 characters/);
    assert.match(validate('ABCDEFGHIJKLMN1!'), /lowercase/);
    assert.match(validate('abcdefghijklmn1!'), /uppercase/);
    assert.match(validate('StrongAdminPass!'), /number/);
    assert.match(validate('StrongAdminPass1'), /symbol/);
    assert.equal(validate('Str0ngAdminPass!'), '');
    assert.match(getFunctionSource(html, 'handleLocalSignUp'), /getAdminPasswordValidationMessage\(password\)/);
    assert.match(getFunctionSource(html, 'handlePasswordRecovery'), /getAdminPasswordValidationMessage\(password\)/);
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
    const recordsMigration = fs.readFileSync(path.join(root, 'supabase', 'migrations', '202610160002_encrypted_workspace_records.sql'), 'utf8');

    assert.match(endpoint, /client\.auth\.getUser\(token\)/);
    assert.match(endpoint, /client\.rpc\('save_pos_workspace_snapshot_and_records'/);
    assert.match(endpoint, /encryptWorkspaceRecords\(snapshot, encryptionKey\)/);
    assert.match(endpoint, /WORKSPACE_ENCRYPTION_KEY/);
    assert.doesNotMatch(endpoint, /SUPABASE_SERVICE_ROLE_KEY/);
    assert.match(migration, /clothes-mania-server-encrypted/);
    assert.match(recordsMigration, /enable row level security/i);
    assert.match(recordsMigration, /save_pos_workspace_snapshot_and_records/);
    assert.match(recordsMigration, /project_pos_workspace_records/);
});
