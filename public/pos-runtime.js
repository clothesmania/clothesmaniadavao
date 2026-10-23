const SUPABASE_URL = window.ClothesManiaDependencies.supabaseUrl;
        const SUPABASE_PUBLISHABLE_KEY = window.ClothesManiaDependencies.supabaseKey;
        let supabaseClient = null;
        let supabaseClientPromise = null;
        let currentAuthUser = null;
        let cloudSyncTimer = null;
        let cloudSyncInProgress = false;
        let workspaceRealtimeChannel = null;
        let workspaceRealtimeOwnerId = null;
        let remoteRefreshTimer = null;
        let localPersistPromise = Promise.resolve();
        let persistQueue = Promise.resolve();
        let applyingCloudSnapshot = false;
        let cloudConflictRemote = null;
        let cloudWorkspaceOwnerId = null;
        let localDeviceKey = null;
        let legacyMigrationPassphrase = '';
        let localWorkspaceReady = false;
        let offlineViewModeActive = !navigator.onLine;
        let offlineReadonlyObserver = null;
        let lastSavedWorkspaceSnapshot = null;
        let pendingLocalSnapshot = null;
        let pendingWorkspaceUnlockResolver = null;
        let pendingWorkspaceEncryptionMode = 'create';
        let passwordRecoveryPending = false;
        let appDialogResolver = null;
        let appDialogPreviousFocus = null;
        let appDialogInputMode = false;
        let productOptionKind = null;
        let productOptionEditing = null;

        async function getSupabaseClient() {
            if (supabaseClient) return supabaseClient;
            if (!supabaseClientPromise) {
                supabaseClientPromise = Promise.resolve(window.ClothesManiaDependencies).then(async ({ createClient, migrateLegacySession }) => {
                    if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) throw new Error('Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, then rebuild.');
                    const client = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
                        auth: {
                            persistSession: true,
                            autoRefreshToken: true,
                            detectSessionInUrl: true,
                            storageKey: 'cm-pos-supabase-auth-v1'
                        }
                    });
                    client.auth.onAuthStateChange(event => {
                        if (event === 'PASSWORD_RECOVERY') {
                            passwordRecoveryPending = true;
                            window.setTimeout(() => showLocalSessionScreen('reset-password'), 0);
                        }
                    });
                    // Keep a usable auth client if an expired legacy token cannot
                    // migrate. Startup stays signed out and a fresh login can recover.
                    supabaseClient = client;
                    await migrateLegacySession(client);
                    return client;
                }).catch(error => {
                    supabaseClientPromise = null;
                    throw error;
                });
            }
            return supabaseClientPromise;
        }

        // System Application State (expanded dummy data)
        let db = {
            mines: [
                { id: 'm1', date: '2026-10-09', time: '9:12 AM', name: 'Ana Lopez', item: 'Calvin Klein Denim Jeans (32)', price: 2800, dp: 0, total: 2800, status: 'PAID', seller: 'TRICIA', mop: 'Cash' },
                { id: 'm2', date: '2026-10-09', time: '10:05 AM', name: 'Liza Navarro', item: 'NBA Hoodie (L)', price: 1200, dp: 0, total: 1200, status: 'PAID', seller: 'RAI', mop: 'GCash' },
                { id: 'm3', date: '2026-10-09', time: '10:42 AM', name: 'Carmela Dela Cruz', item: 'Skincare Set (Cleanser + Toner)', price: 850, dp: 0, total: 850, status: 'PAID', seller: 'CESS', mop: 'Maya' },
                { id: 'm4', date: '2026-10-08', time: '7:15 PM', name: 'Maria Santos', item: 'Vintage Heavyweight Tee (Black, L)', price: 380, dp: 0, total: 380, status: 'PAID', seller: 'TRICIA', mop: 'GCash' },
                { id: 'm5', date: '2026-10-08', time: '7:30 PM', name: 'Jessa Mae', item: 'Acid Wash Oversized Hoodie', price: 650, dp: 200, total: 650, status: 'UNPAID', seller: 'RAI', mop: 'COD' },
                { id: 'm6', date: '2026-10-08', time: '8:05 PM', name: 'Kyla Alcantara', item: 'Boxy Fit Striped Tee', price: 350, dp: 350, total: 350, status: 'PAID', seller: 'CESS', mop: 'GCash' },
                { id: 'm7', date: '2026-10-07', time: '4:20 PM', name: 'Bea Alonzo', item: 'Cargo Shorts Vintage', price: 450, dp: 0, total: 450, status: 'PAID', seller: 'TRICIA', mop: 'Maya' },
                { id: 'm8', date: '2026-10-07', time: '5:10 PM', name: 'Ruth Velasco', item: 'Guess Denim Jacket (M)', price: 3200, dp: 500, total: 3200, status: 'UNPAID', seller: 'RAI', mop: 'COD' },
                { id: 'm9', date: '2026-10-06', time: '2:45 PM', name: 'Anna Torres', item: 'Dsquared2 Tee (Pre-loved)', price: 1800, dp: 0, total: 1800, status: 'PAID', seller: 'CESS', mop: 'Cash' },
                { id: 'm10', date: '2026-10-06', time: '3:12 PM', name: 'Joel Ramos', item: 'High-waisted Pants (Black)', price: 1400, dp: 0, total: 1400, status: 'PAID', seller: 'TRICIA', mop: 'GCash' },
                { id: 'm11', date: '2026-10-05', time: '11:20 AM', name: 'May Santos', item: 'Perfume (Luxury)', price: 4200, dp: 0, total: 4200, status: 'PAID', seller: 'RAI', mop: 'Maya' },
                { id: 'm12', date: '2026-10-05', time: '1:05 PM', name: 'Gina Paul', item: 'Fashion Jewelry Set', price: 650, dp: 0, total: 650, status: 'PAID', seller: 'CESS', mop: 'Cash' },
                { id: 'm13', date: '2026-10-04', time: '4:55 PM', name: 'Leah Cruz', item: 'Levi\'s Slim Jeans', price: 2600, dp: 0, total: 2600, status: 'PAID', seller: 'TRICIA', mop: 'GCash' },
                { id: 'm14', date: '2026-10-04', time: '6:30 PM', name: 'Ivy Mendoza', item: 'Track Jogger Pants', price: 980, dp: 0, total: 980, status: 'PAID', seller: 'RAI', mop: 'Cash' },
                { id: 'm15', date: '2026-10-03', time: '12:10 PM', name: 'Nico Santos', item: 'Boxy Cropped Polo (S)', price: 420, dp: 0, total: 420, status: 'PAID', seller: 'CESS', mop: 'GCash' },
                { id: 'm16', date: '2026-10-03', time: '2:30 PM', name: 'Roi Delgado', item: 'NBA Tee (L)', price: 550, dp: 0, total: 550, status: 'PAID', seller: 'TRICIA', mop: 'Cash' },
                { id: 'm17', date: '2026-10-02', time: '10:05 AM', name: 'Samantha P', item: 'New Denim Jeans (Levi\'s)', price: 3000, dp: 0, total: 3000, status: 'PAID', seller: 'RAI', mop: 'Maya' },
                { id: 'm18', date: '2026-10-02', time: '5:20 PM', name: 'Carlos V', item: 'Skincare Serum', price: 1200, dp: 0, total: 1200, status: 'PAID', seller: 'CESS', mop: 'GCash' },
                { id: 'm19', date: '2026-10-01', time: '9:50 AM', name: 'Jomar Lee', item: 'Luxury Belt (Pre-loved)', price: 1500, dp: 0, total: 1500, status: 'PAID', seller: 'TRICIA', mop: 'Cash' },
                { id: 'm20', date: '2026-09-30', time: '3:30 PM', name: 'Yssa Gale', item: 'Denim Shorts (High-waist)', price: 760, dp: 0, total: 760, status: 'PAID', seller: 'RAI', mop: 'Maya' },
                { id: 'm21', date: '2026-09-30', time: '6:10 PM', name: 'Patricia Go', item: 'Guess Tote Bag (Pre-loved)', price: 2200, dp: 0, total: 2200, status: 'PAID', seller: 'CESS', mop: 'GCash' },
                { id: 'm22', date: '2026-09-29', time: '11:45 AM', name: 'Melody Cruz', item: 'Athleisure Set (Top+Bottom)', price: 1750, dp: 0, total: 1750, status: 'PAID', seller: 'TRICIA', mop: 'Cash' },
                { id: 'm23', date: '2026-09-29', time: '4:05 PM', name: 'Yvette', item: 'Perfume Sample Pack', price: 450, dp: 0, total: 450, status: 'PAID', seller: 'RAI', mop: 'GCash' },
                { id: 'm24', date: '2026-09-28', time: '2:05 PM', name: 'Benjie Santos', item: 'Box Bundle (3 tees)', price: 1000, dp: 0, total: 1000, status: 'PAID', seller: 'CESS', mop: 'Cash' },
                { id: 'm25', date: '2026-09-28', time: '5:22 PM', name: 'Karen Martin', item: 'Calvin Klein Bralette', price: 1100, dp: 0, total: 1100, status: 'PAID', seller: 'TRICIA', mop: 'Maya' },
                { id: 'm26', date: '2026-09-27', time: '1:15 PM', name: 'Dina Lopez', item: 'Levi\'s Jacket (M)', price: 3800, dp: 0, total: 3800, status: 'PAID', seller: 'RAI', mop: 'GCash' },
                { id: 'm27', date: '2026-09-26', time: '10:55 AM', name: 'Eugene R', item: 'Skincare Mask Pack', price: 450, dp: 0, total: 450, status: 'PAID', seller: 'CESS', mop: 'Cash' },
                { id: 'm28', date: '2026-09-25', time: '3:40 PM', name: 'Arnel D', item: 'Track Pants (XL)', price: 880, dp: 0, total: 880, status: 'PAID', seller: 'TRICIA', mop: 'GCash' },
                { id: 'm29', date: '2026-09-24', time: '6:00 PM', name: 'Cherry Mae', item: 'Dsquared2 Tee (New)', price: 3500, dp: 0, total: 3500, status: 'UNPAID', seller: 'RAI', mop: 'COD' },
                { id: 'm30', date: '2026-09-23', time: '12:05 PM', name: 'Faye Gonzales', item: 'Fashion Necklace', price: 350, dp: 0, total: 350, status: 'PAID', seller: 'CESS', mop: 'Cash' }
            ],
            shirts: [
                { id: 's1', name: 'Vintage Heavyweight Tee', size: 'L', color: 'Washed Black', qty: 24, cost: 180, price: 380, soldCount: 42 },
                { id: 's2', name: 'Boxy Fit Striped Tee', size: 'M', color: 'Navy / White', qty: 15, cost: 160, price: 350, soldCount: 31 },
                { id: 's3', name: 'Acid Wash Oversized Hoodie', size: 'XL', color: 'Charcoal', qty: 8, cost: 320, price: 650, soldCount: 19 },
                { id: 's4', name: 'Cargo Shorts Vintage', size: 'L', color: 'Olive Green', qty: 12, cost: 220, price: 450, soldCount: 27 },
                { id: 's5', name: 'Calvin Klein Denim Jeans', size: '32', color: 'Indigo', qty: 10, cost: 1500, price: 2800, soldCount: 8 },
                { id: 's6', name: 'Guess Denim Jacket', size: 'M', color: 'Blue', qty: 6, cost: 1800, price: 3200, soldCount: 3 },
                { id: 's7', name: 'Levi\'s Slim Jeans', size: '30', color: 'Dark Blue', qty: 14, cost: 1400, price: 2600, soldCount: 12 },
                { id: 's8', name: 'Dsquared2 Graphic Tee', size: 'L', color: 'White', qty: 4, cost: 2000, price: 3500, soldCount: 2 },
                { id: 's9', name: 'NBA Hoodie', size: 'L', color: 'Gray', qty: 20, cost: 400, price: 1200, soldCount: 25 },
                { id: 's10', name: 'Boxy Cropped Polo', size: 'S', color: 'Olive', qty: 18, cost: 220, price: 420, soldCount: 14 },
                { id: 's11', name: 'Track Jogger Pants', size: 'M', color: 'Black', qty: 22, cost: 320, price: 980, soldCount: 30 },
                { id: 's12', name: 'High-waisted Denim Shorts', size: 'L', color: 'Light Blue', qty: 12, cost: 320, price: 760, soldCount: 9 },
                { id: 's13', name: 'Athleisure Top', size: 'M', color: 'Pink', qty: 16, cost: 220, price: 600, soldCount: 11 },
                { id: 's14', name: 'Calvin Klein Bralette', size: 'M', color: 'Nude', qty: 8, cost: 550, price: 1100, soldCount: 5 },
                { id: 's15', name: 'Luxury Perfume (small)', size: '50ml', color: 'N/A', qty: 10, cost: 2100, price: 4200, soldCount: 6 },
                { id: 's16', name: 'Skincare Serum', size: '30ml', color: 'N/A', qty: 25, cost: 500, price: 1200, soldCount: 20 },
                { id: 's17', name: 'Fashion Necklace', size: 'One Size', color: 'Gold', qty: 30, cost: 80, price: 350, soldCount: 28 },
                { id: 's18', name: 'Guess Tote Bag', size: 'One Size', color: 'Brown', qty: 5, cost: 1400, price: 2200, soldCount: 2 },
                { id: 's19', name: 'Box Bundle (3 tees)', size: 'Mix', color: 'Assorted', qty: 50, cost: 300, price: 1000, soldCount: 20 },
                { id: 's20', name: 'Pre-loved Luxury Belt', size: 'M', color: 'Black', qty: 3, cost: 700, price: 1500, soldCount: 1 }
            ],
            dailyLedger: [
                { date: '2026-10-09', afternoon: 22000, evening: 18000, walkIn: 5000, boxBundle: 2000, boost: 3000 },
                { date: '2026-10-08', afternoon: 12500, evening: 24300, walkIn: 5200, boxBundle: 0, boost: 3000 },
                { date: '2026-10-07', afternoon: 15400, evening: 18900, walkIn: 7500, boxBundle: 3000, boost: 3000 },
                { date: '2026-10-06', afternoon: 9800, evening: 14200, walkIn: 4100, boxBundle: 0, boost: 3000 },
                { date: '2026-10-05', afternoon: 12000, evening: 15000, walkIn: 4800, boxBundle: 1000, boost: 2500 },
                { date: '2026-10-04', afternoon: 11000, evening: 13200, walkIn: 3600, boxBundle: 0, boost: 2000 },
                { date: '2026-10-03', afternoon: 9800, evening: 10100, walkIn: 3000, boxBundle: 0, boost: 1500 },
                { date: '2026-10-02', afternoon: 13400, evening: 9200, walkIn: 2800, boxBundle: 0, boost: 2000 },
                { date: '2026-10-01', afternoon: 9000, evening: 11000, walkIn: 2100, boxBundle: 0, boost: 3000 },
                { date: '2026-09-30', afternoon: 14200, evening: 12500, walkIn: 3400, boxBundle: 0, boost: 2000 },
                { date: '2026-09-29', afternoon: 9800, evening: 8600, walkIn: 1500, boxBundle: 0, boost: 1200 },
                { date: '2026-09-28', afternoon: 7600, evening: 9400, walkIn: 2200, boxBundle: 0, boost: 1000 }
            ]
        };

        db.mines = [];
        db.dailyLedger = [];

        // Dexie (IndexedDB) setup for offline persistence
        const dexie = new Dexie('ClothesManiaDB');
        dexie.version(1).stores({ kv: '&key' });

        async function readPersistedWorkspaceSnapshot() {
            let indexedDbSnapshot = null;
            let browserSnapshot = null;
            let browserSnapshotError = null;
            try {
                const row = await dexie.kv.get('db');
                indexedDbSnapshot = row?.value || null;
            } catch (error) {
                console.error('Could not read the IndexedDB workspace snapshot.', error);
            }
            try {
                const saved = localStorage.getItem('clothesManiaDavaoDB_v4');
                browserSnapshot = saved ? JSON.parse(saved) : null;
            } catch (error) {
                browserSnapshotError = error;
                console.error('Could not read the browser workspace snapshot.', error);
            }
            if (indexedDbSnapshot) return indexedDbSnapshot;
            if (browserSnapshot) return browserSnapshot;
            if (browserSnapshotError) throw new Error('Saved local data could not be read. The app stopped to avoid replacing it.');
            return null;
        }

        function persistDB() {
            const saveOperation = persistQueue.catch(() => false).then(async () => {
                if (localWorkspaceReady && !navigator.onLine && !applyingCloudSnapshot) {
                    updateLocalSaveStatus('saved');
                    updateCloudSyncStatus('offline');
                    return false;
                }
                if (!localDeviceKey) {
                    updateLocalSaveStatus('error', 'Protected device storage is not available');
                    return false;
                }
                let encryptedSnapshot;
                try {
                    encryptedSnapshot = await ClothesManiaWorkspaceCrypto.encryptSnapshotWithDeviceKey(db, localDeviceKey);
                } catch (error) {
                    console.error('Could not encrypt the local workspace snapshot.', error);
                    updateLocalSaveStatus('error', 'Workspace encryption failed');
                    return false;
                }
                let indexedDbSaved = false;
                let localStorageSaved = false;
                try {
                    await dexie.kv.put({ key: 'db', value: encryptedSnapshot });
                    indexedDbSaved = true;
                } catch (error) {
                    console.error('IndexedDB encrypted save failed.', error);
                }
                try {
                    localStorage.setItem('clothesManiaDavaoDB_v4', JSON.stringify(encryptedSnapshot));
                    localStorageSaved = true;
                } catch (error) {
                    console.error('Browser encrypted fallback save failed.', error);
                }
                if (!indexedDbSaved && !localStorageSaved) {
                    updateLocalSaveStatus('error', 'Could not save encrypted data on this device');
                    return false;
                }
                lastSavedWorkspaceSnapshot = JSON.parse(JSON.stringify(db));
                updateLocalSaveStatus(indexedDbSaved ? 'saved' : 'fallback');
                return true;
            });
            persistQueue = saveOperation;
            return saveOperation;
        }

        function updateLocalSaveStatus(state, message = '') {
            const label = document.getElementById('localSaveLabel');
            const icon = document.getElementById('localSaveIcon');
            const container = document.getElementById('localSaveStatus');
            if (!label || !icon || !container) return;
            const status = {
                checking: [message || 'Checking local save…', 'fa-solid fa-hard-drive', 'border-gray-200 bg-white text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300'],
                saving: ['Saving on this device…', 'fa-solid fa-floppy-disk', 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300'],
                saved: ['Saved on this device', 'fa-solid fa-hard-drive', 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300'],
                fallback: ['Saved in browser storage', 'fa-solid fa-hard-drive', 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300'],
                error: [message || 'Local save failed', 'fa-solid fa-triangle-exclamation', 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300']
            }[state] || ['Local save status unavailable', 'fa-solid fa-hard-drive', 'border-gray-200 bg-white text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300'];
            label.textContent = status[0];
            icon.className = status[1];
            container.className = `inline-flex h-9 min-w-9 items-center justify-center gap-2 rounded-lg border px-2 sm:px-2.5 text-xs font-medium shadow-sm ${status[2]}`;
            container.title = message || status[0];
            container.setAttribute('aria-label', status[0]);
        }

        function readCloudSyncMeta() {
            try {
                const value = localStorage.getItem('cm_pos_cloud_sync_meta_v1');
                return value ? JSON.parse(value) : null;
            } catch (error) {
                console.error('Could not read cloud sync metadata.', error);
                return null;
            }
        }

        function writeCloudSyncMeta(updatedAt) {
            const meta = { workspaceOwnerId: cloudWorkspaceOwnerId || '', remoteUpdatedAt: updatedAt, syncedAt: new Date().toISOString() };
            localStorage.setItem('cm_pos_cloud_sync_meta_v1', JSON.stringify(meta));
            localStorage.removeItem('cm_pos_cloud_sync_dirty_v1');
            return meta;
        }

        function snapshotsMatch(left, right) {
            const normalize = value => {
                if (Array.isArray(value)) return value.map(normalize);
                if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, normalize(value[key])]));
                return value;
            };
            return JSON.stringify(normalize(left)) === JSON.stringify(normalize(right));
        }

        function updateCloudSyncStatus(state, message = '') {
            const label = document.getElementById('cloudSyncLabel');
            const icon = document.getElementById('cloudSyncIcon');
            const retry = document.getElementById('cloudSyncRetry');
            const container = document.getElementById('cloudSyncStatus');
            if (!label || !icon || !retry || !container) return;
            const status = {
                checking: ['Cloud: checking', 'fa-solid fa-cloud text-gray-400'],
                offline: ['Cloud: offline · queued', 'fa-solid fa-cloud-arrow-down text-amber-600'],
                syncing: ['Cloud: syncing…', 'fa-solid fa-rotate fa-spin text-blue-600'],
                synced: ['Cloud: synced', 'fa-solid fa-cloud-check text-emerald-600'],
                conflict: ['Cloud: choose a copy', 'fa-solid fa-triangle-exclamation text-amber-600'],
                error: ['Cloud: needs attention', 'fa-solid fa-cloud-bolt text-rose-600'],
                signedOut: ['Cloud: sign in required', 'fa-solid fa-cloud text-gray-400']
            }[state] || ['Cloud: checking', 'fa-solid fa-cloud text-gray-400'];
            label.textContent = status[0];
            icon.className = status[1];
            retry.classList.toggle('hidden', state !== 'error');
            container.title = message || status[0];
            container.setAttribute('aria-label', message ? `${status[0]}: ${message}` : status[0]);
        }

        function isOfflineViewControl(element) {
            if (element.closest('#localSessionOverlay, #localEncryptionOverlay')) return true;
            if (element.closest('#sidebar') || element.closest('[role="tablist"]') || element.closest('#minePaymentFilters')) return true;
            if (element.classList.contains('chart-filter') || element.classList.contains('mine-filter-btn')) return true;
            if (['mobileSidebarToggle', 'sidebarBrandExpand', 'adminMenuButton', 'cloudSyncRetry', 'adminMenuTheme'].includes(element.id)) return true;
            const label = `${element.textContent || ''} ${element.getAttribute('aria-label') || ''} ${element.getAttribute('title') || ''}`.trim().toLowerCase();
            if (/^(view\b.*|close\b.*|back|history|all history|previous|next|search\b.*|filter\b.*|print|export|toggle dark mode|dark mode|open admin account menu|close navigation|open navigation)$/.test(label)) return true;
            return /^(cancel|stay signed in)$/.test(label) && Boolean(element.closest('[role="dialog"], [aria-modal="true"], .modal-overlay, #appDialog'));
        }

        function applyOfflineReadonlyControls(root = document) {
            root.querySelectorAll?.('button, [role="button"], a[onclick], input, textarea, select').forEach(element => {
                if (!offlineViewModeActive) {
                    if (element.hasAttribute('data-offline-disabled')) {
                        element.disabled = element.getAttribute('data-offline-disabled') === 'true';
                        element.removeAttribute('data-offline-disabled');
                    }
                    element.classList.remove('offline-readonly-control');
                    return;
                }
                if (element.matches('input[type="search"]') || element.matches('[data-view-filter="true"]') || isOfflineViewControl(element)) return;
                if (!element.hasAttribute('data-offline-disabled')) element.setAttribute('data-offline-disabled', String(Boolean(element.disabled)));
                element.disabled = true;
                element.classList.add('offline-readonly-control');
            });
        }

        function setOfflineViewMode(active) {
            offlineViewModeActive = Boolean(active);
            document.getElementById('offlineViewModeBanner')?.classList.toggle('hidden', !offlineViewModeActive);
            document.body.classList.toggle('offline-view-only', offlineViewModeActive);
            applyOfflineReadonlyControls();
        }

        function initializeOfflineViewMode() {
            if (!offlineReadonlyObserver) {
                offlineReadonlyObserver = new MutationObserver(records => {
                    if (records.some(record => record.addedNodes.length)) applyOfflineReadonlyControls();
                });
                offlineReadonlyObserver.observe(document.body, { childList: true, subtree: true });
                document.addEventListener('click', event => {
                    if (!offlineViewModeActive) return;
                    const action = event.target.closest?.('button, [role="button"], a[onclick], input[type="submit"]');
                    if (!action || isOfflineViewControl(action)) return;
                    event.preventDefault();
                    event.stopImmediatePropagation();
                    showToast('Offline view only. Reconnect to make changes.', true);
                }, true);
                document.addEventListener('submit', event => {
                    if (!offlineViewModeActive) return;
                    event.preventDefault();
                    event.stopImmediatePropagation();
                    showToast('Offline view only. Reconnect to make changes.', true);
                }, true);
            }
            setOfflineViewMode(!navigator.onLine);
        }

        function queueCloudSnapshotSync() {
            if (applyingCloudSnapshot || !currentAuthUser) return;
            try { localStorage.setItem('cm_pos_cloud_sync_dirty_v1', 'true'); } catch (error) { console.error('Could not mark local changes for sync.', error); }
            if (!navigator.onLine) {
                updateCloudSyncStatus('offline');
                return;
            }
            updateCloudSyncStatus('syncing');
            window.clearTimeout(cloudSyncTimer);
            cloudSyncTimer = window.setTimeout(() => syncCloudWorkspace(), 900);
        }

        function subscribeToWorkspaceChanges(client, workspaceOwnerId) {
            if (!client || !workspaceOwnerId || !currentAuthUser || !navigator.onLine) return;
            if (workspaceRealtimeChannel && workspaceRealtimeOwnerId === workspaceOwnerId) return;
            if (workspaceRealtimeChannel) client.removeChannel(workspaceRealtimeChannel);
            workspaceRealtimeOwnerId = workspaceOwnerId;
            workspaceRealtimeChannel = client
                .channel(`pos-workspace:${workspaceOwnerId}`)
                .on('postgres_changes', {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'pos_workspace_sync_events',
                    filter: `workspace_owner_id=eq.${workspaceOwnerId}`
                }, payload => {
                    if (payload.new?.workspace_owner_id !== workspaceOwnerId || !currentAuthUser || !navigator.onLine) return;
                    window.clearTimeout(remoteRefreshTimer);
                    remoteRefreshTimer = window.setTimeout(() => {
                        if (currentAuthUser && navigator.onLine && !cloudConflictRemote) syncCloudWorkspace();
                    }, 150);
                })
                .subscribe(status => {
                    if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                        console.warn('Workspace live updates are unavailable; periodic cloud sync remains active.');
                    }
                });
        }

        async function preserveCloudSnapshot(label, snapshot) {
            const key = `cloud-backup-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
            const encryptedSnapshot = await ClothesManiaWorkspaceCrypto.encryptSnapshotWithDeviceKey(snapshot, localDeviceKey);
            await dexie.kv.put({ key, value: { label, savedAt: new Date().toISOString(), snapshot: encryptedSnapshot } });
        }

        async function restoreRemoteWorkspaceSnapshot(remote, label = 'Local workspace before cloud refresh') {
            await preserveCloudSnapshot(label, db);
            applyingCloudSnapshot = true;
            const previousSnapshot = db;
            try {
                db = remote.snapshot;
                if (!await persistDB()) {
                    db = previousSnapshot;
                    throw new Error('The shared workspace was not applied because encrypted local storage failed.');
                }
                localStorage.removeItem('cm_pos_cloud_sync_dirty_v1');
                writeCloudSyncMeta(remote.updated_at);
                refreshAllUI();
            } finally {
                applyingCloudSnapshot = false;
            }
        }

        async function invokeWorkspaceSync(client, body) {
            const { data, error } = await client.functions.invoke('workspace-sync', { body });
            if (error) {
                let responseData = data;
                if (!responseData && error.context instanceof Response) {
                    try { responseData = await error.context.clone().json(); } catch (readError) { console.error('Could not read workspace sync error response.', readError); }
                }
                const failure = new Error(responseData?.error || error.message || 'Cloud workspace request failed.');
                failure.code = responseData?.code || (error.context?.status === 409 ? '40001' : '');
                throw failure;
            }
            if (data?.error) throw new Error(data.error);
            return data;
        }

        function showCloudConflict(remote) {
            cloudConflictRemote = remote;
            document.getElementById('cloudConflictModal').classList.remove('hidden');
            document.getElementById('cloudConflictModal').classList.add('flex');
            document.getElementById('sidebar').inert = true;
            document.getElementById('mainAppContent').inert = true;
            updateCloudSyncStatus('conflict');
        }

        function closeCloudConflict() {
            document.getElementById('cloudConflictModal').classList.add('hidden');
            document.getElementById('cloudConflictModal').classList.remove('flex');
            document.getElementById('sidebar').inert = false;
            document.getElementById('mainAppContent').inert = false;
        }

        async function syncCloudWorkspace() {
            if (!localWorkspaceReady || cloudSyncInProgress || cloudConflictRemote || !currentAuthUser) return;
            if (!navigator.onLine) {
                updateCloudSyncStatus('offline');
                return;
            }
            cloudSyncInProgress = true;
            let localChangedDuringSync = false;
            updateCloudSyncStatus('syncing');
            try {
                await localPersistPromise;
                const syncSnapshot = JSON.parse(JSON.stringify(db));
                const client = await getSupabaseClient();
                const ensured = await invokeWorkspaceSync(client, { action: 'ensure', snapshot: syncSnapshot });
                cloudWorkspaceOwnerId = ensured.workspaceOwnerId;
                subscribeToWorkspaceChanges(client, cloudWorkspaceOwnerId);
                const result = await invokeWorkspaceSync(client, { action: 'get' });
                let remote = result.remote;
                if (remote?.legacySnapshot) {
                    remote.snapshot = await unlockLegacyWorkspaceSnapshot(remote.legacySnapshot);
                    remote.encrypted = false;
                    delete remote.legacySnapshot;
                } else if (remote) {
                    remote.encrypted = true;
                    legacyMigrationPassphrase = '';
                }

                const meta = readCloudSyncMeta();
                if (remote && meta?.workspaceOwnerId === cloudWorkspaceOwnerId && meta.remoteUpdatedAt !== remote.updated_at) {
                    if (localStorage.getItem('cm_pos_cloud_sync_dirty_v1') !== 'true') {
                        await restoreRemoteWorkspaceSnapshot(remote);
                        updateCloudSyncStatus('synced');
                        return;
                    }
                    showCloudConflict(remote);
                    return;
                }
                if (remote && meta?.workspaceOwnerId !== cloudWorkspaceOwnerId && !snapshotsMatch(remote.snapshot, syncSnapshot)) {
                    showCloudConflict(remote);
                    return;
                }
                if (remote?.encrypted && snapshotsMatch(remote.snapshot, syncSnapshot)) {
                    writeCloudSyncMeta(remote.updated_at);
                    localChangedDuringSync = !snapshotsMatch(syncSnapshot, db);
                    if (localChangedDuringSync) localStorage.setItem('cm_pos_cloud_sync_dirty_v1', 'true');
                    updateCloudSyncStatus('synced');
                    return;
                }

                let saved;
                try {
                    saved = await invokeWorkspaceSync(client, {
                        action: 'save', snapshot: syncSnapshot, expectedUpdatedAt: remote?.updated_at || null
                    });
                } catch (writeError) {
                    if (writeError.code === '40001') {
                        const latestResult = await invokeWorkspaceSync(client, { action: 'get' });
                        const latest = latestResult.remote;
                        if (latest?.legacySnapshot) {
                            latest.snapshot = await unlockLegacyWorkspaceSnapshot(latest.legacySnapshot);
                            latest.encrypted = false;
                            delete latest.legacySnapshot;
                        }
                        if (latest) showCloudConflict(latest);
                        else throw writeError;
                        return;
                    }
                    throw writeError;
                }
                writeCloudSyncMeta(saved.updatedAt);
                legacyMigrationPassphrase = '';
                localChangedDuringSync = !snapshotsMatch(syncSnapshot, db);
                if (localChangedDuringSync) localStorage.setItem('cm_pos_cloud_sync_dirty_v1', 'true');
                updateCloudSyncStatus('synced');
            } catch (error) {
                console.error('Cloud workspace sync failed.', error);
                updateCloudSyncStatus(navigator.onLine ? 'error' : 'offline', error.message || 'Cloud sync failed');
            } finally {
                cloudSyncInProgress = false;
                if (localChangedDuringSync && currentAuthUser && !cloudConflictRemote && navigator.onLine) {
                    queueCloudSnapshotSync();
                }
            }
        }

        async function resolveWorkspaceConflict(choice) {
            if (!cloudConflictRemote || !currentAuthUser) return;
            const remote = cloudConflictRemote;
            try {
                updateCloudSyncStatus('syncing');
                if (choice === 'local') {
                    await preserveCloudSnapshot('Local workspace before cloud conflict resolution', db);
                    await preserveCloudSnapshot('Cloud workspace before local copy was chosen', remote.snapshot);
                    const client = await getSupabaseClient();
                    const saved = await invokeWorkspaceSync(client, { action: 'save', snapshot: db, expectedUpdatedAt: remote.updated_at });
                    writeCloudSyncMeta(saved.updatedAt);
                    closeCloudConflict();
                    updateCloudSyncStatus('synced');
                    return;
                }

                await restoreRemoteWorkspaceSnapshot(remote, 'Local workspace before restoring cloud copy');
                closeCloudConflict();
                updateCloudSyncStatus('synced');
            } catch (error) {
                console.error('Could not resolve the cloud workspace conflict.', error);
                updateCloudSyncStatus('error', error.message || 'Could not resolve workspace copies');
            }
        }

        function retryCloudSync() {
            window.clearTimeout(cloudSyncTimer);
            syncCloudWorkspace();
        }

        function registerOfflineAppShell() {
            if (!('serviceWorker' in navigator)) return;
            navigator.serviceWorker.register('/sw.js').catch(error => {
                console.warn('Offline app shell could not be registered.', error);
            });
        }

        let currentChartFilter = '1D';
        let salesChartInstance = null;
        let mineFilterTab = 'ALL';
        let mineSessionView = '__new__';
        let unpaidLedgerSearch = '';
        let unpaidLedgerYear = 'all';
        let unpaidLedgerMonth = 'all';
        let activeLiveSessionId = null;
        let liveSessionReturnFocus = null;
        let resumeMineAfterSessionStart = false;
        let openMineAfterSessionStart = false;
        let pendingQuickMineShirtId = null;
        let reportMonthCursor = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        let selectedReportDate = null;
        let reportViewMode = 'grid';
        let editingReportDate = null;
        let reportLedgerDraft = null;
        let editingReportSessionId = null;
        let stockModalReturnFocus = null;
        let stockPage = 1;
        const stockPageSize = 10;
        let selectedStockFilter = '';
        let auditView = 'activity';
        let pendingLiveSessionDeleteId = null;

        // Data seeding helpers (adds products array)
        function seedProductsFromShirts() {
            if (!db.products) {
                db.products = db.shirts.map((s, i) => ({
                    id: 'p' + (i + 1),
                    sku: 'CM-' + (1000 + i),
                    name: s.name,
                    brand: s.name.match(/Calvin|Guess|Dsquared|Levi/i) ? (s.name.match(/Calvin/i) ? 'Calvin Klein' : s.name.match(/Guess/i) ? 'Guess' : s.name.match(/Dsquared/i) ? 'Dsquared2' : 'Levi\'s') : 'Clothes Mania',
                    category: (/Perfume|Skincare|Serum|Beauty|Mask/i.test(s.name)) ? 'Beauty & Lifestyle' : (/Bag|Belt|Necklace|Jewelry|Tote/i.test(s.name)) ? 'Accessories' : 'Clothing & Apparel',
                    price: s.price,
                    cost: s.cost,
                    stock: s.qty
                }));
            }
        }

        async function migrateLegacyLocalBackups() {
            const records = await dexie.kv.where('key').startsWith('cloud-backup-').toArray();
            for (const record of records) {
                if (!String(record.key || '').startsWith('cloud-backup-')) continue;
                const value = record.value;
                if (!value?.snapshot || ClothesManiaWorkspaceCrypto.isEncryptedSnapshot(value.snapshot) || ClothesManiaWorkspaceCrypto.isDeviceEncryptedSnapshot(value.snapshot)) continue;
                const encryptedSnapshot = await ClothesManiaWorkspaceCrypto.encryptSnapshotWithDeviceKey(value.snapshot, localDeviceKey);
                await dexie.kv.put({ ...record, value: { ...value, snapshot: encryptedSnapshot } });
            }
        }

        function showWorkspacePassphraseMessage(message, isError = true) {
            const messageElement = document.getElementById('localEncryptionMessage');
            messageElement.textContent = message;
            messageElement.classList.toggle('hidden', !message);
            messageElement.classList.toggle('bg-rose-50', isError);
            messageElement.classList.toggle('text-rose-700', isError);
            messageElement.classList.toggle('dark:bg-rose-950/30', isError);
            messageElement.classList.toggle('dark:text-rose-200', isError);
            messageElement.classList.toggle('bg-emerald-50', !isError);
            messageElement.classList.toggle('text-emerald-800', !isError);
            messageElement.classList.toggle('dark:bg-emerald-950/30', !isError);
            messageElement.classList.toggle('dark:text-emerald-200', !isError);
        }

        function isValidWorkspaceSnapshot(snapshot) {
            return Boolean(snapshot && typeof snapshot === 'object' && !Array.isArray(snapshot));
        }

        function normalizeWorkspaceSnapshot(snapshot) {
            if (!isValidWorkspaceSnapshot(snapshot)) throw new Error('Saved local data is invalid. The app stopped to avoid replacing it.');
            const normalized = { ...snapshot };
            const collectionNames = ['mines', 'dailyLedger', 'hosts', 'liveSessions', 'auditLogs', 'deletedHosts', 'deletedRecords', 'products'];
            for (const collectionName of collectionNames) {
                if (normalized[collectionName] === undefined) normalized[collectionName] = [];
                else if (!Array.isArray(normalized[collectionName])) throw new Error(`Saved ${collectionName} data is invalid. The app stopped to avoid replacing it.`);
            }
            if (normalized.shirts === undefined) {
                normalized.shirts = normalized.products.map((product, index) => ({
                    id: product.id || product.sku || `product-${index + 1}`,
                    name: String(product.name || ''),
                    category: String(product.category || ''),
                    size: String(product.size || 'N/A'),
                    color: String(product.color || ''),
                    qty: Number(product.qty ?? product.stock ?? 0),
                    cost: Number(product.cost || 0),
                    price: Number(product.price || 0),
                    soldCount: Number(product.soldCount || 0)
                }));
            } else if (!Array.isArray(normalized.shirts)) {
                throw new Error('Saved inventory data is invalid. The app stopped to avoid replacing it.');
            }
            return normalized;
        }

        function requestLegacyWorkspacePassphrase(snapshot, applyLocally = false) {
            pendingLocalSnapshot = snapshot;
            pendingWorkspaceEncryptionMode = 'unlock';
            pendingLegacySnapshotApply = applyLocally;
            const confirmationGroup = document.getElementById('workspacePassphraseConfirmationGroup');
            const confirmationInput = document.getElementById('workspacePassphraseConfirmation');
            const passphraseInput = document.getElementById('workspacePassphrase');
            confirmationGroup.classList.add('hidden');
            confirmationInput.required = false;
            passphraseInput.autocomplete = 'current-password';
            document.getElementById('localEncryptionTitle').textContent = 'Migrate protected legacy data';
            document.getElementById('localEncryptionDescription').textContent = 'This older saved workspace uses a passphrase. Enter it once to migrate the records to the current protected storage.';
            document.getElementById('workspacePassphraseRecoveryWarning').textContent = 'The legacy passphrase is used only to migrate this existing data. It is not saved.';
            document.getElementById('workspacePassphraseSubmit').textContent = 'Migrate records';
            showWorkspacePassphraseMessage('');
            document.getElementById('localEncryptionOverlay').classList.remove('hidden');
            document.getElementById('localEncryptionOverlay').classList.add('flex');
            document.getElementById('sidebar').inert = true;
            document.getElementById('mainAppContent').inert = true;
            passphraseInput.focus();
            return new Promise(resolve => { pendingWorkspaceUnlockResolver = resolve; });
        }

        async function unlockLegacyWorkspaceSnapshot(snapshot, applyLocally = false) {
            if (!ClothesManiaWorkspaceCrypto.isEncryptedSnapshot(snapshot)) {
                if (!isValidWorkspaceSnapshot(snapshot)) throw new Error('The legacy cloud workspace snapshot is invalid.');
                return snapshot;
            }
            if (legacyMigrationPassphrase) {
                const unlocked = await ClothesManiaWorkspaceCrypto.unlockSnapshot(snapshot, legacyMigrationPassphrase);
                if (!isValidWorkspaceSnapshot(unlocked.snapshot)) throw new Error('The legacy workspace data is invalid.');
                return unlocked.snapshot;
            }
            return requestLegacyWorkspacePassphrase(snapshot, applyLocally);
        }

        async function submitWorkspacePassphrase(event) {
            event.preventDefault();
            const form = document.getElementById('localEncryptionForm');
            const submitButton = document.getElementById('workspacePassphraseSubmit');
            const passphrase = document.getElementById('workspacePassphrase').value;
            submitButton.disabled = true;
            showWorkspacePassphraseMessage('Migrating the existing protected records…', false);
            try {
                const unlocked = await ClothesManiaWorkspaceCrypto.unlockSnapshot(pendingLocalSnapshot, passphrase);
                if (!isValidWorkspaceSnapshot(unlocked.snapshot)) throw new Error('The decrypted workspace data is invalid. No records were changed.');
                legacyMigrationPassphrase = passphrase;
                if (!localDeviceKey) {
                    const keyRow = await dexie.kv.get('local-encryption-key-v2');
                    localDeviceKey = keyRow?.value || await ClothesManiaWorkspaceCrypto.createDeviceKey();
                    await dexie.kv.put({ key: 'local-encryption-key-v2', value: localDeviceKey });
                }
                if (pendingLegacySnapshotApply) {
                    db = unlocked.snapshot;
                    await migrateLegacyLocalBackups();
                    if (!await persistDB()) throw new Error('Migrated data could not be saved on this device. The old encrypted copy remains untouched.');
                    const persistedSnapshot = await readPersistedWorkspaceSnapshot();
                    const verified = await ClothesManiaWorkspaceCrypto.unlockDeviceSnapshot(persistedSnapshot, localDeviceKey);
                    if (!snapshotsMatch(verified, db)) throw new Error('Local migration verification failed. The original data was retained.');
                }
                document.getElementById('workspacePassphrase').value = '';
                document.getElementById('workspacePassphraseConfirmation').value = '';
                document.getElementById('localEncryptionOverlay').classList.add('hidden');
                document.getElementById('localEncryptionOverlay').classList.remove('flex');
                document.getElementById('sidebar').inert = false;
                document.getElementById('mainAppContent').inert = false;
                form.reset();
                pendingLocalSnapshot = null;
                pendingWorkspaceUnlockResolver?.(unlocked.snapshot);
                pendingWorkspaceUnlockResolver = null;
                pendingLegacySnapshotApply = false;
            } catch (error) {
                console.error('Workspace encryption or unlock failed.', error);
                showWorkspacePassphraseMessage(error.message || 'The workspace could not be unlocked safely.');
            } finally {
                submitButton.disabled = false;
            }
        }

        let pendingLegacySnapshotApply = false;

        async function initializeLocalWorkspace(storedSnapshot) {
            updateLocalSaveStatus('checking', 'Reading protected device key');
            const keyRow = await dexie.kv.get('local-encryption-key-v2');
            localDeviceKey = keyRow?.value || null;
            if (ClothesManiaWorkspaceCrypto.isEncryptedSnapshot(storedSnapshot)) {
                updateLocalSaveStatus('checking', 'Unlocking legacy local workspace');
                if (!await unlockLegacyWorkspaceSnapshot(storedSnapshot, true)) return false;
                return true;
            }
            if (ClothesManiaWorkspaceCrypto.isDeviceEncryptedSnapshot(storedSnapshot)) {
                if (!localDeviceKey) throw new Error('The protected local key is missing. Restore a known-good backup before continuing.');
                updateLocalSaveStatus('checking', 'Decrypting saved local workspace');
                db = await ClothesManiaWorkspaceCrypto.unlockDeviceSnapshot(storedSnapshot, localDeviceKey);
            } else if (storedSnapshot) {
                if (!isValidWorkspaceSnapshot(storedSnapshot)) throw new Error('Saved local data is invalid. The app stopped to avoid replacing it.');
                db = storedSnapshot;
            }
            if (!localDeviceKey) {
                updateLocalSaveStatus('checking', 'Preparing protected device storage');
                localDeviceKey = await ClothesManiaWorkspaceCrypto.createDeviceKey();
                await dexie.kv.put({ key: 'local-encryption-key-v2', value: localDeviceKey });
            }
            return true;
        }

        async function loadFromLocalStorage() {
            const todayStr = localDateKey();
            const dateInput = document.getElementById('mineDate');
            if (dateInput) dateInput.value = todayStr;
        }

        function saveToLocalStorage() {
            if (!navigator.onLine) {
                if (lastSavedWorkspaceSnapshot) db = JSON.parse(JSON.stringify(lastSavedWorkspaceSnapshot));
                refreshAllUI();
                updateCloudSyncStatus('offline');
                showToast('Offline view only. Reconnect to make changes.', true);
                return;
            }
            updateLocalSaveStatus('saving');
            localPersistPromise = persistDB().then(localSaved => {
                if (localSaved) queueCloudSnapshotSync();
                else updateLocalSaveStatus('error', 'Could not save encrypted data locally; cloud sync was not attempted');
                return localSaved;
            });
            refreshAllUI();
        }

        function auditActor() {
            const email = currentAuthUser?.email || sessionStorage.getItem('cm_local_session_email') || 'Local operator';
            const name = currentAuthUser?.user_metadata?.full_name || currentAuthUser?.user_metadata?.name || email;
            return { email, name };
        }

        function recordAuditEvent(action, entity, entityId, summary) {
            if (!Array.isArray(db.auditLogs)) db.auditLogs = [];
            const actor = auditActor();
            db.auditLogs.unshift({ id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, at: new Date().toISOString(), actor: actor.name, email: actor.email, action, entity, entityId: String(entityId || ''), summary: String(summary || '') });
            db.auditLogs = db.auditLogs.slice(0, 5000);
        }

        function moveRecordToTrash(entity, snapshot, label) {
            if (!Array.isArray(db.deletedRecords)) db.deletedRecords = [];
            const actor = auditActor();
            const entry = { id: `trash_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, entity, entityId: String(snapshot.id || snapshot.name || ''), label: String(label || ''), deletedAt: new Date().toISOString(), deletedBy: actor.name, snapshot: JSON.parse(JSON.stringify(snapshot)) };
            db.deletedRecords.unshift(entry);
            recordAuditEvent('Deleted', entity, entry.entityId, `${entry.label} moved to Trash`);
            return entry;
        }

        function setAuditView(view) {
            auditView = view === 'trash' ? 'trash' : 'activity';
            document.getElementById('auditActivityView')?.classList.toggle('hidden', auditView !== 'activity');
            document.getElementById('auditTrashView')?.classList.toggle('hidden', auditView !== 'trash');
            document.getElementById('auditActivityTab')?.classList.toggle('is-active', auditView === 'activity');
            document.getElementById('auditTrashTab')?.classList.toggle('is-active', auditView === 'trash');
            document.getElementById('auditActivityTab')?.setAttribute('aria-selected', String(auditView === 'activity'));
            document.getElementById('auditTrashTab')?.setAttribute('aria-selected', String(auditView === 'trash'));
        }

        function renderAuditLogs() {
            if (!Array.isArray(db.auditLogs)) db.auditLogs = [];
            if (!Array.isArray(db.deletedRecords)) db.deletedRecords = [];
            const activityBody = document.getElementById('auditActivityBody');
            const trashBody = document.getElementById('auditTrashBody');
            const count = document.getElementById('auditLogCount');
            const trashCount = document.getElementById('auditTrashCount');
            if (!activityBody || !trashBody) return;
            if (count) count.textContent = `${db.auditLogs.length} ${db.auditLogs.length === 1 ? 'event' : 'events'}`;
            if (trashCount) trashCount.textContent = String(db.deletedRecords.length);
            activityBody.innerHTML = db.auditLogs.length ? db.auditLogs.map(event => `<tr><td class="whitespace-nowrap px-4 py-3 text-gray-600 dark:text-gray-300">${escapeHtml(new Date(event.at).toLocaleString('en-PH'))}</td><td class="px-4 py-3"><span class="block font-medium text-gray-900 dark:text-white">${escapeHtml(event.actor || 'Local operator')}</span><span class="text-[10px] text-gray-500">${escapeHtml(event.email || '')}</span></td><td class="whitespace-nowrap px-4 py-3 font-medium text-gray-800 dark:text-gray-200">${escapeHtml(event.action || '')}</td><td class="px-4 py-3 text-gray-600 dark:text-gray-300">${escapeHtml(event.summary || '')}</td></tr>`).join('') : '<tr><td colspan="4" class="px-4 py-10 text-center text-sm text-gray-500">No activity has been recorded yet.</td></tr>';
            trashBody.innerHTML = db.deletedRecords.length ? db.deletedRecords.map(item => `<tr><td class="whitespace-nowrap px-4 py-3 text-gray-600 dark:text-gray-300">${escapeHtml(new Date(item.deletedAt).toLocaleString('en-PH'))}</td><td class="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">${escapeHtml(item.entity)}</td><td class="px-4 py-3 text-gray-700 dark:text-gray-300">${escapeHtml(item.label)}</td><td class="px-4 py-3 text-gray-600 dark:text-gray-300">${escapeHtml(item.deletedBy || 'Local operator')}</td><td class="px-4 py-3 text-right"><button type="button" onclick="restoreDeletedRecord('${encodeURIComponent(item.id)}')" class="btn-outline px-3 py-1.5 text-xs"><i class="fa-solid fa-rotate-left mr-1" aria-hidden="true"></i>Restore</button></td></tr>`).join('') : '<tr><td colspan="5" class="px-4 py-10 text-center text-sm text-gray-500">Trash is empty. Deleted recoverable records will appear here.</td></tr>';
            setAuditView(auditView);
        }

        function restoreDeletedRecord(encodedId) {
            const id = decodeURIComponent(encodedId);
            const index = (db.deletedRecords || []).findIndex(item => item.id === id);
            if (index < 0) return;
            const item = db.deletedRecords[index];
            const snapshot = JSON.parse(JSON.stringify(item.snapshot));
            if (item.entity === 'Live session') {
                const session = (db.liveSessions || []).find(entry => entry.id === item.entityId);
                if (!session) return showToast('The original session is missing; restore was not applied.', true);
                delete session.deletedAt;
                delete session.deletedBy;
                if (session.status === 'deleted') session.status = session.endedAt ? 'ended' : 'active';
                if (session.status === 'active' && session.date === localDateKey()) {
                    activeLiveSessionId = session.id;
                    db.activeLiveSessionId = session.id;
                    mineSessionView = session.id;
                }
            } else if (item.entity === 'Product') {
                if ((db.shirts || []).some(entry => entry.id === snapshot.id)) return showToast('A product with this ID already exists. Nothing was overwritten.', true);
                db.shirts.unshift(snapshot);
            } else if (item.entity === 'Mine order') {
                if ((db.mines || []).some(entry => entry.id === snapshot.id)) return showToast('An order with this ID already exists. Nothing was overwritten.', true);
                db.mines.unshift(snapshot);
            } else if (item.entity === 'Live seller') {
                if (!Array.isArray(db.hosts)) db.hosts = [];
                if (db.hosts.some(entry => String(typeof entry === 'string' ? entry : entry?.name || '').toUpperCase() === String(snapshot.name || '').toUpperCase())) return showToast('A seller with this name already exists. Nothing was overwritten.', true);
                db.hosts.push(snapshot);
                db.deletedHosts = (db.deletedHosts || []).filter(name => String(name || '').toUpperCase() !== String(snapshot.name || '').toUpperCase());
            } else return showToast('This record type cannot be restored yet.', true);
            db.deletedRecords.splice(index, 1);
            recordAuditEvent('Restored', item.entity, item.entityId, `${item.label} restored from Trash`);
            saveToLocalStorage();
            showToast(`${item.label} restored.`);
        }

        function requestDeleteLiveSession(encodedId) {
            const session = (db.liveSessions || []).find(item => item.id === decodeURIComponent(encodedId));
            if (!session || session.deletedAt) return;
            pendingLiveSessionDeleteId = session.id;
            document.getElementById('deleteLiveSessionDescription').textContent = `Confirm deletion of “${session.name}”. Its ${(db.mines || []).filter(mine => mine.sessionId === session.id).length} linked orders remain preserved in reports.`;
            const emailInput = document.getElementById('liveSessionDeleteEmail');
            emailInput.value = sessionStorage.getItem('cm_local_session_email') || localStorage.getItem('cm_local_remembered_email') || '';
            document.getElementById('liveSessionDeletePassword').value = '';
            document.getElementById('liveSessionDeleteError').classList.add('hidden');
            document.getElementById('modalDeleteLiveSession').classList.remove('hidden');
            document.getElementById('modalDeleteLiveSession').classList.add('flex');
            setTimeout(() => (emailInput.value ? document.getElementById('liveSessionDeletePassword') : emailInput).focus(), 0);
        }

        function closeDeleteLiveSession() {
            const modal = document.getElementById('modalDeleteLiveSession');
            modal.classList.add('hidden');
            modal.classList.remove('flex');
            document.getElementById('liveSessionDeletePassword').value = '';
            pendingLiveSessionDeleteId = null;
        }

        async function confirmDeleteLiveSession(event) {
            event.preventDefault();
            const email = document.getElementById('liveSessionDeleteEmail').value.trim().toLowerCase();
            const password = document.getElementById('liveSessionDeletePassword').value;
            const error = document.getElementById('liveSessionDeleteError');
            const signedInEmail = sessionStorage.getItem('cm_local_session_email');
            try {
                if (signedInEmail && signedInEmail !== email) throw new Error('Use the email for the account currently signed in on this device.');
                const account = readLocalAccounts().find(item => item.email === email);
                if (!account || !localPasswordsMatch(account.passwordHash, await hashLocalPassword(password, account.salt))) throw new Error('Admin email or password is incorrect.');
                const session = (db.liveSessions || []).find(item => item.id === pendingLiveSessionDeleteId);
                if (!session || session.deletedAt) return closeDeleteLiveSession();
                moveRecordToTrash('Live session', session, session.name || 'Live session');
                session.deletedAt = new Date().toISOString();
                session.deletedBy = account.name || account.email;
                session.status = 'deleted';
                if (activeLiveSessionId === session.id) activeLiveSessionId = null;
                if (db.activeLiveSessionId === session.id) db.activeLiveSessionId = null;
                if (mineSessionView === session.id) mineSessionView = '__history__';
                closeDeleteLiveSession();
                saveToLocalStorage();
                showToast('Live session moved to Audit Logs trash.');
            } catch (verificationError) {
                error.textContent = verificationError.message || 'Could not verify the admin account.';
                error.classList.remove('hidden');
            }
        }

        function localDateKey(date = new Date()) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        }

        function initializeLiveSessionState() {
            if (!Array.isArray(db.liveSessions)) db.liveSessions = [];
            const today = localDateKey();
            const todaySessions = db.liveSessions
                .filter(session => session.date === today && isLiveSessionActive(session))
                .sort((a, b) => String(b.startedAt || '').localeCompare(String(a.startedAt || '')));
            const savedSession = todaySessions.find(session => session.id === db.activeLiveSessionId);
            const currentSession = savedSession || todaySessions[0] || null;
            activeLiveSessionId = currentSession ? currentSession.id : null;
            mineSessionView = currentSession ? currentSession.id : '__new__';
            if (currentSession) db.activeLiveSessionId = currentSession.id;
        }

        function getActiveLiveSession() {
            return (db.liveSessions || []).find(session => session.id === activeLiveSessionId && session.date === localDateKey() && isLiveSessionActive(session)) || null;
        }

        function isLiveSessionActive(session) {
            return session ? (session.status ? session.status === 'active' : !session.endedAt) : false;
        }

        function formatLiveSessionTimestamp(session) {
            const timestamp = new Date(session.startedAt || session.endedAt || `${session.date}T00:00:00`);
            if (Number.isNaN(timestamp.getTime())) return escapeHtml(session.date || 'Date unavailable');
            const sessionDate = session.date || localDateKey(timestamp);
            const weekday = new Date(`${sessionDate}T12:00:00`).toLocaleDateString('en-PH', { weekday: 'long' });
            const time = timestamp.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' });
            return `${weekday}, ${escapeHtml(sessionDate)} · ${escapeHtml(time)}`;
        }

        function startLiveSession() {
            const hour = new Date().getHours();
            const defaultName = hour >= 12 && hour < 17 ? 'Afternoon Live' : hour >= 17 ? 'Evening Live' : 'Morning Live';
            liveSessionReturnFocus = document.activeElement;
            const modal = document.getElementById('modalLiveSession');
            const input = document.getElementById('liveSessionName');
            input.value = defaultName;
            modal.classList.remove('hidden');
            setTimeout(() => {
                input.focus();
                input.select();
            }, 0);
        }

        function closeLiveSessionModal(sessionCreated = false) {
            document.getElementById('modalLiveSession').classList.add('hidden');
            if (liveSessionReturnFocus && liveSessionReturnFocus.isConnected) liveSessionReturnFocus.focus();
            liveSessionReturnFocus = null;
            if (!sessionCreated) {
                resumeMineAfterSessionStart = false;
                openMineAfterSessionStart = false;
                pendingQuickMineShirtId = null;
            }
        }

        function saveLiveSession(event) {
            event.preventDefault();
            const nameInput = document.getElementById('liveSessionName');
            const name = nameInput.value.trim();
            if (!name) {
                nameInput.focus();
                return;
            }
            const now = new Date();
            const session = {
                id: `session_${now.getTime()}_${Math.random().toString(36).slice(2, 7)}`,
                name,
                date: localDateKey(now),
                startedAt: now.toISOString(),
                status: 'active',
                endedAt: null
            };
            db.liveSessions.unshift(session);
            session.createdBy = auditActor().name;
            recordAuditEvent('Started live session', 'Live session', session.id, `${session.name} started`);
            activeLiveSessionId = session.id;
            mineSessionView = session.id;
            mineFilterTab = 'ALL';
            db.activeLiveSessionId = session.id;
            closeLiveSessionModal(true);
            saveToLocalStorage();
            showToast(`${session.name} started. New mines will appear in this tab.`);
            if (resumeMineAfterSessionStart) {
                resumeMineAfterSessionStart = false;
                document.getElementById('formMineOrder').requestSubmit();
            } else if (openMineAfterSessionStart) {
                openMineAfterSessionStart = false;
                openNewMineModal();
            } else if (pendingQuickMineShirtId) {
                const shirtId = pendingQuickMineShirtId;
                pendingQuickMineShirtId = null;
                quickMineShirt(shirtId);
            }
        }

        function selectMineSession(sessionId) {
            mineSessionView = sessionId;
            mineFilterTab = sessionId === '__item_status__' ? 'ITEM_STATUS:ALL' : 'ALL';
            const selectedSession = (db.liveSessions || []).find(session => session.id === sessionId);
            if (selectedSession && isLiveSessionActive(selectedSession)) {
                activeLiveSessionId = sessionId;
                db.activeLiveSessionId = sessionId;
            }
            renderFullMinesTable();
        }

        async function endLiveSession() {
            const session = (db.liveSessions || []).find(item => item.id === mineSessionView && isLiveSessionActive(item));
            if (!session) return;
            if (!await showAppConfirm('End this live session?', `End “${session.name}”? Its orders will be saved in History, and new mines will go into a new session.`, 'End session', true)) return;
            session.status = 'ended';
            session.endedAt = new Date().toISOString();
            session.endedBy = auditActor().name;
            recordAuditEvent('Ended live session', 'Live session', session.id, `${session.name} ended`);
            if (activeLiveSessionId === session.id) activeLiveSessionId = null;
            if (db.activeLiveSessionId === session.id) db.activeLiveSessionId = null;
            mineSessionView = '__history__';
            mineFilterTab = 'ALL';
            saveToLocalStorage();
            showToast(`${session.name} ended and saved to History.`);
        }

        function showToast(msg, isError = false) {
            const toast = document.getElementById('toastNotification');
            const messageEl = document.getElementById('toastMessage');
            const iconEl = document.getElementById('toastIcon');
            messageEl.innerText = msg;
            iconEl.className = isError ? "fa-solid fa-circle-exclamation text-rose-400 text-base" : "fa-solid fa-circle-check text-emerald-400 text-base";
            toast.classList.remove('translate-y-24', 'opacity-0');
            setTimeout(() => {
                toast.classList.add('translate-y-24', 'opacity-0');
            }, 2500);
        }

        function startHeaderClock() {
            const dateEl = document.getElementById('headerDateStr');
            if (!dateEl) return;
            const updateClock = () => {
                const now = new Date();
                const date = now.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
                const time = now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                dateEl.textContent = `${date} · ${time}`;
            };
            updateClock();
            window.setInterval(updateClock, 1000);
        }

        function initSidebar() {
            const sidebar = document.getElementById('sidebar');
            let collapsed = false;
            try { collapsed = localStorage.getItem('cm_sidebar_collapsed') === 'true'; } catch (error) {}
            sidebar.classList.toggle('sidebar-collapsed', collapsed);
            const toggle = document.getElementById('sidebarBrandExpand');
            const icon = document.getElementById('sidebarBrandIcon');
            toggle?.setAttribute('aria-expanded', String(!collapsed));
            toggle?.setAttribute('aria-label', collapsed ? 'Expand sidebar' : 'Collapse sidebar');
            if (toggle) toggle.title = collapsed ? 'Expand sidebar' : 'Collapse sidebar';
            if (icon) icon.className = collapsed ? 'fa-solid fa-angles-right text-sm' : 'fa-solid fa-angles-left text-sm';
        }

        function toggleSidebar() {
            const sidebar = document.getElementById('sidebar');
            const collapsed = sidebar.classList.toggle('sidebar-collapsed');
            const toggle = document.getElementById('sidebarBrandExpand');
            const icon = document.getElementById('sidebarBrandIcon');
            toggle?.setAttribute('aria-expanded', String(!collapsed));
            toggle?.setAttribute('aria-label', collapsed ? 'Expand sidebar' : 'Collapse sidebar');
            if (toggle) toggle.title = collapsed ? 'Expand sidebar' : 'Collapse sidebar';
            if (icon) icon.className = collapsed ? 'fa-solid fa-angles-right text-sm' : 'fa-solid fa-angles-left text-sm';
            try { localStorage.setItem('cm_sidebar_collapsed', String(collapsed)); } catch (error) {}
        }

        function toggleAdminMenu() {
            const menu = document.getElementById('adminMenu');
            const button = document.getElementById('adminMenuButton');
            const open = menu.classList.contains('hidden');
            menu.classList.toggle('hidden', !open);
            button.setAttribute('aria-expanded', String(open));
            if (open) menu.querySelector('[role="menuitem"]')?.focus();
        }

        function closeAdminMenu() {
            document.getElementById('adminMenu').classList.add('hidden');
            document.getElementById('adminMenuButton').setAttribute('aria-expanded', 'false');
        }

        function toggleMobileSidebar(forceOpen) {
            const sidebar = document.getElementById('sidebar');
            const backdrop = document.getElementById('sidebarBackdrop');
            const toggle = document.getElementById('mobileSidebarToggle');
            if (!window.matchMedia('(max-width: 767px)').matches) return;
            const open = typeof forceOpen === 'boolean' ? forceOpen : !sidebar.classList.contains('mobile-open');
            sidebar.classList.toggle('mobile-open', open);
            sidebar.classList.toggle('hidden', !open);
            backdrop.classList.toggle('hidden', !open);
            toggle?.setAttribute('aria-expanded', String(open));
            toggle?.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
            if (open) sidebar.querySelector('.nav-btn')?.focus();
        }

        function togglePasswordVisibility(inputId, button) {
            const input = document.getElementById(inputId);
            if (!input || !button) return;
            const showPassword = input.type === 'password';
            input.type = showPassword ? 'text' : 'password';
            button.setAttribute('aria-label', showPassword ? 'Hide password' : 'Show password');
            button.setAttribute('aria-pressed', String(showPassword));
            const icon = button.querySelector('i');
            if (icon) icon.className = showPassword ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye';
        }

        function resetPasswordVisibility() {
            document.querySelectorAll('#localSessionOverlay input[type="text"][autocomplete="current-password"], #localSessionOverlay input[type="text"][autocomplete="new-password"]').forEach(input => {
                input.type = 'password';
                const button = document.querySelector(`[aria-controls="${input.id}"]`);
                if (button) {
                    button.setAttribute('aria-label', 'Show password');
                    button.setAttribute('aria-pressed', 'false');
                    const icon = button.querySelector('i');
                    if (icon) icon.className = 'fa-solid fa-eye';
                }
            });
        }

        function getAdminPasswordValidationMessage(password = '') {
            if (password.length < 14) return 'Use at least 14 characters.';
            if (!/[a-z]/.test(password)) return 'Add at least one lowercase letter.';
            if (!/[A-Z]/.test(password)) return 'Add at least one uppercase letter.';
            if (!/[0-9]/.test(password)) return 'Add at least one number.';
            if (!/[^A-Za-z0-9\s]/.test(password)) return 'Add at least one symbol, such as ! or #.';
            return '';
        }

        function showLocalSessionScreen(mode = 'signin', message = '', messageType = 'error') {
            resetPasswordVisibility();
            const overlay = document.getElementById('localSessionOverlay');
            const screens = {
                signin: ['localSignInForm', 'localSessionTitle', 'localSessionDescription', 'localLoginEmail'],
                signup: ['localSignUpForm', 'localSignUpTitle', 'localSignUpDescription', 'localSignUpName'],
                'forgot-password': ['localForgotPasswordForm', 'localForgotPasswordTitle', 'localForgotPasswordDescription', 'localResetEmail'],
                'reset-password': ['localPasswordRecoveryForm', 'localPasswordRecoveryTitle', 'localPasswordRecoveryDescription', 'localNewPassword']
            };
            const [activeForm, labelledBy, describedBy, focusId] = screens[mode] || screens.signin;
            const messageEl = document.getElementById('localAuthMessage');
            ['localSignInForm', 'localSignUpForm', 'localForgotPasswordForm', 'localPasswordRecoveryForm'].forEach(id => {
                document.getElementById(id).classList.toggle('hidden', id !== activeForm);
            });
            overlay.setAttribute('aria-labelledby', labelledBy);
            overlay.setAttribute('aria-describedby', describedBy);
            messageEl.textContent = message;
            messageEl.classList.toggle('hidden', !message);
            messageEl.classList.toggle('bg-rose-50', Boolean(message) && messageType === 'error');
            messageEl.classList.toggle('text-rose-700', Boolean(message) && messageType === 'error');
            messageEl.classList.toggle('dark:bg-rose-950/30', Boolean(message) && messageType === 'error');
            messageEl.classList.toggle('dark:text-rose-200', Boolean(message) && messageType === 'error');
            messageEl.classList.toggle('bg-emerald-50', Boolean(message) && messageType === 'success');
            messageEl.classList.toggle('text-emerald-800', Boolean(message) && messageType === 'success');
            messageEl.classList.toggle('dark:bg-emerald-950/30', Boolean(message) && messageType === 'success');
            messageEl.classList.toggle('dark:text-emerald-200', Boolean(message) && messageType === 'success');
            overlay.classList.remove('hidden');
            overlay.classList.add('flex');
            document.getElementById('sidebar').inert = true;
            document.getElementById('mainAppContent').inert = true;
            document.getElementById(focusId)?.focus();
        }

        function finishLocalSignIn(email, remember = false) {
            try {
                sessionStorage.setItem('cm_local_session_signed_in', 'true');
                sessionStorage.setItem('cm_local_session_email', email);
                sessionStorage.removeItem('cm_local_session_signed_out');
                localStorage.removeItem('cm_local_remembered_email');
                if (remember && currentAuthUser) {
                    localStorage.setItem('cm_pos_offline_session_allowed_v1', 'true');
                    localStorage.setItem('cm_pos_offline_authorized_user_v1', JSON.stringify({
                        id: currentAuthUser.id,
                        email: currentAuthUser.email || email,
                        user_metadata: currentAuthUser.user_metadata || {}
                    }));
                } else {
                    localStorage.removeItem('cm_pos_offline_session_allowed_v1');
                    localStorage.removeItem('cm_pos_offline_authorized_user_v1');
                }
            } catch (error) {
                console.error('Could not save the local sign-in state.', error);
                showLocalSessionScreen('signin', 'This browser could not save your sign-in. Check its storage settings and try again.');
                return;
            }
            document.getElementById('sidebar').inert = false;
            document.getElementById('mainAppContent').inert = false;
            const overlay = document.getElementById('localSessionOverlay');
            overlay.classList.add('hidden');
            overlay.classList.remove('flex');
            const name = currentAuthUser?.user_metadata?.full_name || currentAuthUser?.user_metadata?.name || 'Admin';
            document.getElementById('adminAccountName').textContent = name;
            document.getElementById('dashboardWelcomeTitle').textContent = `Welcome back, ${name} 👋`;
            document.getElementById('adminAccountEmail').textContent = currentAuthUser?.email || email;
            document.getElementById('adminAccountBadge').textContent = navigator.onLine ? 'CLOUD' : 'OFFLINE';
            setOfflineViewMode(!navigator.onLine);
            updateCloudSyncStatus(navigator.onLine ? 'checking' : 'offline');
            const tabIds = ['dashboard', 'products', 'stock', 'mines', 'reports', 'hosts', 'audit'];
            let lastTab = 'dashboard';
            try {
                const savedTab = localStorage.getItem('cm_pos_last_tab');
                if (tabIds.includes(savedTab)) lastTab = savedTab;
            } catch (error) {
                console.error('Could not restore the last page.', error);
            }
            switchTab(lastTab);
            const focusTarget = window.matchMedia('(max-width: 767px)').matches ? document.getElementById(`nav-${lastTab}`) : document.getElementById('sidebarBrandExpand');
            focusTarget?.focus();
        }

        function showAuthTransition(title, message, signingOut = false) {
            const overlay = document.getElementById('authTransitionModal');
            document.getElementById('authTransitionTitle').textContent = title;
            document.getElementById('authTransitionMessage').textContent = message;
            document.getElementById('authTransitionIcon').className = signingOut
                ? 'fa-solid fa-arrow-right-from-bracket text-lg'
                : 'fa-solid fa-arrow-right-to-bracket text-lg';
            overlay.classList.remove('hidden');
            overlay.classList.add('flex');
            document.getElementById('sidebar').inert = true;
            document.getElementById('mainAppContent').inert = true;
        }

        function hideAuthTransition() {
            const overlay = document.getElementById('authTransitionModal');
            overlay.classList.add('hidden');
            overlay.classList.remove('flex');
        }

        function waitFor(milliseconds) {
            return new Promise(resolve => window.setTimeout(resolve, milliseconds));
        }

        async function hashInvitationCode(code) {
            const bytes = new TextEncoder().encode(code.trim().toLowerCase());
            const digest = await crypto.subtle.digest('SHA-256', bytes);
            return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
        }

        async function acceptPendingAdminInvite(client) {
            let invite;
            try { invite = JSON.parse(localStorage.getItem('cm_pos_pending_admin_invite_v1') || 'null'); }
            catch (error) { console.error('Could not read the pending admin invitation.', error); }
            const tokenHash = invite?.tokenHash || currentAuthUser?.user_metadata?.workspace_invite_hash;
            if (!tokenHash) return;
            if (invite?.email && invite.email.toLowerCase() !== (currentAuthUser?.email || '').toLowerCase()) {
                throw new Error(`This invitation is for ${invite.email}. Sign in using that email address.`);
            }
            const { data: existingWorkspaceOwner, error: membershipError } = await client.rpc('current_pos_workspace_owner');
            if (membershipError) throw membershipError;
            if (existingWorkspaceOwner) {
                localStorage.removeItem('cm_pos_pending_admin_invite_v1');
                await client.auth.updateUser({ data: { workspace_invite_hash: null } });
                return;
            }
            const { error } = await client.rpc('accept_pos_admin_invite', { p_token_hash: tokenHash });
            if (error) throw error;
            localStorage.removeItem('cm_pos_pending_admin_invite_v1');
            const { data, error: metadataError } = await client.auth.updateUser({ data: { workspace_invite_hash: null } });
            if (!metadataError && data?.user) currentAuthUser = data.user;
        }

        async function ensureCloudWorkspaceMembership(client) {
            if (!localWorkspaceReady) throw new Error('Protected local records are unavailable. Restore a known-good local backup before signing in on this device.');
            await acceptPendingAdminInvite(client);
            const initialSnapshot = JSON.parse(JSON.stringify(db));
            const result = await invokeWorkspaceSync(client, { action: 'ensure', snapshot: initialSnapshot });
            cloudWorkspaceOwnerId = result.workspaceOwnerId;
            return result.workspaceOwnerId;
        }

        function friendlySignInError(error) {
            const message = String(error?.message || '').toLowerCase();
            if (/weak[_ ]password|password.{0,60}(strength|requirement|character|uppercase|lowercase|number|symbol)/.test(message)) {
                return 'Your password needs to be updated before you can sign in. Use “Forgot password?” to choose a stronger one.';
            }
            if (/invalid login credentials|invalid email or password|email or password/.test(message)) {
                return 'That email and password do not match. If you have not joined the store account yet, ask an administrator for an invitation.';
            }
            if (!navigator.onLine || /network|fetch failed|failed to fetch|timed out|timeout|connection/.test(message)) {
                return 'We could not reach the sign-in service. Check your internet connection and try again.';
            }
            if (/not connected|not authorized|membership|invitation|invite|workspace|store access/.test(message)) {
                return 'This account is not connected to the store yet. Ask an administrator to check your access.';
            }
            if (/too many requests|rate limit/.test(message)) {
                return 'There have been too many sign-in attempts. Wait a few minutes, then try again.';
            }
            if (/email not confirmed|confirm your email/.test(message)) {
                return 'Please confirm your email address, then try signing in again.';
            }
            return 'We could not sign you in. Check your details and internet connection, then try again. If it keeps happening, ask an administrator for help.';
        }

        async function handlePasswordResetRequest(event) {
            event.preventDefault();
            const email = event.currentTarget.elements.email.value.trim().toLowerCase();
            try {
                if (!navigator.onLine) throw new Error('Connect to the internet to request a password reset.');
                const client = await getSupabaseClient();
                const { error } = await client.auth.resetPasswordForEmail(email, {
                    redirectTo: `${window.location.origin}${window.location.pathname}`
                });
                if (error) throw error;
                showLocalSessionScreen('forgot-password', 'If an account exists for that email, a password-reset link has been sent.', 'success');
            } catch (error) {
                console.error('Password reset request failed.', error);
                showLocalSessionScreen('forgot-password', error.message || 'Could not send a reset link. Check your connection and try again.');
            }
        }

        async function handlePasswordRecovery(event) {
            event.preventDefault();
            const password = event.currentTarget.elements.password.value;
            const confirmation = event.currentTarget.elements.confirmPassword.value;
            const passwordMessage = getAdminPasswordValidationMessage(password);
            if (passwordMessage) {
                showLocalSessionScreen('reset-password', passwordMessage);
                return;
            }
            if (password !== confirmation) {
                showLocalSessionScreen('reset-password', 'Those passwords do not match. Please try again.');
                return;
            }
            try {
                const client = await getSupabaseClient();
                const { error } = await client.auth.updateUser({ password });
                if (error) throw error;
                const { error: signOutError } = await client.auth.signOut();
                if (signOutError) console.error('Password changed, but the recovery session could not be closed.', signOutError);
                currentAuthUser = null;
                passwordRecoveryPending = false;
                window.history.replaceState({}, document.title, `${window.location.pathname}${window.location.search}`);
                showLocalSessionScreen('signin', 'Your password has been updated. Sign in with your new password.', 'success');
            } catch (error) {
                console.error('Password update failed.', error);
                const message = /weak[_ ]password|password.{0,60}(strength|requirement|character|uppercase|lowercase|number|symbol)/i.test(error.message || '')
                    ? 'Choose a stronger password with 14+ characters, uppercase and lowercase letters, a number, and a symbol.'
                    : error.message || 'Could not update your password. Request a new reset link.';
                showLocalSessionScreen('reset-password', message);
            }
        }

        async function handleLocalSignIn(event) {
            event.preventDefault();
            if (!localWorkspaceReady) {
                showLocalSessionScreen('signin', 'Protected local records are unavailable. Restore a known-good local backup before signing in on this device.');
                return;
            }
            const form = event.currentTarget;
            const email = form.elements.email.value.trim().toLowerCase();
            const password = form.elements.password.value;
            try {
                if (!navigator.onLine) throw new Error('Connect to the internet to sign in. Previously authorized devices can reopen the saved workspace offline.');
                showAuthTransition('Signing in', 'Connecting securely to your workspace…');
                const client = await getSupabaseClient();
                const { data, error } = await client.auth.signInWithPassword({ email, password });
                if (error) throw error;
                currentAuthUser = data.user;
                await ensureCloudWorkspaceMembership(client);
                localStorage.removeItem('cm-pos-supabase-auth-v1');
                await waitFor(5000);
                hideAuthTransition();
                finishLocalSignIn(email, document.getElementById('localRememberMe').checked);
                await syncCloudWorkspace();
            } catch (error) {
                console.error('Supabase sign-in failed.', error);
                hideAuthTransition();
                if (currentAuthUser) {
                    try { await (await getSupabaseClient()).auth.signOut(); } catch (signOutError) { console.error('Could not clear the rejected sign-in.', signOutError); }
                    currentAuthUser = null;
                }
                showLocalSessionScreen('signin', friendlySignInError(error));
            }
        }

        async function handleLocalSignUp(event) {
            event.preventDefault();
            if (!localWorkspaceReady) {
                showLocalSessionScreen('signin', 'Protected local records are unavailable. Restore a known-good local backup before creating an account on this device.');
                return;
            }
            const form = event.currentTarget;
            const name = form.elements.name.value.trim();
            const email = form.elements.email.value.trim().toLowerCase();
            const password = form.elements.password.value;
            const confirmPassword = form.elements.confirmPassword.value;
            const inviteCode = form.elements.inviteCode.value.trim().toLowerCase();
            const passwordMessage = getAdminPasswordValidationMessage(password);
            if (passwordMessage) {
                showLocalSessionScreen('signup', passwordMessage);
                return;
            }
            if (password !== confirmPassword) {
                showLocalSessionScreen('signup', 'Those passwords do not match. Please try again.');
                return;
            }
            try {
                if (!navigator.onLine) throw new Error('Connect to the internet to create a Supabase account.');
                showAuthTransition('Creating account', 'Setting up your secure workspace…');
                const client = await getSupabaseClient();
                const tokenHash = await hashInvitationCode(inviteCode);
                const { data: inviteIsValid, error: inviteCheckError } = await client.rpc('validate_pos_admin_invite', {
                    p_email: email,
                    p_token_hash: tokenHash
                });
                if (inviteCheckError) throw inviteCheckError;
                if (!inviteIsValid) throw new Error('That invitation is invalid or expired. Ask an admin to create a new one for this email.');
                localStorage.setItem('cm_pos_pending_admin_invite_v1', JSON.stringify({ tokenHash, email }));
                const { data, error } = await client.auth.signUp({
                    email,
                    password,
                    options: { data: { full_name: name, workspace_invite_hash: tokenHash } }
                });
                if (error) throw error;
                if (!data.session || !data.user) {
                    hideAuthTransition();
                    showLocalSessionScreen('signin', 'Check your email to confirm your account, then sign in.', 'success');
                    return;
                }
                currentAuthUser = data.user;
                await ensureCloudWorkspaceMembership(client);
                await waitFor(900);
                hideAuthTransition();
                finishLocalSignIn(email, true);
                await syncCloudWorkspace();
            } catch (error) {
                console.error('Supabase account creation failed.', error);
                hideAuthTransition();
                if (currentAuthUser) {
                    try { await (await getSupabaseClient()).auth.signOut(); } catch (signOutError) { console.error('Could not clear the rejected new account session.', signOutError); }
                    currentAuthUser = null;
                }
                const message = /weak[_ ]password|password.{0,60}(strength|requirement|character|uppercase|lowercase|number|symbol)/i.test(error.message || '')
                    ? 'Choose a stronger password with 14+ characters, uppercase and lowercase letters, a number, and a symbol.'
                    : error.message || 'Could not create the account. Check your connection and try again.';
                showLocalSessionScreen('signup', message);
            }
        }

        function showAdminAccessMessage(message, isError = false) {
            const element = document.getElementById('adminAccessMessage');
            element.textContent = message;
            element.classList.remove('hidden', 'bg-rose-50', 'text-rose-700', 'bg-emerald-50', 'text-emerald-800', 'dark:bg-rose-950/30', 'dark:text-rose-200', 'dark:bg-emerald-950/30', 'dark:text-emerald-200');
            element.classList.add(isError ? 'bg-rose-50' : 'bg-emerald-50', isError ? 'text-rose-700' : 'text-emerald-800', isError ? 'dark:bg-rose-950/30' : 'dark:bg-emerald-950/30', isError ? 'dark:text-rose-200' : 'dark:text-emerald-200');
        }

        async function refreshAdminAccessList() {
            const list = document.getElementById('adminAccessList');
            list.textContent = 'Loading admin accounts…';
            const client = await getSupabaseClient();
            const { data, error } = await client.rpc('list_pos_workspace_admins');
            if (error) throw error;
            list.replaceChildren();
            const admins = data || [];
            const pending = Number(admins[0]?.pending_invites || 0);
            const capacity = admins.length + pending;
            admins.forEach(admin => {
                const row = document.createElement('div');
                row.className = 'flex items-center justify-between gap-3 px-3 py-3';
                const identity = document.createElement('div');
                identity.className = 'min-w-0';
                const name = document.createElement('p');
                name.className = 'truncate text-sm font-semibold';
                name.textContent = admin.full_name || admin.email || 'Admin';
                const email = document.createElement('p');
                email.className = 'truncate text-xs text-muted-foreground';
                email.textContent = admin.email || '';
                identity.append(name, email);
                const role = document.createElement('span');
                role.className = 'shrink-0 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-semibold capitalize text-amber-800 dark:text-amber-300';
                role.textContent = admin.role;
                row.append(identity, role);
                list.append(row);
            });
            if (pending) {
                const row = document.createElement('div');
                row.className = 'px-3 py-2 text-xs text-muted-foreground';
                row.textContent = `${pending} pending invite${pending === 1 ? '' : 's'} · each reserves one of five seats`;
                list.append(row);
            }
            const capacityLabel = document.createElement('div');
            capacityLabel.className = 'border-t border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground';
            capacityLabel.textContent = `${capacity} of 5 admin seats used`;
            list.append(capacityLabel);
            document.getElementById('createAdminInviteButton').disabled = capacity >= 5;
            document.getElementById('createAdminInviteButton').classList.toggle('opacity-50', capacity >= 5);
        }

        async function openAdminAccessModal() {
            const modal = document.getElementById('adminAccessModal');
            modal.classList.remove('hidden');
            modal.classList.add('flex');
            document.getElementById('adminInviteResult').classList.add('hidden');
            document.getElementById('adminAccessMessage').classList.add('hidden');
            try {
                await refreshAdminAccessList();
            } catch (error) {
                console.error('Could not load admin accounts.', error);
                showAdminAccessMessage(error.message || 'Could not load admin accounts.', true);
                document.getElementById('adminAccessList').textContent = 'Admin list is unavailable.';
            }
            document.getElementById('newAdminEmail').focus();
        }

        function closeAdminAccessModal() {
            const modal = document.getElementById('adminAccessModal');
            modal.classList.add('hidden');
            modal.classList.remove('flex');
            document.getElementById('adminMenuButton')?.focus();
        }

        async function createAdminInvitation(event) {
            event.preventDefault();
            const email = document.getElementById('newAdminEmail').value.trim().toLowerCase();
            const button = document.getElementById('createAdminInviteButton');
            button.disabled = true;
            try {
                const bytes = crypto.getRandomValues(new Uint8Array(20));
                const code = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
                const tokenHash = await hashInvitationCode(code);
                const client = await getSupabaseClient();
                const { error } = await client.rpc('create_pos_admin_invite', {
                    p_email: email,
                    p_token_hash: tokenHash
                });
                if (error) throw error;
                document.getElementById('adminInviteCode').value = code;
                document.getElementById('adminInviteResult').classList.remove('hidden');
                document.getElementById('newAdminEmail').value = '';
                showAdminAccessMessage(`Invitation created for ${email}. Share the code securely; it expires in 24 hours.`);
                await refreshAdminAccessList();
            } catch (error) {
                console.error('Could not create admin invitation.', error);
                showAdminAccessMessage(error.message || 'Could not create the invitation.', true);
                try { await refreshAdminAccessList(); } catch (refreshError) { console.error('Could not refresh admin accounts.', refreshError); }
            } finally {
                button.disabled = false;
                if (Number(document.querySelector('#adminAccessList .border-t')?.textContent.match(/^(\d+)/)?.[1] || 0) >= 5) button.disabled = true;
            }
        }

        async function copyAdminInviteCode() {
            const code = document.getElementById('adminInviteCode').value;
            try {
                await navigator.clipboard.writeText(code);
                showAdminAccessMessage('Invitation code copied. Share it only with the invited admin.');
            } catch (error) {
                console.error('Could not copy the invitation code.', error);
                showAdminAccessMessage('Copy is unavailable in this browser. Select and copy the code manually.', true);
            }
        }

        function showAppDialog({ title, message, confirmLabel = 'Confirm', destructive = false, inputLabel = '', defaultValue = '' }) {
            return new Promise(resolve => {
                if (appDialogResolver) finishAppDialog(null);
                const overlay = document.getElementById('appDialogOverlay');
                const inputWrap = document.getElementById('appDialogInputWrap');
                const input = document.getElementById('appDialogInput');
                const confirmButton = document.getElementById('appDialogConfirmButton');
                appDialogResolver = resolve;
                appDialogPreviousFocus = document.activeElement;
                appDialogInputMode = Boolean(inputLabel);
                overlay.setAttribute('role', appDialogInputMode ? 'dialog' : 'alertdialog');
                document.getElementById('appDialogTitle').textContent = title;
                document.getElementById('appDialogMessage').textContent = message;
                inputWrap.classList.toggle('hidden', !appDialogInputMode);
                document.getElementById('appDialogInputLabel').textContent = inputLabel;
                input.value = defaultValue;
                input.required = appDialogInputMode;
                confirmButton.textContent = confirmLabel;
                confirmButton.className = destructive
                    ? 'btn-destructive min-h-10 rounded-lg px-4 text-sm font-semibold'
                    : 'btn-primary min-h-10 rounded-lg px-4 text-sm font-semibold';
                const icon = document.getElementById('appDialogIcon');
                icon.className = destructive
                    ? 'mb-4 grid h-11 w-11 place-items-center rounded-xl bg-rose-500/10 text-rose-700 dark:text-rose-300'
                    : 'mb-4 grid h-11 w-11 place-items-center rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-300';
                icon.innerHTML = `<i class="fa-solid ${appDialogInputMode ? 'fa-user' : destructive ? 'fa-triangle-exclamation' : 'fa-circle-exclamation'}" aria-hidden="true"></i>`;
                overlay.classList.remove('hidden');
                overlay.classList.add('flex');
                requestAnimationFrame(() => (appDialogInputMode ? input : confirmButton).focus());
            });
        }

        function showAppConfirm(title, message, confirmLabel = 'Confirm', destructive = false) {
            return showAppDialog({ title, message, confirmLabel, destructive });
        }

        function showAppPrompt(title, message, inputLabel, defaultValue = '', confirmLabel = 'Save') {
            return showAppDialog({ title, message, inputLabel, defaultValue, confirmLabel });
        }

        function finishAppDialog(result) {
            const overlay = document.getElementById('appDialogOverlay');
            overlay.classList.add('hidden');
            overlay.classList.remove('flex');
            const resolve = appDialogResolver;
            const previousFocus = appDialogPreviousFocus;
            appDialogResolver = null;
            appDialogPreviousFocus = null;
            appDialogInputMode = false;
            resolve?.(result);
            if (previousFocus?.isConnected) previousFocus.focus();
        }

        function closeAppDialog() {
            finishAppDialog(null);
        }

        function submitAppDialog(event) {
            event.preventDefault();
            if (appDialogInputMode) {
                const value = document.getElementById('appDialogInput').value.trim();
                finishAppDialog(value || null);
                return;
            }
            finishAppDialog(true);
        }

        function signOut() {
            const modal = document.getElementById('signOutConfirmModal');
            modal.classList.remove('hidden');
            modal.classList.add('flex');
            document.getElementById('confirmSignOutButton').focus();
        }

        function closeSignOutConfirm() {
            const modal = document.getElementById('signOutConfirmModal');
            modal.classList.add('hidden');
            modal.classList.remove('flex');
            document.getElementById('adminMenuButton')?.focus();
        }

        async function completeLocalSignOut() {
            closeSignOutConfirm();
            showAuthTransition('Signing out', 'Securing this device…', true);
            try {
                if (supabaseClient) {
                    const { error } = await supabaseClient.auth.signOut();
                    if (error) console.error('Could not complete remote sign-out.', error);
                }
            } catch (error) {
                console.error('Could not complete remote sign-out.', error);
            }
            try {
                sessionStorage.setItem('cm_local_session_signed_out', 'true');
                sessionStorage.removeItem('cm_local_session_signed_in');
                sessionStorage.removeItem('cm_local_session_email');
                localStorage.removeItem('cm_local_remembered_email');
                localStorage.removeItem('cm_pos_offline_session_allowed_v1');
                localStorage.removeItem('cm_pos_offline_authorized_user_v1');
                localStorage.removeItem('cm-pos-supabase-auth-v1');
            } catch (error) {
                console.error('Could not clear the local sign-in state.', error);
            }
            currentAuthUser = null;
            await waitFor(900);
            hideAuthTransition();
            updateCloudSyncStatus('signedOut');
            showLocalSessionScreen();
        }

        window.addEventListener('keydown', event => {
            const appDialog = document.getElementById('appDialogOverlay');
            if (!appDialog.classList.contains('hidden')) {
                if (event.key === 'Escape') {
                    event.preventDefault();
                    closeAppDialog();
                    return;
                }
                if (event.key === 'Tab') {
                    const focusable = [...appDialog.querySelectorAll('button:not(:disabled), input:not(:disabled)')].filter(element => element.getClientRects().length);
                    const first = focusable[0];
                    const last = focusable[focusable.length - 1];
                    if (event.shiftKey && document.activeElement === first) {
                        event.preventDefault();
                        last?.focus();
                    } else if (!event.shiftKey && document.activeElement === last) {
                        event.preventDefault();
                        first?.focus();
                    }
                    return;
                }
                return;
            }
            const stockModal = document.getElementById('modalStockProduct');
            if (event.key === 'Tab' && !stockModal.classList.contains('hidden')) {
                const focusable = [...stockModal.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [href], [tabindex]:not([tabindex="-1"])')];
                const first = focusable[0];
                const last = focusable[focusable.length - 1];
                if (event.shiftKey && document.activeElement === first) {
                    event.preventDefault();
                    last.focus();
                } else if (!event.shiftKey && document.activeElement === last) {
                    event.preventDefault();
                    first.focus();
                }
                return;
            }
            if (event.key === 'Escape') {
                const signOutModal = document.getElementById('signOutConfirmModal');
                if (!signOutModal.classList.contains('hidden')) {
                    closeSignOutConfirm();
                    return;
                }
                if (!stockModal.classList.contains('hidden')) {
                    closeStockProductModal();
                    return;
                }
                const adminMenuOpen = !document.getElementById('adminMenu').classList.contains('hidden');
                if (adminMenuOpen) {
                    closeAdminMenu();
                    document.getElementById('adminMenuButton').focus();
                }
                toggleMobileSidebar(false);
            }
        });

        document.addEventListener('click', event => {
            if (!event.target.closest('#adminMenuContainer')) closeAdminMenu();
        });

        window.addEventListener('resize', () => {
            if (window.matchMedia('(max-width: 767px)').matches) return;
            const sidebar = document.getElementById('sidebar');
            if (!sidebar.classList.contains('mobile-open')) return;
            sidebar.classList.remove('mobile-open');
            sidebar.classList.add('hidden');
            document.getElementById('sidebarBackdrop').classList.add('hidden');
            document.getElementById('mobileSidebarToggle').setAttribute('aria-expanded', 'false');
        });

        function formatCurrency(num) {
            return '₱' + Number(num || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }

        function switchTab(tabId) {
            const tabIds = ['dashboard', 'products', 'stock', 'mines', 'reports', 'hosts', 'audit'];
            if (!tabIds.includes(tabId)) return;
            try {
                localStorage.setItem('cm_pos_last_tab', tabId);
            } catch (error) {
                console.error('Could not save the current page.', error);
            }
            tabIds.forEach(id => {
                const content = document.getElementById('tab-content-' + id);
                if (content) content.classList.add('hidden');
                const btn = document.getElementById('nav-' + id);
                if (btn) {
                    btn.className = "nav-btn w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/60 hover:text-gray-900 dark:hover:text-white";
                }
            });

            const activeContent = document.getElementById('tab-content-' + tabId);
            if (activeContent) {
                activeContent.classList.remove('hidden');
                activeContent.classList.remove('tab-enter');
                void activeContent.offsetWidth;
                activeContent.classList.add('tab-enter');
            }
            const activeBtn = document.getElementById('nav-' + tabId);
            if (activeBtn) {
                activeBtn.className = "nav-btn w-full flex items-center justify-between px-3 py-2.5 rounded-lg border border-amber-500/20 bg-amber-500/10 text-amber-800 dark:text-amber-300 text-sm font-semibold transition";
            }
            refreshAllUI();
            if (window.matchMedia('(max-width: 767px)').matches) toggleMobileSidebar(false);
        }

        function toggleDarkMode() {
            const html = document.documentElement;
            const icon = document.getElementById('themeIcon');
            if (html.classList.contains('dark')) {
                html.classList.remove('dark');
                html.classList.add('light');
                icon.className = "fa-solid fa-moon text-sm";
                localStorage.setItem('cm_theme', 'light');
            } else {
                html.classList.remove('light');
                html.classList.add('dark');
                icon.className = "fa-solid fa-sun text-sm";
                localStorage.setItem('cm_theme', 'dark');
            }
            syncAdminMenuTheme();
        }

        function toggleAdminMenuTheme() {
            toggleDarkMode();
        }

        function syncAdminMenuTheme() {
            const themeMenu = document.getElementById('adminMenuTheme');
            if (themeMenu) themeMenu.setAttribute('aria-checked', String(document.documentElement.classList.contains('dark')));
        }

        function initTheme() {
            const savedTheme = localStorage.getItem('cm_theme') || 'light';
            const html = document.documentElement;
            const icon = document.getElementById('themeIcon');
            if (savedTheme === 'dark') {
                html.classList.remove('light');
                html.classList.add('dark');
                icon.className = "fa-solid fa-sun text-sm";
            } else {
                html.classList.remove('dark');
                html.classList.add('light');
                icon.className = "fa-solid fa-moon text-sm";
            }
            syncAdminMenuTheme();
        }

        function getLiveHostNames() {
            const customNames = (Array.isArray(db.hosts) ? db.hosts : []).map(host => typeof host === 'string' ? host : host?.name);
            const names = ['TRICIA', 'RAI', 'CESS', ...customNames];
            (db.mines || []).forEach(mine => names.push(mine.seller));
            (db.liveSessions || []).forEach(session => names.push(session.host || session.seller));
            const deletedHosts = new Set((Array.isArray(db.deletedHosts) ? db.deletedHosts : []).map(name => String(name || '').trim().toUpperCase()));
            const unique = new Map();
            names.forEach(value => {
                const name = String(value || '').trim().replace(/\s+/g, ' ');
                const key = name.toUpperCase();
                if (name && key !== 'WALK-IN' && key !== 'OTHERS' && !deletedHosts.has(key) && !unique.has(key)) unique.set(key, name);
            });
            return [...unique.values()];
        }

        function liveHostLabel(value) {
            const key = String(value || '').trim().toUpperCase();
            const defaults = { TRICIA: 'Tricia', RAI: 'Rai', CESS: 'Cess', 'WALK-IN': 'Walk-in', OTHERS: 'Others' };
            if (defaults[key]) return defaults[key];
            return String(value || '').trim().replace(/\b\w/g, letter => letter.toUpperCase());
        }

        function formatHostAddedDate(createdAt) {
            const date = new Date(createdAt || '');
            if (!Number.isFinite(date.getTime())) return '';
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${month}/${day}/${date.getFullYear()}`;
        }

        function getLiveHostRoles(record) {
            const allowedRoles = ['live-seller', 'host', 'staff'];
            let roles = Array.isArray(record?.roles) ? record.roles : [];
            if (!roles.length) {
                const legacyRole = String(record?.role || 'live-seller');
                if (legacyRole === 'host-admin' || legacyRole === 'admin') roles = ['host'];
                else if (legacyRole === 'live-seller-host') roles = ['live-seller', 'host'];
                else roles = legacyRole.split('/');
            }
            return [...new Set(roles.filter(role => allowedRoles.includes(role)))].slice(0, 2);
        }

        function liveHostRoleLabel(record) {
            const labels = { 'live-seller': 'Live Seller', host: 'Host', staff: 'Staff' };
            return getLiveHostRoles(record).map(role => labels[role]).join(' / ') || 'Live Seller';
        }

        function limitLiveHostRoles(input) {
            const checkedRoles = [...document.querySelectorAll('input[name="liveHostRoles"]:checked')];
            if (checkedRoles.length > 2) {
                input.checked = false;
                showToast('Choose up to two roles.', true);
            }
        }

        function ensureLiveHostAuditRecords() {
            if (!Array.isArray(db.hosts)) return;
            let changed = false;
            const normalizedHosts = db.hosts.filter(Boolean).map(host => {
                const record = typeof host === 'string' ? { name: host } : { ...host };
                const nameParts = String(record.name || '').trim().split(/\s+/);
                const isBuiltIn = ['TRICIA', 'RAI', 'CESS'].includes(String(record.name || '').toUpperCase());
                if (!isBuiltIn && (!record.createdAt || !Number.isFinite(Date.parse(record.createdAt)))) {
                    record.createdAt = new Date().toISOString();
                    record.dateMigrated = true;
                    changed = true;
                }
                if (!record.firstName) { record.firstName = nameParts.shift() || ''; changed = true; }
                if (!record.lastName) { record.lastName = nameParts.join(' '); changed = true; }
                const roles = getLiveHostRoles(record);
                if (!Array.isArray(record.roles) || record.roles.join('|') !== roles.join('|') || record.role !== roles.join('/')) {
                    record.roles = roles.length ? roles : ['live-seller'];
                    record.role = record.roles.join('/');
                    changed = true;
                }
                if (record.isActive === undefined) { record.isActive = true; changed = true; }
                return record;
            });
            const uniqueHosts = new Map();
            normalizedHosts.forEach(record => {
                const key = String(record.name || '').trim().toUpperCase();
                const previous = uniqueHosts.get(key);
                if (!previous) uniqueHosts.set(key, record);
                else {
                    const previousUpdatedAt = Date.parse(previous.updatedAt || '') || 0;
                    const recordUpdatedAt = Date.parse(record.updatedAt || '') || 0;
                    uniqueHosts.set(key, recordUpdatedAt >= previousUpdatedAt ? record : previous);
                    changed = true;
                }
            });
            if (uniqueHosts.size !== db.hosts.length) changed = true;
            db.hosts = [...uniqueHosts.values()];
            if (changed) saveToLocalStorage();
        }

        let addLiveHostReturnFocus = null;
        let editingLiveHostName = null;

        function openAddLiveHostModal() {
            const modal = document.getElementById('modalAddLiveHost');
            if (!modal) return;
            editingLiveHostName = null;
            document.getElementById('formLiveHost')?.reset();
            document.getElementById('addLiveHostTitle').textContent = 'Add live seller';
            document.getElementById('addLiveHostDescription').textContent = 'Add a name to use when recording live orders.';
            document.getElementById('liveHostSubmitButton').innerHTML = '<i class="fa-solid fa-plus" aria-hidden="true"></i> Add seller';
            addLiveHostReturnFocus = document.activeElement;
            modal.classList.remove('hidden');
            modal.classList.add('flex');
            requestAnimationFrame(() => document.getElementById('liveHostFirstName')?.focus());
        }

        function closeAddLiveHostModal() {
            const modal = document.getElementById('modalAddLiveHost');
            if (!modal) return;
            modal.classList.add('hidden');
            modal.classList.remove('flex');
            if (addLiveHostReturnFocus instanceof HTMLElement) addLiveHostReturnFocus.focus();
        }

        function liveHostOptions(selectedValue = '', includeWalkIn = true, allowHistoricalSelection = true) {
            const selected = String(selectedValue || '').trim().toUpperCase();
            const names = getLiveHostNames().filter(isLiveHostActive).map(name => name.toUpperCase());
            const deletedHost = (Array.isArray(db.deletedHosts) ? db.deletedHosts : []).some(name => String(name || '').trim().toUpperCase() === selected);
            if (selected && selected !== 'WALK-IN' && !names.includes(selected) && (allowHistoricalSelection || !deletedHost)) names.push(selected);
            if (includeWalkIn && !names.includes('WALK-IN')) names.push('WALK-IN');
            return `<option value="">Choose seller</option>${names.map(name => `<option value="${escapeHtml(name)}" ${name === selected ? 'selected' : ''}>${escapeHtml(liveHostLabel(name))}${!isLiveHostActive(name) ? ' (disabled)' : ''}</option>`).join('')}`;
        }

        function isLiveHostActive(name) {
            const normalized = String(name || '').trim().toUpperCase();
            const record = (Array.isArray(db.hosts) ? db.hosts : []).find(host => String(typeof host === 'string' ? host : host?.name || '').trim().toUpperCase() === normalized);
            return !record || typeof record === 'string' || record.isActive !== false;
        }

        let selectedLiveHostPerformance = '';
        let selectedLiveHostRemoval = '';

        function getLiveHostPerformanceRange() {
            const todayKey = localDateKey();
            const today = new Date(`${todayKey}T12:00:00`);
            const rangeType = document.getElementById('liveHostPerformanceRange')?.value || 'this-month';
            let start;
            let end;
            if (rangeType === 'this-week' || rangeType === 'last-week') {
                const mondayOffset = (today.getDay() + 6) % 7;
                start = new Date(today);
                start.setDate(today.getDate() - mondayOffset - (rangeType === 'last-week' ? 7 : 0));
                end = new Date(start);
                end.setDate(start.getDate() + (rangeType === 'last-week' ? 6 : 6));
                if (rangeType === 'this-week') end = today;
            } else if (rangeType === 'last-month') {
                start = new Date(today.getFullYear(), today.getMonth() - 1, 1, 12);
                end = new Date(today.getFullYear(), today.getMonth(), 0, 12);
            } else {
                start = new Date(today.getFullYear(), today.getMonth(), 1, 12);
                end = today;
            }
            const startKey = localDateKey(start);
            const endKey = localDateKey(end);
            const dateLabel = key => new Date(`${key}T12:00:00`).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
            return { startKey, endKey, label: `${dateLabel(startKey)} – ${dateLabel(endKey)}` };
        }

        function getLiveHostOrders(name, range = getLiveHostPerformanceRange()) {
            const normalized = String(name || '').trim().toUpperCase();
            const sessions = new Map((Array.isArray(db.liveSessions) ? db.liveSessions : []).map(session => [session.id, session]));
            return (Array.isArray(db.mines) ? db.mines : [])
                .filter(mine => isReportableMine(mine)
                    && String(getMinePaymentStatus(mine)).toUpperCase() !== 'RETURNED'
                    && String(mine.seller || mine.host || '').trim().toUpperCase() === normalized
                    && mine.date >= range.startKey
                    && mine.date <= range.endKey)
                .map(mine => ({ mine, session: sessions.get(mine.sessionId), ...getReportOrderAmounts(mine), status: getMinePaymentStatus(mine) }))
                .sort((left, right) => String(right.mine.date).localeCompare(String(left.mine.date)) || String(right.mine.time || '').localeCompare(String(left.mine.time || '')));
        }

        function getLiveHostPaidOrders(name, range = getLiveHostPerformanceRange()) {
            return getLiveHostOrders(name, range).filter(order => order.status === 'PAID');
        }

        function closeLiveHostPerformance() {
            selectedLiveHostPerformance = '';
            document.getElementById('liveHostPerformanceDetail')?.classList.add('hidden');
            renderLiveHosts();
        }

        function viewLiveHostPerformanceEncoded(encodedName) {
            selectedLiveHostPerformance = decodeURIComponent(encodedName);
            renderLiveHosts();
            document.getElementById('liveHostPerformanceDetail')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }

        function openMineOrderRecord(id) {
            const mine = (db.mines || []).find(order => String(order.id) === String(id));
            if (!mine) return;
            switchTab('mines');
            const knownSession = mine.sessionId && (db.liveSessions || []).some(session => session.id === mine.sessionId);
            mineSessionView = knownSession ? mine.sessionId : '__legacy__';
            mineFilterTab = 'ALL';
            renderFullMinesTable();
            viewMine(mine.id);
        }

        function openLiveHostRemovalEncoded(encodedName) {
            selectedLiveHostRemoval = decodeURIComponent(encodedName);
            const modal = document.getElementById('modalLiveHostRemoval');
            const hostRecord = (Array.isArray(db.hosts) ? db.hosts : []).find(host => String(typeof host === 'string' ? host : host?.name || '').trim().toUpperCase() === selectedLiveHostRemoval);
            const isActive = !hostRecord || typeof hostRecord === 'string' || hostRecord.isActive !== false;
            document.getElementById('liveHostRemovalTitle').textContent = `${liveHostLabel(selectedLiveHostRemoval)} · seller options`;
            document.getElementById('liveHostRemovalStatusButton').innerHTML = isActive
                ? '<i class="fa-solid fa-user-slash w-4" aria-hidden="true"></i><span>Disable seller<span class="mt-0.5 block text-xs font-normal text-gray-500 dark:text-gray-400">Keep their record and past order history.</span></span>'
                : '<i class="fa-solid fa-rotate-right w-4" aria-hidden="true"></i><span>Reactivate seller<span class="mt-0.5 block text-xs font-normal text-gray-500 dark:text-gray-400">Make them available for new orders again.</span></span>';
            modal.classList.remove('hidden');
            modal.classList.add('flex');
        }

        function closeLiveHostRemoval() {
            const modal = document.getElementById('modalLiveHostRemoval');
            modal?.classList.add('hidden');
            modal?.classList.remove('flex');
            selectedLiveHostRemoval = '';
        }

        function disableSelectedLiveHost() {
            if (!selectedLiveHostRemoval) return;
            const name = selectedLiveHostRemoval;
            closeLiveHostRemoval();
            toggleLiveHostActiveEncoded(encodeURIComponent(name));
        }

        async function permanentlyDeleteSelectedLiveHost() {
            const normalized = selectedLiveHostRemoval;
            if (!normalized) return;
            if (!await showAppConfirm('Permanently delete this seller?', `Remove ${liveHostLabel(normalized)} from the seller list? Existing orders and reports will keep the seller name.`, 'Delete seller', true)) return;
            if (!Array.isArray(db.hosts)) db.hosts = [];
            const removedRecord = db.hosts.find(host => String(typeof host === 'string' ? host : host?.name || '').trim().toUpperCase() === normalized);
            if (removedRecord) moveRecordToTrash('Live seller', typeof removedRecord === 'string' ? { name: removedRecord, role: 'live-seller', isActive: true } : removedRecord, liveHostLabel(normalized));
            db.hosts = db.hosts.filter(host => String(typeof host === 'string' ? host : host?.name || '').trim().toUpperCase() !== normalized);
            if (!Array.isArray(db.deletedHosts)) db.deletedHosts = [];
            if (!db.deletedHosts.some(name => String(name || '').trim().toUpperCase() === normalized)) db.deletedHosts.push(normalized);
            recordAuditEvent('Deleted seller', 'Live seller', normalized, `${liveHostLabel(normalized)} removed from the seller directory`);
            closeLiveHostRemoval();
            if (selectedLiveHostPerformance === normalized) selectedLiveHostPerformance = '';
            saveToLocalStorage();
            showToast(`${liveHostLabel(normalized)} was removed. Past order history is preserved.`);
        }

        function renderLiveHostPerformance() {
            const detail = document.getElementById('liveHostPerformanceDetail');
            const period = document.getElementById('liveHostPerformancePeriod');
            if (!detail) return;
            const range = getLiveHostPerformanceRange();
            if (period) period.textContent = range.label;
            if (!selectedLiveHostPerformance) {
                detail.classList.add('hidden');
                return;
            }
            const sellerName = liveHostLabel(selectedLiveHostPerformance);
            const sellerOrders = getLiveHostOrders(selectedLiveHostPerformance, range);
            const orders = sellerOrders.filter(order => order.status === 'PAID');
            const unpaidOrders = sellerOrders.filter(order => order.status !== 'PAID');
            const total = orders.reduce((sum, record) => sum + record.total, 0);
            const average = orders.length ? total / orders.length : 0;
            const outstandingBalance = unpaidOrders.reduce((sum, order) => sum + order.balance, 0);
            const sellingDays = new Set(sellerOrders.map(({ mine }) => mine.date)).size;
            document.getElementById('liveHostPerformanceTitle').textContent = `${sellerName} · Performance`;
            document.getElementById('liveHostPerformanceSubtitle').textContent = `Paid sales and unpaid follow-up · ${range.label}`;
            document.getElementById('liveHostPerformanceMetrics').innerHTML = [
                ['Paid sales', formatCurrency(total)],
                ['Items mined', sellerOrders.length.toLocaleString('en-PH')],
                ['Paid items', orders.length.toLocaleString('en-PH')],
                ['Unpaid items', unpaidOrders.length.toLocaleString('en-PH')],
                ['Outstanding balance', formatCurrency(outstandingBalance)],
                ['Average paid order', formatCurrency(average)],
                ['Selling days', sellingDays.toLocaleString('en-PH')]
            ].map(([label, value]) => `<div class="bg-white/80 px-4 py-3 dark:bg-slate-950/20"><span class="block text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">${label}</span><span class="mt-1 block text-base font-semibold tabular-nums text-gray-900 dark:text-white">${value}</span></div>`).join('');
            document.getElementById('liveHostPerformanceOrders').innerHTML = orders.map(({ mine, session, total: orderTotal }) => `<tr class="bg-white/40 dark:bg-transparent"><td class="whitespace-nowrap px-4 py-3 text-gray-600 dark:text-gray-300">${escapeHtml(reportDateLabel(mine.date, { month: 'short', day: 'numeric', year: 'numeric' }))}</td><td class="px-4 py-3 font-medium text-gray-900 dark:text-white">${escapeHtml(mine.name || mine.buyer || '—')}</td><td class="max-w-64 px-4 py-3 text-gray-700 dark:text-gray-300"><span class="line-clamp-2">${escapeHtml(mine.item || '—')}</span></td><td class="px-4 py-3 text-gray-600 dark:text-gray-300">${escapeHtml(session?.name || mine.liveSession || '—')}</td><td class="whitespace-nowrap px-4 py-3 text-right font-mono font-semibold tabular-nums text-gray-900 dark:text-white">${formatCurrency(orderTotal)}</td></tr>`).join('');
            document.getElementById('liveHostPerformanceUnpaidOrders').innerHTML = unpaidOrders.map(({ mine, balance, status }) => `<tr class="bg-white/40 dark:bg-transparent"><td class="whitespace-nowrap px-4 py-3 text-gray-600 dark:text-gray-300">${escapeHtml(reportDateLabel(mine.date, { month: 'short', day: 'numeric', year: 'numeric' }))}</td><td class="px-4 py-3 font-medium text-gray-900 dark:text-white">${escapeHtml(mine.name || mine.buyer || '—')}</td><td class="max-w-64 px-4 py-3 text-gray-700 dark:text-gray-300"><span class="line-clamp-2">${escapeHtml(mine.item || '—')}</span></td><td class="px-4 py-3"><span class="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">${escapeHtml(status === 'PARTIAL' ? 'PARTIALLY PAID' : 'UNPAID')}</span></td><td class="whitespace-nowrap px-4 py-3 text-right font-mono font-semibold tabular-nums text-rose-700 dark:text-rose-300">${formatCurrency(balance)}</td><td class="px-4 py-3 text-right"><button type="button" data-open-mine-order="${escapeHtml(mine.id)}" class="btn-outline whitespace-nowrap px-2.5 py-1.5 text-[11px]"><i class="fa-solid fa-arrow-up-right-from-square mr-1" aria-hidden="true"></i>Open record</button></td></tr>`).join('');
            const unpaidSummary = document.getElementById('liveHostUnpaidSummary');
            if (unpaidSummary) unpaidSummary.textContent = `${unpaidOrders.length} ${unpaidOrders.length === 1 ? 'item' : 'items'} · ${formatCurrency(outstandingBalance)} due`;
            document.getElementById('liveHostPerformanceUnpaidOrders').querySelectorAll('[data-open-mine-order]').forEach(button => button.addEventListener('click', () => openMineOrderRecord(button.dataset.openMineOrder)));
            document.getElementById('liveHostPerformanceEmpty')?.classList.toggle('hidden', orders.length > 0);
            document.getElementById('liveHostPerformanceOrders')?.classList.toggle('hidden', orders.length === 0);
            document.getElementById('liveHostPerformanceUnpaidEmpty')?.classList.toggle('hidden', unpaidOrders.length > 0);
            document.getElementById('liveHostPerformanceUnpaidOrders')?.classList.toggle('hidden', unpaidOrders.length === 0);
            detail.classList.remove('hidden');
        }

        function renderLiveHosts() {
            ensureLiveHostAuditRecords();
            const list = document.getElementById('liveHostsList');
            const count = document.getElementById('liveHostCount');
            const sellerSelect = document.getElementById('mineSeller');
            const performanceRange = getLiveHostPerformanceRange();
            const hosts = getLiveHostNames();
            if (count) count.textContent = `${hosts.length} ${hosts.length === 1 ? 'seller' : 'sellers'}`;
            if (list) {
                const search = String(document.getElementById('liveHostSearch')?.value || '').trim().toLowerCase();
                const statusFilter = document.getElementById('liveHostFilter')?.value || '';
                const customHostRecords = new Map((Array.isArray(db.hosts) ? db.hosts : []).map(host => {
                    const name = typeof host === 'string' ? host : host?.name;
                    return [String(name || '').trim().toUpperCase(), typeof host === 'string' ? null : host];
                }).filter(([name]) => name));
                const sortedHosts = [...hosts].sort((left, right) => {
                    const leftName = left.toUpperCase();
                    const rightName = right.toUpperCase();
                    const leftRecord = customHostRecords.get(leftName);
                    const rightRecord = customHostRecords.get(rightName);
                    const leftBuiltIn = ['TRICIA', 'RAI', 'CESS'].includes(leftName);
                    const rightBuiltIn = ['TRICIA', 'RAI', 'CESS'].includes(rightName);
                    const priority = record => record?.isActive === false ? 3 : record?.createdAt ? 0 : null;
                    const leftPriority = priority(leftRecord) ?? (leftBuiltIn ? 1 : 2);
                    const rightPriority = priority(rightRecord) ?? (rightBuiltIn ? 1 : 2);
                    if (leftPriority !== rightPriority) return leftPriority - rightPriority;
                    if (leftPriority === 0) return Date.parse(rightRecord.createdAt) - Date.parse(leftRecord.createdAt);
                    if (leftPriority === 3) return (Date.parse(rightRecord.updatedAt || '') || 0) - (Date.parse(leftRecord.updatedAt || '') || 0);
                    return liveHostLabel(left).localeCompare(liveHostLabel(right));
                });
                const filteredHosts = sortedHosts.filter(name => {
                    const normalized = name.toUpperCase();
                    const record = customHostRecords.get(normalized);
                    const source = record ? record.isActive === false ? 'disabled' : 'active' : ['TRICIA', 'RAI', 'CESS'].includes(normalized) ? 'active' : 'historical';
                    return (!search || liveHostLabel(name).toLowerCase().includes(search)) && (!statusFilter || source === statusFilter);
                });
                list.innerHTML = filteredHosts.map(name => {
                    const normalized = name.toUpperCase();
                    const record = customHostRecords.get(normalized);
                    const isActive = record ? record.isActive !== false : true;
                    const isBuiltIn = ['TRICIA', 'RAI', 'CESS'].includes(normalized);
                    const addedDate = record ? formatHostAddedDate(record.createdAt) : '';
                    const role = liveHostRoleLabel(record);
                    const statusTitle = record?.dateMigrated ? 'Original add date was not recorded; this is the date first tracked' : record?.createdAt ? `Added ${new Date(record.createdAt).toLocaleString()}` : '';
                    const paidOrders = getLiveHostPaidOrders(name, performanceRange);
                    const paidSales = paidOrders.reduce((sum, order) => sum + order.total, 0);
                    const status = !isActive
                        ? '<span class="inline-flex items-center gap-1.5 rounded-full border border-rose-500/25 bg-rose-500/10 px-2.5 py-1 text-xs font-medium text-rose-700 dark:text-rose-300"><span class="h-1.5 w-1.5 rounded-full bg-rose-500"></span>Disabled</span>'
                        : record
                            ? `<span class="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300" title="${escapeHtml(statusTitle)}"><span class="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>Active${addedDate ? ` · Added ${escapeHtml(addedDate)}` : ''}</span>`
                            : isBuiltIn
                                ? '<span class="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300"><span class="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>Active</span>'
                                : '<span class="inline-flex items-center gap-1.5 rounded-full border border-gray-300 bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600 dark:border-white/10 dark:bg-white/5 dark:text-gray-300"><span class="h-1.5 w-1.5 rounded-full bg-gray-400"></span>Historical</span>';
                    const initials = liveHostLabel(name).split(/\s+/).map(part => part[0]).slice(0, 2).join('').toUpperCase();
                    const avatarPalette = ['border-orange-300/70 bg-orange-100 text-orange-800 dark:border-orange-300/20 dark:bg-orange-300/10 dark:text-orange-200', 'border-sky-300/70 bg-sky-100 text-sky-800 dark:border-sky-300/20 dark:bg-sky-300/10 dark:text-sky-200', 'border-emerald-300/70 bg-emerald-100 text-emerald-800 dark:border-emerald-300/20 dark:bg-emerald-300/10 dark:text-emerald-200', 'border-violet-300/70 bg-violet-100 text-violet-800 dark:border-violet-300/20 dark:bg-violet-300/10 dark:text-violet-200'];
                    const avatarColor = Math.max(0, sortedHosts.findIndex(seller => seller.toUpperCase() === normalized)) % avatarPalette.length;
                    const reactivateAction = !isActive
                        ? `<button type="button" onclick="toggleLiveHostActiveEncoded('${encodeURIComponent(normalized)}')" class="grid h-8 w-8 place-items-center rounded-lg text-emerald-600 transition hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-500/10" aria-label="Reactivate ${escapeHtml(liveHostLabel(name))}" title="Reactivate"><i class="fa-solid fa-rotate-right" aria-hidden="true"></i></button>`
                        : '';
                    const removalAction = `<button type="button" onclick="openLiveHostRemovalEncoded('${encodeURIComponent(normalized)}')" class="grid h-8 w-8 place-items-center rounded-lg text-rose-500 transition hover:bg-rose-50 dark:hover:bg-rose-500/10" aria-label="Seller options for ${escapeHtml(liveHostLabel(name))}" title="Disable or permanently delete"><i class="fa-solid fa-trash-can" aria-hidden="true"></i></button>`;
                    const actions = `<div class="flex justify-end gap-1.5"><button type="button" onclick="viewLiveHostPerformanceEncoded('${encodeURIComponent(normalized)}')" class="btn-outline inline-flex min-h-8 items-center gap-1.5 px-2.5 text-xs"><i class="fa-solid fa-chart-line" aria-hidden="true"></i> View</button><button type="button" onclick="editLiveHostEncoded('${encodeURIComponent(normalized)}')" class="grid h-8 w-8 place-items-center rounded-lg text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-white/10 dark:hover:text-white" aria-label="Edit ${escapeHtml(liveHostLabel(name))}" title="Edit"><i class="fa-solid fa-pen" aria-hidden="true"></i></button>${reactivateAction}${removalAction}</div>`;
                    return `<tr class="transition-colors hover:bg-gray-50/80 dark:hover:bg-white/[0.04]"><th scope="row" class="px-4 py-3.5 text-left font-medium"><span class="flex items-center gap-3"><span class="grid h-9 w-9 shrink-0 place-items-center rounded-full border text-xs font-semibold ${avatarPalette[avatarColor]}">${escapeHtml(initials)}</span><span class="text-sm font-semibold text-gray-900 dark:text-white">${escapeHtml(liveHostLabel(name))}</span></span></th><td class="px-4 py-3.5 text-sm text-gray-600 dark:text-gray-300">${escapeHtml(role)}</td><td class="whitespace-nowrap px-4 py-3.5 text-right font-mono text-sm font-semibold tabular-nums text-gray-900 dark:text-white">${formatCurrency(paidSales)}</td><td class="px-4 py-3.5 text-right font-mono text-sm tabular-nums text-gray-600 dark:text-gray-300">${paidOrders.length}</td><td class="px-4 py-3.5">${status}</td><td class="px-4 py-3.5">${actions}</td></tr>`;
                }).join('');
                document.getElementById('liveHostTable')?.classList.toggle('hidden', filteredHosts.length === 0);
                document.getElementById('liveHostEmptyState')?.classList.toggle('hidden', filteredHosts.length > 0);
                const resultCount = document.getElementById('liveHostResultCount');
                if (resultCount) resultCount.textContent = `Showing ${filteredHosts.length} of ${hosts.length} ${hosts.length === 1 ? 'seller' : 'sellers'}`;
            }
            if (sellerSelect) {
                const selected = sellerSelect.value || 'TRICIA';
                sellerSelect.innerHTML = liveHostOptions(selected, true, false);
                sellerSelect.value = selected;
            }
            const showingPerformance = selectedLiveHostPerformance && hosts.some(name => name.toUpperCase() === selectedLiveHostPerformance.toUpperCase());
            document.getElementById('liveHostDirectory')?.classList.toggle('hidden', Boolean(showingPerformance));
            if (showingPerformance) renderLiveHostPerformance();
        }

        function editLiveHostEncoded(encodedName) {
            const normalized = decodeURIComponent(encodedName);
            const record = (Array.isArray(db.hosts) ? db.hosts : []).find(host => String(typeof host === 'string' ? host : host?.name || '').trim().toUpperCase() === normalized) || { name: normalized, role: 'live-seller', isActive: true };
            editingLiveHostName = normalized;
            const parts = String(typeof record === 'string' ? record : record.name || '').trim().split(/\s+/);
            document.getElementById('liveHostFirstName').value = record.firstName || parts.shift() || '';
            document.getElementById('liveHostLastName').value = record.lastName || parts.join(' ');
            const roles = getLiveHostRoles(record);
            document.querySelectorAll('input[name="liveHostRoles"]').forEach(input => { input.checked = roles.includes(input.value); });
            document.getElementById('addLiveHostTitle').textContent = 'Edit live seller';
            document.getElementById('addLiveHostDescription').textContent = 'Update this seller’s name or role. Previous orders keep their original name.';
            document.getElementById('liveHostSubmitButton').innerHTML = '<i class="fa-solid fa-check" aria-hidden="true"></i> Save changes';
            addLiveHostReturnFocus = document.activeElement;
            const modal = document.getElementById('modalAddLiveHost');
            modal.classList.remove('hidden');
            modal.classList.add('flex');
            requestAnimationFrame(() => document.getElementById('liveHostFirstName')?.focus());
        }

        async function toggleLiveHostActiveEncoded(encodedName) {
            const normalized = decodeURIComponent(encodedName);
            const hostIndices = (Array.isArray(db.hosts) ? db.hosts : []).map((host, index) => String(typeof host === 'string' ? host : host?.name || '').trim().toUpperCase() === normalized ? index : -1).filter(index => index >= 0);
            const existing = hostIndices.map(index => db.hosts[index]).sort((left, right) => (Date.parse(right?.updatedAt || '') || 0) - (Date.parse(left?.updatedAt || '') || 0))[0] || null;
            const nextActive = existing ? existing.isActive === false : false;
            const action = nextActive ? 'Reactivate' : 'Disable';
            if (!await showAppConfirm(`${action} this seller?`, `${action} ${liveHostLabel(normalized)}? Past orders will remain in history.`, action, action === 'Disable')) return;
            const currentName = existing ? String(typeof existing === 'string' ? existing : existing.name) : normalized;
            const nameParts = currentName.trim().split(/\s+/);
            const record = typeof existing === 'object' ? existing : {};
            const updated = { ...record, name: currentName, firstName: record.firstName || nameParts.shift() || '', lastName: record.lastName || nameParts.join(' '), role: record.role || 'live-seller', isActive: nextActive, updatedAt: new Date().toISOString() };
            if (hostIndices.length) hostIndices.forEach(index => { db.hosts[index] = { ...updated }; });
            else db.hosts.push(updated);
            recordAuditEvent(nextActive ? 'Reactivated seller' : 'Disabled seller', 'Live seller', normalized, `${liveHostLabel(normalized)} ${nextActive ? 'reactivated' : 'disabled'}`);
            saveToLocalStorage();
            renderLiveHosts();
            showToast(`${liveHostLabel(normalized)} ${nextActive ? 'reactivated' : 'disabled'}.`);
        }

        function saveLiveHost(event) {
            event.preventDefault();
            const firstNameInput = document.getElementById('liveHostFirstName');
            const lastNameInput = document.getElementById('liveHostLastName');
            const firstName = String(firstNameInput.value || '').trim().replace(/\s+/g, ' ');
            const lastName = String(lastNameInput.value || '').trim().replace(/\s+/g, ' ');
            const roles = [...document.querySelectorAll('input[name="liveHostRoles"]:checked')].map(input => input.value);
            if (!firstName || !lastName) {
                showToast('Enter both a first name and last name.', true);
                (!firstName ? firstNameInput : lastNameInput).focus();
                return;
            }
            if (!roles.length) {
                showToast('Choose at least one role.', true);
                document.querySelector('input[name="liveHostRoles"]')?.focus();
                return;
            }
            const normalized = `${firstName} ${lastName}`.toUpperCase();
            if (getLiveHostNames().some(host => host.toUpperCase() === normalized && host.toUpperCase() !== editingLiveHostName)) {
                showToast('That seller is already in the list.', true);
                firstNameInput.focus();
                return;
            }
            if (Array.isArray(db.deletedHosts)) db.deletedHosts = db.deletedHosts.filter(name => String(name || '').trim().toUpperCase() !== normalized);
            if (!Array.isArray(db.hosts)) db.hosts = [];
            const recordIndex = editingLiveHostName ? db.hosts.findIndex(host => String(typeof host === 'string' ? host : host?.name || '').trim().toUpperCase() === editingLiveHostName) : -1;
            const previousRecord = recordIndex >= 0 && typeof db.hosts[recordIndex] === 'object' ? db.hosts[recordIndex] : {};
            const isBuiltIn = ['TRICIA', 'RAI', 'CESS'].includes(normalized);
            const hostRecord = { ...previousRecord, name: normalized, firstName: firstName.toUpperCase(), lastName: lastName.toUpperCase(), roles, role: roles.join('/'), isActive: previousRecord.isActive !== false, updatedAt: new Date().toISOString() };
            if (!isBuiltIn && !hostRecord.createdAt) hostRecord.createdAt = new Date().toISOString();
            if (recordIndex >= 0) {
                db.hosts[recordIndex] = hostRecord;
                recordAuditEvent('Updated seller', 'Live seller', normalized, `${liveHostLabel(normalized)} profile updated`);
            } else {
                db.hosts.push(hostRecord);
                recordAuditEvent('Added seller', 'Live seller', normalized, `${liveHostLabel(normalized)} added to seller directory`);
            }
            saveToLocalStorage();
            document.getElementById('formLiveHost').reset();
            editingLiveHostName = null;
            closeAddLiveHostModal();
            refreshAllUI();
            showToast(`${liveHostLabel(normalized)} ${recordIndex >= 0 ? 'updated' : 'added to live sellers'}.`);
        }

        function refreshAllUI() {
            updateDashboardMetrics();
            renderDashboardTransactions();
            renderTopSellingShirts();
            renderProductsCatalog();
            renderProductOptionInputs();
            renderProductOptions();
            renderStockTable();
            renderFullMinesTable();
            renderDailyLedger();
            renderLiveHosts();
            renderAuditLogs();
            initOrUpdateChart();
        }

        function updateDashboardMetrics() {
            let grossOrderValue = 0;
            let cashCollected = 0;
            let unpaidTotal = 0;
            let totalExpenses = 0;

            db.mines.forEach(m => {
                if (!isReportableMine(m)) return;
                const total = Number(m.total || 0);
                const downpayment = Math.min(total, Math.max(0, Number(m.dp || 0)));
                grossOrderValue += total;
                if (m.status === 'PAID') cashCollected += total;
                else {
                    cashCollected += downpayment;
                    unpaidTotal += Math.max(0, total - downpayment);
                }
            });

            // Add estimated COGS
            db.shirts.forEach(s => {
                totalExpenses += Number(s.cost || 0) * (Number(s.soldCount) || 5);
            });

            const netProfit = grossOrderValue - totalExpenses;

            document.getElementById('statTotalSales').innerText = formatCurrency(grossOrderValue);
            document.getElementById('statUnpaid').innerText = formatCurrency(unpaidTotal);
            document.getElementById('statCollected').innerText = formatCurrency(cashCollected);
            document.getElementById('statNetProfit').innerText = formatCurrency(netProfit);

            document.getElementById('infoShirtCount').innerText = db.shirts.length + ' products';
            document.getElementById('infoOrderCount').innerText = db.mines.filter(isReportableMine).length + ' orders';
            document.getElementById('infoLowStockCount').innerText = db.shirts.filter(s => Number(s.qty || 0) > 0 && Number(s.qty || 0) <= 5).length + ' items';
        }

        function renderDashboardTransactions() {
            const tbody = document.getElementById('dashboardTransactionsTable');
            tbody.innerHTML = '';

            const recent = db.mines.filter(isReportableMine).slice(0, 5);
            if (!recent.length) {
                tbody.innerHTML = '<tr><td colspan="6" class="py-8 px-3 text-center text-sm text-gray-500">No mine orders recorded yet.</td></tr>';
                return;
            }
            recent.forEach(m => {
                const paymentStatus = getMinePaymentStatus(m);
                const encodedMineId = encodeURIComponent(String(m.id || '')).replace(/'/g, '%27');
                const isPaid = paymentStatus === 'PAID';
                const isPartial = paymentStatus === 'PARTIAL';
                const badge = isPaid
                    ? '<span class="bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 px-2.5 py-1 rounded-full font-bold text-[10px]">PAID</span>'
                    : isPartial
                        ? '<span class="bg-amber-500/10 text-amber-700 border border-amber-500/30 px-2.5 py-1 rounded-full font-bold text-[10px]">PARTIALLY PAID</span>'
                        : '<span class="bg-rose-500/10 text-rose-500 border border-rose-500/30 px-2.5 py-1 rounded-full font-bold text-[10px]">UNPAID</span>';

                tbody.innerHTML += `
                    <tr class="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
                        <td class="py-3 px-3 text-gray-500 font-mono">${escapeHtml(m.date)} <br><span class="text-[10px] text-gray-400">${escapeHtml(m.time)}</span></td>
                        <td class="py-3 px-3 font-bold text-gray-900 dark:text-white">${escapeHtml(m.name)}</td>
                        <td class="py-3 px-3 text-gray-600 dark:text-gray-300">${escapeHtml(m.item)}</td>
                        <td class="py-3 px-3">${badge}</td>
                        <td class="py-3 px-3 text-right font-mono font-extrabold text-amber-500">${formatCurrency(m.total)}</td>
                        <td class="py-3 px-3 text-center">
                            <button onclick="viewMine(decodeURIComponent('${encodedMineId}'))" title="View order" class="bg-gray-100 dark:bg-gray-800 hover:bg-amber-500 hover:text-black text-gray-600 dark:text-gray-300 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition">
                                View
                            </button>
                        </td>
                    </tr>
                `;
            });
        }

        function renderTopSellingShirts() {
            const container = document.getElementById('topSellingShirtsList');
            container.innerHTML = '';

            const sorted = [...db.shirts].sort((a,b) => (b.soldCount || 0) - (a.soldCount || 0)).slice(0, 3);
            sorted.forEach((s, idx) => {
                container.innerHTML += `
                    <div class="bg-gray-50 dark:bg-gray-900/60 p-3.5 rounded-2xl border border-gray-200 dark:border-gray-800 flex items-center justify-between">
                        <div class="flex items-center gap-3">
                            <div class="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 font-display font-bold flex items-center justify-center text-xs">
                                #${idx+1}
                            </div>
                            <div>
                                <h4 class="font-display font-bold text-xs text-gray-900 dark:text-white">${escapeHtml(s.name)}</h4>
                                <p class="text-[10px] text-gray-500">${escapeHtml(s.category || inferProductCategory(s.name))}${formatProductVariant(s) ? ` · ${escapeHtml(formatProductVariant(s))}` : ''}</p>
                            </div>
                        </div>
                        <div class="text-right">
                            <span class="font-bold text-amber-500 text-xs font-mono">${formatCurrency(s.price)}</span>
                            <span class="block text-[10px] text-emerald-500 font-semibold">${s.soldCount || 25}+ Sold</span>
                        </div>
                    </div>
                `;
            });
        }

        function inferProductCategory(name = '') {
            if (/shoe|sneaker|sandal|boot|slipper/i.test(name)) return 'Shoes';
            if (/bag|tote|backpack|purse/i.test(name)) return 'Bags';
            if (/pant|jean|jogger|short|trouser|legging/i.test(name)) return 'Pants';
            if (/perfume|skincare|serum|beauty|mask/i.test(name)) return 'Beauty & Lifestyle';
            if (/belt|necklace|jewelry|jewellery|bracelet|accessor/i.test(name)) return 'Accessories';
            return 'Clothing & Apparel';
        }

        function formatProductVariant(product) {
            return [product.color, product.size]
                .filter(value => value && value !== 'N/A')
                .join(', ');
        }

        function cleanProductOption(value) {
            return String(value || '').trim().replace(/\s+/g, ' ');
        }

        function ensureProductOptions(snapshot = db) {
            const defaults = ['Clothing & Apparel', 'Pants', 'Bags', 'Shoes', 'Accessories', 'Beauty & Lifestyle', 'Other'];
            const stored = snapshot.productOptions || {};
            const options = {};
            for (const kind of ['categories', 'sizes']) {
                const initial = Array.isArray(stored[kind]) ? stored[kind] : kind === 'categories' ? defaults : [];
                options[kind] = [];
                for (const item of initial) {
                    const value = cleanProductOption(item);
                    if (value && !(kind === 'sizes' && value.toLowerCase() === 'n/a') && !options[kind].some(choice => choice.toLowerCase() === value.toLowerCase())) options[kind].push(value);
                }
            }
            for (const product of snapshot.shirts || []) {
                // Materialize inferred legacy categories before any rename changes their label.
                for (const [kind, field] of [['categories', 'category'], ['sizes', 'size']]) {
                    const value = cleanProductOption(product[field] || (field === 'category' ? inferProductCategory(product.name) : ''));
                    if (!value || (kind === 'sizes' && value.toLowerCase() === 'n/a')) continue;
                    const existing = options[kind].find(choice => choice.toLowerCase() === value.toLowerCase());
                    if (!existing) options[kind].push(value);
                    product[field] = existing || value;
                }
            }
            snapshot.productOptions = options;
            return options;
        }

        function productOptionUsage(snapshot, kind, value) {
            const field = kind === 'categories' ? 'category' : 'size';
            return (snapshot.shirts || []).filter(product => cleanProductOption(product[field]).toLowerCase() === value.toLowerCase()).length;
        }

        function changeProductOption(snapshot, kind, previous, next) {
            if (!['categories', 'sizes'].includes(kind)) throw new Error('Choose categories or sizes / variants first.');
            const options = ensureProductOptions(snapshot)[kind];
            const index = previous === null ? -1 : options.indexOf(previous);
            if (previous !== null && index < 0) throw new Error('This choice has changed. Select it again from the list.');
            const value = next === null ? null : cleanProductOption(next);
            if (value !== null) {
                if (!value) throw new Error('Enter a name for this choice.');
                if (value.length > 80) throw new Error('Use 80 characters or fewer.');
                if (kind === 'sizes' && value.toLowerCase() === 'n/a') throw new Error('Leave the product size blank for no size. N/A is reserved.');
                if (options.some((choice, position) => position !== index && choice.toLowerCase() === value.toLowerCase())) throw new Error('That choice already exists. Use a different name.');
            } else {
                if (index < 0) throw new Error('Select a saved choice to delete.');
                if (productOptionUsage(snapshot, kind, previous)) throw new Error('This choice is used by products. Edit their assignments before deleting it.');
            }
            if (previous === null) options.push(value);
            else if (value === null) options.splice(index, 1);
            else {
                options[index] = value;
                const field = kind === 'categories' ? 'category' : 'size';
                // Keep the older product mirror consistent, but preserve historical order text.
                for (const product of [...(snapshot.shirts || []), ...(snapshot.products || [])]) {
                    const assigned = product[field] || (field === 'category' ? inferProductCategory(product.name) : '');
                    if (cleanProductOption(assigned).toLowerCase() === previous.toLowerCase()) product[field] = value;
                }
            }
            return value;
        }

        function renderProductOptionInputs() {
            const options = ensureProductOptions();
            const category = document.getElementById('productCategoryInput');
            if (category) {
                const selected = category.value;
                category.innerHTML = (options.categories.length ? '' : '<option value="">Add a category in Products first</option>') + options.categories.map(value => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join('');
                if (options.categories.includes(selected)) category.value = selected;
            }
            const sizes = document.getElementById('productSizeChoices');
            if (sizes) sizes.innerHTML = options.sizes.map(value => `<option value="${escapeHtml(value)}"></option>`).join('');
        }

        function openProductOptions(kind) {
            productOptionKind = kind === 'sizes' ? 'sizes' : 'categories';
            document.getElementById('productOptionsPanel').classList.remove('hidden');
            document.getElementById('manageCategoriesButton').setAttribute('aria-expanded', String(productOptionKind === 'categories'));
            document.getElementById('manageSizesButton').setAttribute('aria-expanded', String(productOptionKind === 'sizes'));
            resetProductOptionForm();
            renderProductOptions();
            document.getElementById('productOptionName').focus();
        }

        function closeProductOptions() {
            const button = document.getElementById(productOptionKind === 'sizes' ? 'manageSizesButton' : 'manageCategoriesButton');
            productOptionKind = null;
            productOptionEditing = null;
            document.getElementById('productOptionsPanel').classList.add('hidden');
            document.getElementById('manageCategoriesButton').setAttribute('aria-expanded', 'false');
            document.getElementById('manageSizesButton').setAttribute('aria-expanded', 'false');
            button.focus();
        }

        function resetProductOptionForm(value = null) {
            productOptionEditing = value;
            const category = productOptionKind === 'categories';
            document.getElementById('productOptionName').value = value || '';
            document.getElementById('productOptionName').placeholder = category ? 'e.g. Dresses' : 'e.g. XXL, 100ml, One Size';
            document.getElementById('productOptionLabel').textContent = value === null ? (category ? 'Category name' : 'Size / variant name') : `Rename ${value}`;
            document.getElementById('productOptionSave').textContent = value === null ? (category ? 'Add category' : 'Add size / variant') : 'Save name';
            document.getElementById('productOptionCancel').classList.toggle('hidden', value === null);
            showProductOptionsMessage('');
            document.getElementById('productOptionName').focus();
        }

        function showProductOptionsMessage(message, error = false) {
            const status = document.getElementById('productOptionsMessage');
            status.textContent = message;
            status.className = `mt-2 min-h-5 text-xs ${error ? 'text-rose-700 dark:text-rose-300' : 'text-gray-600 dark:text-gray-400'}`;
        }

        function renderProductOptions() {
            if (!productOptionKind) return;
            const options = ensureProductOptions()[productOptionKind];
            document.getElementById('productOptionsTitle').textContent = productOptionKind === 'categories' ? 'Manage categories' : 'Manage sizes / variants';
            const list = document.getElementById('productOptionsList');
            list.replaceChildren();
            if (!options.length) {
                const empty = document.createElement('li');
                empty.className = 'py-4 text-sm text-gray-600 dark:text-gray-400';
                empty.textContent = 'No saved choices yet. Add your first choice above.';
                list.appendChild(empty);
            }
            for (const value of options) {
                const count = productOptionUsage(db, productOptionKind, value);
                const row = document.createElement('li');
                row.className = 'flex items-center justify-between gap-3 py-2';
                row.innerHTML = '<div class="min-w-0"><span class="block break-all text-sm font-medium"></span><small class="text-xs text-gray-600 dark:text-gray-400"></small></div><div class="flex shrink-0 gap-1"><button type="button" class="btn-ghost min-h-9 px-3 text-xs">Edit</button><button type="button" class="btn-ghost min-h-9 px-3 text-xs text-rose-700 dark:text-rose-300 disabled:cursor-not-allowed disabled:opacity-50">Delete</button></div>';
                row.querySelector('span').textContent = value;
                row.querySelector('small').textContent = `${count} ${count === 1 ? 'product' : 'products'}${count ? ' · Reassign before deleting' : ''}`;
                const [edit, remove] = row.querySelectorAll('button');
                edit.setAttribute('aria-label', `Edit ${value}`);
                edit.onclick = () => resetProductOptionForm(value);
                remove.setAttribute('aria-label', `Delete ${value}`);
                remove.disabled = count > 0;
                remove.onclick = () => deleteProductOption(productOptionKind, value);
                list.appendChild(row);
            }
        }

        function canManageProductOptions() {
            const message = !navigator.onLine ? 'Offline view only. Reconnect to change choices.' : !localWorkspaceReady || !currentAuthUser ? 'Sign in and wait for your workspace to load first.' : '';
            if (message) showProductOptionsMessage(message, true);
            return !message;
        }

        async function saveProductOption(event) {
            event.preventDefault();
            if (!canManageProductOptions()) return;
            const kind = productOptionKind;
            const previous = productOptionEditing;
            try {
                const value = changeProductOption(db, kind, previous, document.getElementById('productOptionName').value);
                const filter = document.getElementById(kind === 'categories' ? 'productsCategoryFilter' : 'productsSizeFilter');
                if (previous !== null && filter.value === previous) filter.options[filter.selectedIndex].value = value;
                if (kind === 'categories' && document.getElementById('productCategoryInput').value === previous) {
                    const select = document.getElementById('productCategoryInput');
                    select.options[select.selectedIndex].value = value;
                }
                if (kind === 'sizes' && document.getElementById('shirtSizeInput').value === previous) document.getElementById('shirtSizeInput').value = value;
                recordAuditEvent(previous === null ? 'Added choice' : 'Renamed choice', kind === 'categories' ? 'Product category' : 'Product size / variant', value, previous === null ? value : `${previous} → ${value}`);
                saveToLocalStorage();
                resetProductOptionForm();
                showProductOptionsMessage('Saving…');
                const saved = await localPersistPromise;
                showProductOptionsMessage(saved ? (previous === null ? 'Choice added.' : 'Name updated on matching products.') : 'Could not save on this device. Keep this page open and retry when storage is available.', !saved);
            } catch (error) {
                showProductOptionsMessage(error.message, true);
            }
        }

        async function deleteProductOption(kind, value) {
            if (!canManageProductOptions()) return;
            if (!await showAppConfirm('Delete this choice?', `Remove “${value}” from the saved choices? Products and previous sales will be kept.`, 'Delete choice', true)) return;
            if (!canManageProductOptions()) return;
            try {
                changeProductOption(db, kind, value, null);
                recordAuditEvent('Deleted choice', kind === 'categories' ? 'Product category' : 'Product size / variant', value, value);
                saveToLocalStorage();
                if (productOptionEditing === value) resetProductOptionForm();
                showProductOptionsMessage('Saving…');
                const saved = await localPersistPromise;
                showProductOptionsMessage(saved ? 'Choice deleted.' : 'Could not save on this device. Keep this page open and retry when storage is available.', !saved);
            } catch (error) {
                showProductOptionsMessage(error.message, true);
            }
        }

        function renderProductsCatalog() {
            const grid = document.getElementById('productsCatalogGrid');
            grid.innerHTML = '';
            const search = (document.getElementById('productsSearch')?.value || '').trim().toLowerCase();
            const sizeSelect = document.getElementById('productsSizeFilter');
            const previousSize = sizeSelect?.value || '';
            const categorySelect = document.getElementById('productsCategoryFilter');
            const previousCategory = categorySelect?.value || '';
            const { categories, sizes: savedSizes } = ensureProductOptions();
            if (categorySelect) {
                categorySelect.innerHTML = '<option value="">All categories</option>' + categories.map(category => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`).join('');
                categorySelect.value = categories.includes(previousCategory) ? previousCategory : '';
            }
            if (sizeSelect) {
                const sizes = [...savedSizes].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
                sizeSelect.innerHTML = '<option value="">All sizes & variants</option>' + sizes.map(size => `<option value="${escapeHtml(size)}">${escapeHtml(size)}</option>`).join('');
                sizeSelect.value = sizes.includes(previousSize) ? previousSize : '';
            }
            const selectedSize = sizeSelect?.value || '';
            const selectedCategory = categorySelect?.value || '';
            const stockFilter = document.getElementById('productsStockFilter')?.value || '';
            const products = db.shirts.filter(s => {
                const sku = `CM-${String(s.id).toUpperCase()}`;
                const stock = Number(s.qty || 0);
                const category = s.category || inferProductCategory(s.name);
                if (search && !`${s.name} ${s.color} ${s.size} ${category} ${sku}`.toLowerCase().includes(search)) return false;
                if (selectedCategory && category !== selectedCategory) return false;
                if (selectedSize && String(s.size) !== selectedSize) return false;
                if (stockFilter === 'out' && stock > 0) return false;
                if (stockFilter === 'low' && (stock <= 0 || stock > 5)) return false;
                if (stockFilter === 'in' && stock <= 5) return false;
                return true;
            });
            document.getElementById('productsResultCount').textContent = `Showing ${products.length} of ${db.shirts.length} products`;
            if (!products.length) {
                grid.innerHTML = '<div class="sm:col-span-2 lg:col-span-3 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 p-8 text-center text-sm text-gray-500">No products match these filters. Try another search or category.</div>';
                return;
            }

            products.forEach(s => {
                const qty = Number(s.qty || 0);
                const category = s.category || inferProductCategory(s.name);
                const stockStatus = qty <= 0
                    ? '<span class="bg-rose-500/10 text-rose-600 dark:text-rose-400 px-2.5 py-1 rounded-full text-[10px] font-bold">Out of stock</span>'
                    : qty <= 5
                        ? '<span class="bg-amber-500/10 text-amber-700 dark:text-amber-400 px-2.5 py-1 rounded-full text-[10px] font-bold">Low stock</span>'
                        : '<span class="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 rounded-full text-[10px] font-bold">In stock</span>';
                const sku = `CM-${String(s.id).toUpperCase()}`;
                grid.innerHTML += `
                    <div class="bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 flex flex-col justify-between space-y-4">
                        <div>
                            <div class="flex items-start justify-between">
                                <h4 class="font-display font-bold text-gray-900 dark:text-white text-sm">${escapeHtml(s.name)}</h4>
                                ${stockStatus}
                            </div>
                            <div class="flex items-center gap-2 mt-1"><span class="text-[11px] text-gray-500 font-mono">SKU: ${escapeHtml(sku)}</span><span class="text-[10px] text-gray-500 border border-gray-200 dark:border-gray-700 rounded-md px-1.5 py-0.5">${escapeHtml(category)}</span></div>
                            <p class="text-xs text-gray-500 mt-1">${s.size && s.size !== 'N/A' ? `Size / variant: <strong class="text-gray-700 dark:text-gray-300">${escapeHtml(s.size)}</strong>` : ''}${s.size && s.size !== 'N/A' && s.color && s.color !== 'N/A' ? ' | ' : ''}${s.color && s.color !== 'N/A' ? `Color: <strong class="text-gray-700 dark:text-gray-300">${escapeHtml(s.color)}</strong>` : ''}</p>
                            <p class="text-sm font-bold text-gray-800 dark:text-gray-200 mt-3">${qty} <span class="text-xs font-medium text-gray-500">in stock</span></p>
                        </div>
                        <div class="grid grid-cols-2 gap-2 bg-white dark:bg-[#161922] p-3 rounded-xl border border-gray-200 dark:border-gray-800 text-xs">
                            <div>
                                <span class="text-gray-400 text-[10px] block uppercase">Cost</span>
                                <span class="font-mono text-gray-600 dark:text-gray-300">${formatCurrency(s.cost)}</span>
                            </div>
                            <div>
                                <span class="text-gray-400 text-[10px] block uppercase">Price</span>
                                <span class="font-mono font-bold text-amber-500">${formatCurrency(s.price)}</span>
                            </div>
                        </div>
                        <div class="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-800">
                            <div class="flex items-center gap-2">
                                <button onclick="editShirt('${s.id}')" class="bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-indigo-100">Edit</button>
                                <button onclick="deleteShirt('${s.id}')" class="text-gray-400 hover:text-rose-500 p-2 text-xs"><i class="fa-solid fa-trash"></i></button>
                            </div>
                            <div>
                                <button onclick="restockShirt('${s.id}')" class="bg-gray-100 dark:bg-gray-800 hover:bg-amber-500 hover:text-black text-gray-700 dark:text-gray-300 px-3 py-1.5 rounded-lg text-xs font-semibold transition">
                                    <i class="fa-solid fa-plus"></i> Restock
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            });
        }

        function showLowStockProducts() {
            const stockFilter = document.getElementById('productsStockFilter');
            if (stockFilter) stockFilter.value = 'low';
            switchTab('products');
        }

        function renderStockTable() {
            const tbody = document.getElementById('stockTableBody');
            tbody.innerHTML = '';
            const search = (document.getElementById('stockSearch')?.value || '').trim().toLowerCase();
            const stockFilter = selectedStockFilter;
            const totalProducts = db.shirts.length;
            const inStockCount = db.shirts.filter(product => Number(product.qty || 0) > 5).length;
            const lowCount = db.shirts.filter(product => Number(product.qty || 0) > 0 && Number(product.qty || 0) <= 5).length;
            const outCount = db.shirts.filter(product => Number(product.qty || 0) <= 0).length;
            const statuses = [
                { key: 'in', label: 'In stock', count: inStockCount, textClass: 'text-emerald-600 dark:text-emerald-400', barClass: 'bg-emerald-500', hoverClass: 'hover:border-emerald-500/50' },
                { key: 'low', label: 'Low stock', count: lowCount, textClass: 'text-amber-600 dark:text-amber-400', barClass: 'bg-amber-500', hoverClass: 'hover:border-amber-500/50' },
                { key: 'out', label: 'Out of stock', count: outCount, textClass: 'text-rose-600 dark:text-rose-400', barClass: 'bg-rose-500', hoverClass: 'hover:border-rose-500/50' }
            ];
            document.getElementById('stockStatusAnalytics').innerHTML = statuses.map(status => {
                const share = totalProducts ? Math.round(status.count / totalProducts * 100) : 0;
                const selected = stockFilter === status.key;
                return `
                    <button type="button" onclick="setStockStatusFilter('${status.key}')" aria-pressed="${selected}" class="group overflow-hidden rounded-xl border border-gray-200 bg-white text-left transition hover:border-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:border-gray-800 dark:bg-gray-900/60 dark:hover:border-gray-700 ${selected ? 'ring-2 ring-amber-500' : ''}">
                        <span class="block border-b border-gray-100 bg-gray-50/70 px-4 py-3 text-xs font-semibold text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300">${status.label}</span>
                        <span class="flex items-center justify-between gap-3 px-4 py-3.5">
                            <span class="flex min-w-0 items-baseline gap-2">
                                <span class="font-mono text-2xl font-bold tabular-nums ${status.textClass}">${status.count}</span>
                                <span class="truncate text-xs text-gray-500 dark:text-gray-400">of ${totalProducts} products</span>
                            </span>
                            <span class="shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold tabular-nums ${status.textClass} ${status.key === 'in' ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/40' : status.key === 'low' ? 'border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40' : 'border-rose-200 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/40'}">${share}%</span>
                        </span>
                    </button>
                `;
            }).join('');
            const summary = document.getElementById('stockSummary');
            summary.className = lowCount || outCount
                ? 'text-xs px-3 py-1.5 rounded-xl font-bold border bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20'
                : 'text-xs px-3 py-1.5 rounded-xl font-bold border bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
            summary.innerHTML = lowCount || outCount
                ? `<i class="fa-solid fa-triangle-exclamation mr-1" aria-hidden="true"></i>${lowCount} low-stock · ${outCount} out of stock`
                : '<i class="fa-solid fa-circle-check mr-1" aria-hidden="true"></i>Stock Healthy';

            const filtered = db.shirts.filter(product => {
                const quantity = Number(product.qty || 0);
                const sku = product.sku || `CM-${String(product.id).toUpperCase()}`;
                const category = product.category || inferProductCategory(product.name);
                const searchable = `${product.name} ${sku} ${category} ${formatProductVariant(product)}`.toLowerCase();
                if (search && !searchable.includes(search)) return false;
                if (stockFilter === 'in' && quantity <= 5) return false;
                if (stockFilter === 'low' && (quantity <= 0 || quantity > 5)) return false;
                if (stockFilter === 'out' && quantity > 0) return false;
                return true;
            });
            const activeFilters = [search, stockFilter].filter(Boolean).length;
            const filterCount = document.getElementById('stockActiveFilterCount');
            filterCount.textContent = activeFilters;
            filterCount.classList.toggle('hidden', activeFilters === 0);
            document.querySelectorAll('.stock-status-option').forEach(option => {
                option.setAttribute('aria-pressed', String(option.dataset.stockStatusFilter === stockFilter));
            });
            const pageCount = Math.max(1, Math.ceil(filtered.length / stockPageSize));
            stockPage = Math.min(Math.max(1, stockPage), pageCount);
            const startIndex = filtered.length ? (stockPage - 1) * stockPageSize : 0;
            const pageProducts = filtered.slice(startIndex, startIndex + stockPageSize);
            const endIndex = Math.min(startIndex + pageProducts.length, filtered.length);
            document.getElementById('stockResultCount').textContent = `Showing ${filtered.length ? startIndex + 1 : 0}–${endIndex} of ${filtered.length} products`;
            if (!filtered.length) {
                tbody.innerHTML = `<tr><td colspan="8" class="py-12 px-4 text-center text-sm text-gray-500">No products match these filters. Try another search or clear filters.</td></tr>`;
            } else {
                pageProducts.forEach((s, index) => {
                    const quantity = Math.max(0, Number(s.qty || 0));
                    const sku = s.sku || `CM-${String(s.id).toUpperCase()}`;
                    const productDetails = [s.category || inferProductCategory(s.name), formatProductVariant(s)].filter(Boolean).join(' · ');
                    const statusBadge = quantity > 5
                        ? '<span class="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 rounded-full font-bold text-[10px]">In Stock</span>'
                        : quantity > 0
                            ? '<span class="bg-amber-500/10 text-amber-700 dark:text-amber-300 px-2.5 py-1 rounded-full font-bold text-[10px]">Low Stock</span>'
                            : '<span class="bg-rose-500/10 text-rose-600 dark:text-rose-400 px-2.5 py-1 rounded-full font-bold text-[10px]">Out of Stock</span>';
                    tbody.innerHTML += `
                        <tr class="transition-colors hover:bg-gray-50/80 dark:hover:bg-gray-800/50">
                            <td class="px-4 py-3.5 text-right font-mono tabular-nums text-gray-500 dark:text-gray-400">${String(startIndex + index + 1).padStart(2, '0')}</td>
                            <td class="px-4 py-3.5">
                                <span class="block font-semibold text-gray-900 dark:text-white">${escapeHtml(s.name)}</span>
                                <span class="mt-0.5 block font-mono text-[11px] text-gray-500 dark:text-gray-400">${escapeHtml(sku)}</span>
                            </td>
                            <td class="px-3 py-3.5 text-gray-600 dark:text-gray-300">${escapeHtml(productDetails)}</td>
                            <td class="px-3 py-3.5 font-mono text-gray-600 dark:text-gray-300">${formatCurrency(s.cost)}</td>
                            <td class="px-3 py-3.5 font-mono font-semibold text-amber-600 dark:text-amber-400">${formatCurrency(s.price)}</td>
                            <td class="px-3 py-3.5 font-mono font-semibold text-gray-900 dark:text-white">${quantity} units</td>
                            <td class="px-3 py-3.5">${statusBadge}</td>
                            <td class="px-4 py-3.5 text-right">
                                <button id="stock-view-${escapeHtml(s.id)}" type="button" data-stock-id="${escapeHtml(s.id)}" onclick="viewStockProduct(this.dataset.stockId)" class="btn-outline px-3 py-1.5 text-xs font-semibold transition">
                                    <i class="fa-regular fa-eye mr-1" aria-hidden="true"></i>View
                                </button>
                            </td>
                        </tr>
                    `;
                });
            }
            const pagination = document.getElementById('stockTablePagination');
            const pageButtons = [];
            const firstPage = Math.max(1, Math.min(stockPage - 2, pageCount - 4));
            const lastPage = Math.min(pageCount, firstPage + 4);
            for (let page = firstPage; page <= lastPage; page += 1) {
                pageButtons.push(`<button type="button" onclick="goToStockPage(${page})" aria-label="Page ${page}" aria-current="${page === stockPage ? 'page' : 'false'}" class="${page === stockPage ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900' : 'btn-outline'} inline-flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-xs">${page}</button>`);
            }
            pagination.innerHTML = `
                <div class="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400"><span>Rows per page</span><span class="rounded-md border border-gray-200 px-2 py-1 font-medium text-gray-700 dark:border-gray-700 dark:text-gray-200">10</span><span class="ml-2 tabular-nums">${filtered.length ? `${startIndex + 1}–${endIndex} of ${filtered.length}` : '0 results'}</span></div>
                <nav aria-label="Stock table pages" class="flex items-center justify-end gap-1">
                    <button type="button" onclick="goToStockPage(${stockPage - 1})" aria-label="Previous page" ${stockPage <= 1 ? 'disabled' : ''} class="btn-outline inline-flex h-8 w-8 items-center justify-center disabled:cursor-not-allowed disabled:opacity-40"><i class="fa-solid fa-chevron-left text-[10px]" aria-hidden="true"></i></button>
                    ${pageButtons.join('')}
                    <button type="button" onclick="goToStockPage(${stockPage + 1})" aria-label="Next page" ${stockPage >= pageCount ? 'disabled' : ''} class="btn-outline inline-flex h-8 w-8 items-center justify-center disabled:cursor-not-allowed disabled:opacity-40"><i class="fa-solid fa-chevron-right text-[10px]" aria-hidden="true"></i></button>
                </nav>
            `;
        }

        function toggleStockFilters() {
            const panel = document.getElementById('stockFiltersPanel');
            const button = document.getElementById('stockFiltersButton');
            const isOpen = panel.classList.toggle('hidden') === false;
            button.setAttribute('aria-expanded', String(isOpen));
        }

        function chooseStockStatusFilter(status) {
            selectedStockFilter = status;
            document.getElementById('stockFiltersPanel').classList.add('hidden');
            document.getElementById('stockFiltersButton').setAttribute('aria-expanded', 'false');
            stockPage = 1;
            renderStockTable();
        }

        function goToStockPage(page) {
            stockPage = Math.max(1, Math.floor(Number(page) || 1));
            renderStockTable();
        }

        function setStockStatusFilter(status) {
            selectedStockFilter = selectedStockFilter === status ? '' : status;
            stockPage = 1;
            renderStockTable();
        }

        function viewStockProduct(id) {
            const product = db.shirts.find(item => item.id === id);
            if (!product) return;
            const modal = document.getElementById('modalStockProduct');
            const quantity = Math.max(0, Number(product.qty || 0));
            const sku = product.sku || `CM-${String(product.id).toUpperCase()}`;
            const status = document.getElementById('stockProductStatus');
            modal.dataset.stockId = id;
            stockModalReturnFocus = document.activeElement;
            document.getElementById('stockProductTitle').textContent = product.name || 'Product details';
            document.getElementById('stockProductSku').textContent = `SKU: ${sku}`;
            document.getElementById('stockProductVariant').textContent = [product.category || inferProductCategory(product.name), formatProductVariant(product)].filter(Boolean).join(' · ');
            document.getElementById('stockProductQuantity').textContent = `${quantity} units`;
            document.getElementById('stockProductCost').textContent = formatCurrency(product.cost);
            document.getElementById('stockProductPrice').textContent = formatCurrency(product.price);
            status.textContent = quantity > 5 ? 'In Stock' : quantity > 0 ? 'Low Stock' : 'Out of Stock';
            status.className = quantity > 5 ? 'font-semibold text-emerald-600 dark:text-emerald-400' : quantity > 0 ? 'font-semibold text-amber-700 dark:text-amber-300' : 'font-semibold text-rose-600 dark:text-rose-400';
            modal.classList.remove('hidden');
            document.getElementById('stockProductClose').focus();
        }

        function closeStockProductModal() {
            const modal = document.getElementById('modalStockProduct');
            modal.classList.add('hidden');
            delete modal.dataset.stockId;
            stockModalReturnFocus?.focus();
            stockModalReturnFocus = null;
        }

        function restockStockProduct() {
            const id = document.getElementById('modalStockProduct').dataset.stockId;
            if (!id) return closeStockProductModal();
            closeStockProductModal();
            restockShirt(id);
        }

        function editStockProduct() {
            const id = document.getElementById('modalStockProduct').dataset.stockId;
            if (!id) return closeStockProductModal();
            closeStockProductModal();
            editShirt(id);
        }

        function renderMineSessionTabs() {
            const container = document.getElementById('mineSessionTabs');
            if (!container) return;
            const today = localDateKey();
            const sessions = (db.liveSessions || [])
                .filter(session => session.date === today && isLiveSessionActive(session))
                .sort((a, b) => String(a.startedAt || '').localeCompare(String(b.startedAt || '')));
            const historySessions = (db.liveSessions || []).filter(session => !session.deletedAt && (session.date !== today || !isLiveSessionActive(session)));
            const historySessionIds = new Set(historySessions.map(session => session.id));
            const knownSessionIds = new Set((db.liveSessions || []).map(session => session.id));
            const historyCount = db.mines.filter(mine => historySessionIds.has(mine.sessionId) || !mine.sessionId || !knownSessionIds.has(mine.sessionId)).length;
            const sessionTabs = sessions.map(session => {
                const count = db.mines.filter(mine => mine.sessionId === session.id).length;
                const active = mineSessionView === session.id;
                const encodedSessionId = encodeURIComponent(String(session.id || '')).replace(/'/g, '%27');
                return `<span class="inline-flex items-center border-b-2 ${active ? 'border-amber-500' : 'border-transparent'}"><button role="tab" aria-selected="${active}" onclick="selectMineSession(decodeURIComponent('${encodedSessionId}'))" class="mine-session-tab ${active ? 'is-active' : ''}">${escapeHtml(session.name)}<span class="mine-session-tab-count">${count}</span></button><button type="button" onclick="requestDeleteLiveSession(decodeURIComponent('${encodedSessionId}'))" class="px-2 text-xs text-gray-400 hover:text-rose-600" aria-label="Delete ${escapeHtml(session.name)}"><i class="fa-solid fa-trash-can" aria-hidden="true"></i></button></span>`;
            }).join('');
            const liveStatus = document.getElementById('mineLiveStatus');
            const activeSession = getActiveLiveSession();
            if (liveStatus) {
                liveStatus.innerHTML = activeSession
                    ? `<i class="fa-solid fa-circle text-[9px] text-emerald-500"></i><span>Live session active:</span><strong class="font-semibold text-gray-900 dark:text-white">${escapeHtml(activeSession.name)}</strong>`
                    : '<i class="fa-regular fa-circle text-[9px] text-gray-400"></i><span>No active live session. Start one before recording a mine.</span>';
            }
            const selectedSession = (db.liveSessions || []).find(session => session.id === mineSessionView);
            const historyActive = mineSessionView === '__history__' || mineSessionView === '__legacy__' || (selectedSession && !sessions.includes(selectedSession));
            const unpaidActive = mineSessionView === '__unpaid__';
            const itemStatusActive = mineSessionView === '__item_status__';
            const invoicesActive = mineSessionView === '__invoices__';
            const unpaidCount = getOutstandingMineOrders().length;
            const itemStatusCount = (db.mines || []).filter(mine => !['SHIPPED', 'PICK UP', 'MAXIM'].includes(String(mine.deliveryStatus || 'PENDING').toUpperCase())).length;
            const invoiceCount = getBuyerInvoiceGroups().length;
            container.innerHTML = `${sessionTabs || '<span class="px-3 py-3 text-xs text-gray-500">No live sessions yet</span>'}<button role="tab" aria-selected="${historyActive}" onclick="selectMineSession('__history__')" class="mine-session-tab ${historyActive ? 'is-active' : ''}">History<span class="mine-session-tab-count">${historyCount}</span></button><button role="tab" aria-selected="${unpaidActive}" onclick="selectMineSession('__unpaid__')" class="mine-session-tab ${unpaidActive ? 'is-active' : ''}"><i class="fa-solid fa-hourglass-half mr-1.5 text-[10px]" aria-hidden="true"></i>Unpaid<span class="mine-session-tab-count">${unpaidCount}</span></button><button role="tab" aria-selected="${itemStatusActive}" onclick="selectMineSession('__item_status__')" class="mine-session-tab ${itemStatusActive ? 'is-active' : ''}">Item Status<span class="mine-session-tab-count">${itemStatusCount}</span></button><button role="tab" aria-selected="${invoicesActive}" onclick="selectMineSession('__invoices__')" class="mine-session-tab ${invoicesActive ? 'is-active' : ''}">Invoices<span class="mine-session-tab-count">${invoiceCount}</span></button>`;
        }

        function getBuyerInvoiceGroups() {
            const groups = new Map();
            (db.mines || []).filter(isReportableMine).forEach(mine => {
                const buyerName = String(mine.name || 'Unknown buyer').trim().replace(/\s+/g, ' ') || 'Unknown buyer';
                const buyerKey = buyerName.toLocaleLowerCase();
                const sessionKey = mine.sessionId || `legacy:${mine.date}`;
                const key = `${sessionKey}::${buyerKey}`;
                if (!groups.has(key)) {
                    const session = (db.liveSessions || []).find(item => item.id === mine.sessionId);
                    groups.set(key, {
                        key,
                        buyer: buyerName,
                        sessionName: session?.name || (mine.sessionId ? 'Earlier live session' : 'Earlier order'),
                        orders: []
                    });
                }
                groups.get(key).orders.push(mine);
            });
            return [...groups.values()].map(group => {
                group.orders.sort((first, second) => `${first.date || ''} ${first.time || ''}`.localeCompare(`${second.date || ''} ${second.time || ''}`));
                group.total = 0;
                group.collected = 0;
                group.balance = 0;
                group.orders.forEach(order => {
                    const amounts = getReportOrderAmounts(order);
                    group.total += amounts.total;
                    group.collected += amounts.collected;
                    group.balance += amounts.balance;
                });
                group.allPaid = group.orders.length > 0 && group.balance <= 0 && group.orders.every(order => getMinePaymentStatus(order) === 'PAID');
                let hash = 2166136261;
                for (let index = 0; index < group.key.length; index += 1) hash = Math.imul(hash ^ group.key.charCodeAt(index), 16777619);
                group.receiptNumber = `CM-${String(group.orders[0].date || '').replace(/-/g, '')}-${(hash >>> 0).toString(36).toUpperCase()}`;
                return group;
            }).sort((first, second) => `${second.orders[0]?.date || ''} ${second.orders[0]?.time || ''}`.localeCompare(`${first.orders[0]?.date || ''} ${first.orders[0]?.time || ''}`));
        }

        function renderBuyerInvoices() {
            const container = document.getElementById('mineInvoiceGroups');
            if (!container) return;
            const searchInput = document.getElementById('mineInvoiceSearch');
            const query = String(searchInput?.value || '').trim().toLocaleLowerCase();
            const groups = getBuyerInvoiceGroups().filter(group => !query || `${group.buyer} ${group.sessionName} ${group.orders.map(order => `${order.item || ''} ${order.sku || ''}`).join(' ')}`.toLocaleLowerCase().includes(query));
            if (!groups.length) {
                container.innerHTML = '<div class="rounded-xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500 dark:border-gray-700">No buyer invoices match your search yet.</div>';
                return;
            }
            container.innerHTML = groups.map(group => {
                const statusLabel = group.allPaid ? 'Fully paid' : group.collected > 0 ? 'Partially paid' : 'Unpaid';
                const statusClass = group.allPaid ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300' : group.collected > 0 ? 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300' : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300';
                const rows = group.orders.map(order => {
                    const amounts = getReportOrderAmounts(order);
                    return `<tr class="border-t border-gray-100 dark:border-gray-800"><td class="px-3 py-2.5">${escapeHtml(reportDateLabel(order.date, { month: 'short', day: 'numeric', year: 'numeric' }))}</td><td class="px-3 py-2.5"><div class="font-medium text-gray-900 dark:text-white">${escapeHtml(order.item || 'Item')}</div><div class="text-[10px] text-gray-500">Item ID: ${escapeHtml(order.sku || '—')}</div></td><td class="px-3 py-2.5 text-right font-mono">${formatCurrency(amounts.total)}</td><td class="px-3 py-2.5 text-right font-mono text-emerald-700 dark:text-emerald-300">${formatCurrency(amounts.collected)}</td><td class="px-3 py-2.5 text-right font-mono ${amounts.balance > 0 ? 'text-rose-700 dark:text-rose-300' : 'text-gray-500'}">${formatCurrency(amounts.balance)}</td></tr>`;
                }).join('');
                const action = group.allPaid
                    ? `<button type="button" data-print-invoice="${escapeHtml(group.key)}" class="btn-primary inline-flex items-center gap-2 px-3 py-2 text-xs"><i class="fa-solid fa-print" aria-hidden="true"></i>Print sales receipt</button>`
                    : `<button type="button" disabled class="btn-outline inline-flex cursor-not-allowed items-center gap-2 px-3 py-2 text-xs opacity-60"><i class="fa-solid fa-lock" aria-hidden="true"></i>Waiting for full payment</button>`;
                return `<details class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900/60"><summary class="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 px-4 py-3"><span><strong class="block text-sm text-gray-950 dark:text-white">${escapeHtml(group.buyer)}</strong><span class="mt-1 block text-xs text-gray-500">${escapeHtml(group.sessionName)} · ${group.orders.length} ${group.orders.length === 1 ? 'item' : 'items'} · Receipt ${escapeHtml(group.receiptNumber)}</span></span><span class="flex flex-wrap items-center gap-3"><span class="rounded-full border px-2.5 py-1 text-[10px] font-semibold ${statusClass}">${statusLabel}</span><strong class="font-mono text-sm text-gray-950 dark:text-white">${formatCurrency(group.total)}</strong></span></summary><div class="border-t border-gray-100 p-4 dark:border-gray-800"><div class="overflow-x-auto"><table class="w-full min-w-[620px] text-left text-xs"><thead class="text-[10px] uppercase tracking-wide text-gray-500"><tr><th class="px-3 py-2">Date</th><th class="px-3 py-2">Item</th><th class="px-3 py-2 text-right">Total</th><th class="px-3 py-2 text-right">Paid</th><th class="px-3 py-2 text-right">Balance</th></tr></thead><tbody>${rows}</tbody></table></div><div class="mt-4 flex flex-col gap-3 border-t border-gray-100 pt-3 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between"><p class="text-xs text-gray-500">Collected ${formatCurrency(group.collected)} · Balance due ${formatCurrency(group.balance)}</p>${action}</div></div></details>`;
            }).join('');
            container.querySelectorAll('[data-print-invoice]').forEach(button => button.addEventListener('click', () => printBuyerReceipt(button.dataset.printInvoice)));
        }

        function printBuyerReceipt(groupKey) {
            const group = getBuyerInvoiceGroups().find(item => item.key === groupKey);
            if (!group || !group.allPaid) {
                showToast('A sales receipt is available after every item is fully paid.', true);
                return;
            }
            const printArea = document.getElementById('receiptPrintArea');
            if (!printArea) return;
            const itemRows = group.orders.map((order, index) => `<tr><td style="padding:6px 0;border-bottom:1px dashed #999;overflow-wrap:anywhere">${index + 1}. ${escapeHtml(order.item || 'Item')}<br><small>ITEM ID: ${escapeHtml(order.sku || '—')}</small></td><td style="padding:6px 0;border-bottom:1px dashed #999;text-align:right;white-space:nowrap">${formatCurrency(getReportOrderAmounts(order).total)}</td></tr>`).join('');
            const paymentMethods = [...new Set(group.orders.map(order => order.mop).filter(Boolean))].join(', ') || '—';
            printArea.innerHTML = `<main style="box-sizing:border-box;width:72mm;max-width:100%;margin:0 auto;padding:3mm 2mm;color:#111;background:#fff;font-family:'Courier New',Courier,monospace;font-size:11px;line-height:1.4"><header style="text-align:center;padding-bottom:8px;border-bottom:1px dashed #555"><img src="images/coverimage.jpg" alt="Clothes Mania Davao" style="display:block;width:62mm;max-width:100%;height:30mm;object-fit:contain;margin:0 auto 5px"><h1 style="margin:0;font-size:13px;font-weight:700;letter-spacing:.04em">**** INVOICE / RECEIPT ****</h1></header><section style="padding:9px 0;border-bottom:1px dashed #555;overflow-wrap:anywhere"><div>BUYER: ${escapeHtml(group.buyer)}</div><div>DATE: ${escapeHtml(group.orders[0]?.date || '')}</div><div>LIVE: ${escapeHtml(group.sessionName)}</div><div>RECEIPT #: ${escapeHtml(group.receiptNumber)}</div><div>ISSUED: ${escapeHtml(new Date().toLocaleString('en-PH'))}</div></section><table style="width:100%;border-collapse:collapse;margin-top:7px;font-size:11px"><thead><tr><th style="padding:3px 0;text-align:left;border-bottom:1px solid #111">ITEM</th><th style="padding:3px 0;text-align:right;border-bottom:1px solid #111">PRICE</th></tr></thead><tbody>${itemRows}</tbody></table><table style="width:100%;border-collapse:collapse;margin-top:8px;font-size:11px"><tbody><tr><td style="padding:3px 0">TOTAL</td><td style="padding:3px 0;text-align:right">${formatCurrency(group.total)}</td></tr><tr><td style="padding:3px 0">PAID</td><td style="padding:3px 0;text-align:right">${formatCurrency(group.collected)}</td></tr><tr><td style="padding:3px 0">BALANCE</td><td style="padding:3px 0;text-align:right">${formatCurrency(group.balance)}</td></tr></tbody></table><div style="padding:6px 0;border-bottom:1px dashed #555">PAYMENT: ${escapeHtml(paymentMethods)}</div><footer style="padding-top:10px;text-align:center;overflow-wrap:anywhere"><p style="margin:0 0 8px;font-weight:700">THANK YOU FOR SHOPPING WITH US<br>LET YOUR STYLE BE THE SPOTLIGHT</p><p style="margin:0 0 3px;font-weight:700">STORE LOCATION</p><p style="margin:0">Door 1F Ground Floor DSTI Bldg., Watusi Street, Buhangin, Davao City, Philippines, 8000</p></footer></main>`;
            const cleanup = () => {
                document.body.classList.remove('printing-receipt');
                printArea.innerHTML = '';
            };
            window.addEventListener('afterprint', cleanup, { once: true });
            document.body.classList.add('printing-receipt');
            window.print();
            setTimeout(cleanup, 60000);
        }

        function getOutstandingMineOrders() {
            return (db.mines || [])
                .filter(isReportableMine)
                .map(mine => ({ mine, ...getReportOrderAmounts(mine) }))
                .filter(order => order.balance > 0);
        }

        function getUnpaidAgeDays(dateKey) {
            if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dateKey || ''))) return 0;
            const orderDate = new Date(`${dateKey}T12:00:00`);
            if (Number.isNaN(orderDate.getTime())) return 0;
            const today = new Date();
            today.setHours(12, 0, 0, 0);
            return Math.max(0, Math.floor((today - orderDate) / 86400000));
        }

        function renderUnpaidLedger() {
            const orders = getOutstandingMineOrders();
            const years = [...new Set(orders.map(({ mine }) => String(mine.date).slice(0, 4)).filter(year => /^\d{4}$/.test(year)))].sort((a, b) => b.localeCompare(a));
            const yearSelect = document.getElementById('unpaidLedgerYear');
            const monthSelect = document.getElementById('unpaidLedgerMonth');
            if (yearSelect) {
                yearSelect.innerHTML = `<option value="all">All years</option>${years.map(year => `<option value="${year}">${year}</option>`).join('')}`;
                yearSelect.value = years.includes(unpaidLedgerYear) ? unpaidLedgerYear : 'all';
                unpaidLedgerYear = yearSelect.value;
            }
            if (monthSelect) {
                const months = Array.from({ length: 12 }, (_, index) => {
                    const month = String(index + 1).padStart(2, '0');
                    const label = new Date(2020, index, 1).toLocaleDateString('en-PH', { month: 'long' });
                    return `<option value="${month}">${label}</option>`;
                }).join('');
                monthSelect.innerHTML = `<option value="all">All months</option>${months}`;
                monthSelect.value = unpaidLedgerMonth;
            }
            const searchInput = document.getElementById('unpaidLedgerSearch');
            if (searchInput && searchInput.value !== unpaidLedgerSearch) searchInput.value = unpaidLedgerSearch;
            renderUnpaidOrders();
        }

        function renderUnpaidOrders() {
            const tbody = document.getElementById('unpaidLedgerBody');
            if (!tbody) return;
            const query = unpaidLedgerSearch.trim().toLocaleLowerCase();
            const orders = getOutstandingMineOrders()
                .filter(({ mine }) => unpaidLedgerYear === 'all' || String(mine.date).slice(0, 4) === unpaidLedgerYear)
                .filter(({ mine }) => unpaidLedgerMonth === 'all' || String(mine.date).slice(5, 7) === unpaidLedgerMonth)
                .filter(({ mine }) => {
                    if (!query) return true;
                    const session = (db.liveSessions || []).find(item => item.id === mine.sessionId);
                    return [mine.name, mine.buyer, mine.item, mine.seller, mine.host, mine.liveSession, mine.ref, session?.name]
                        .some(value => String(value || '').toLocaleLowerCase().includes(query));
                })
                .sort((a, b) => String(a.mine.date).localeCompare(String(b.mine.date)) || String(a.mine.time || '').localeCompare(String(b.mine.time || '')));
            const followup = orders.filter(({ mine }) => getUnpaidAgeDays(mine.date) >= 7).length;
            const critical = orders.filter(({ mine }) => getUnpaidAgeDays(mine.date) >= 14).length;
            const openBalance = orders.reduce((sum, order) => sum + order.balance, 0);
            const count = document.getElementById('unpaidLedgerCount');
            const balance = document.getElementById('unpaidLedgerBalance');
            const followupCount = document.getElementById('unpaidLedgerFollowup');
            const criticalCount = document.getElementById('unpaidLedgerCritical');
            if (count) count.textContent = `${orders.length} open ${orders.length === 1 ? 'order' : 'orders'}${unpaidLedgerYear !== 'all' || unpaidLedgerMonth !== 'all' ? ' · filtered' : ''}`;
            if (balance) balance.textContent = formatCurrency(openBalance);
            if (followupCount) followupCount.textContent = `${followup} ${followup === 1 ? 'order' : 'orders'}`;
            if (criticalCount) criticalCount.textContent = `${critical} ${critical === 1 ? 'order' : 'orders'}`;
            const countLabel = document.getElementById('mineFeedCount');
            if (countLabel) countLabel.textContent = `${orders.length} unpaid ${orders.length === 1 ? 'order' : 'orders'}`;
            if (!orders.length) {
                tbody.innerHTML = `<tr><td colspan="9" class="px-4 py-12 text-center text-sm text-gray-500">${query || unpaidLedgerYear !== 'all' || unpaidLedgerMonth !== 'all' ? 'No unpaid orders match these filters.' : 'No outstanding balances. New unpaid orders will appear here.'}</td></tr>`;
                return;
            }
            tbody.innerHTML = orders.map(({ mine, total, collected, balance: due }) => {
                const age = getUnpaidAgeDays(mine.date);
                const session = (db.liveSessions || []).find(item => item.id === mine.sessionId);
                const sessionName = session?.name || mine.liveSession || 'Unassigned';
                const tone = age >= 14
                    ? { row: 'bg-rose-50/70 dark:bg-rose-950/15', chip: 'border-rose-200 bg-rose-100 text-rose-800 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-300', label: 'Critical' }
                    : age >= 7
                        ? { row: 'bg-orange-50/70 dark:bg-orange-950/15', chip: 'border-orange-200 bg-orange-100 text-orange-800 dark:border-orange-900 dark:bg-orange-950/50 dark:text-orange-300', label: 'Follow up' }
                        : { row: '', chip: 'border-gray-200 bg-gray-100 text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300', label: '' };
                const date = reportDateLabel(mine.date, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
                const buyer = escapeHtml(mine.name || mine.buyer || '—');
                const item = escapeHtml(mine.item || '—');
                const orderId = escapeHtml(String(mine.id));
                const paymentState = collected > 0
                    ? { label: 'Partial', chip: 'border-orange-200 bg-orange-50 text-orange-800 dark:border-orange-900 dark:bg-orange-950/40 dark:text-orange-300' }
                    : { label: 'Unpaid', chip: 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300' };
                const elapsed = age === 0 ? 'Today' : `${age} ${age === 1 ? 'day' : 'days'} ago`;
                const timeStatus = age >= 7 ? `${tone.label} · ${elapsed}` : elapsed;
                return `<tr class="${tone.row} border-b border-gray-100 last:border-0 dark:border-gray-800"><td class="whitespace-nowrap px-3 py-3 text-gray-600 dark:text-gray-300">${escapeHtml(date)}<span class="mt-0.5 block text-[10px] text-gray-400">${escapeHtml(mine.time || '')}</span></td><td class="px-3 py-3"><span class="block font-medium text-gray-900 dark:text-white">${buyer}</span><span class="mt-1 inline-flex rounded-full border px-1.5 py-0.5 text-[9px] font-medium ${paymentState.chip}">${paymentState.label}</span></td><td class="max-w-56 px-3 py-3 text-gray-700 dark:text-gray-300"><span class="line-clamp-2">${item}</span></td><td class="px-3 py-3"><span class="block font-medium text-gray-800 dark:text-gray-200">${escapeHtml(sessionName)}</span><span class="mt-0.5 block text-[10px] text-gray-500">${escapeHtml(mine.seller || mine.host || '')}</span></td><td class="whitespace-nowrap px-3 py-3 text-right font-mono tabular-nums text-gray-700 dark:text-gray-300">${formatCurrency(total)}</td><td class="whitespace-nowrap px-3 py-3 text-right font-mono tabular-nums text-gray-700 dark:text-gray-300">${formatCurrency(collected)}</td><td class="whitespace-nowrap px-3 py-3 text-right font-mono font-semibold tabular-nums text-rose-700 dark:text-rose-300">${formatCurrency(due)}</td><td class="whitespace-nowrap px-3 py-3"><span class="inline-flex rounded-full border px-2 py-1 text-[10px] font-semibold ${tone.chip}">${timeStatus}</span></td><td class="whitespace-nowrap px-3 py-3 text-right"><div class="inline-flex items-center gap-1"><button type="button" data-unpaid-paid="${orderId}" class="btn-primary px-2.5 py-1.5 text-[10px]">Mark paid</button><button type="button" data-unpaid-edit="${orderId}" class="btn-outline px-2.5 py-1.5 text-[10px]" aria-label="Edit ${buyer}'s order"><i class="fa-solid fa-pen" aria-hidden="true"></i></button></div></td></tr>`;
            }).join('');
            tbody.querySelectorAll('[data-unpaid-paid]').forEach(button => button.addEventListener('click', () => handleStatusChange(button.dataset.unpaidPaid, 'PAID')));
            tbody.querySelectorAll('[data-unpaid-edit]').forEach(button => button.addEventListener('click', () => editMineFromRow(button.dataset.unpaidEdit)));
        }

        function updateUnpaidLedgerFilter(field, value) {
            if (field === 'search') unpaidLedgerSearch = value;
            if (field === 'year') unpaidLedgerYear = value;
            if (field === 'month') unpaidLedgerMonth = value;
            renderUnpaidOrders();
        }

        function renderMineHistoryList() {
            const container = document.getElementById('mineHistoryList');
            if (!container) return;
            const today = localDateKey();
            const historySessions = (db.liveSessions || [])
                .filter(session => !session.deletedAt && (session.date !== today || !isLiveSessionActive(session)))
                .sort((a, b) => String(b.endedAt || b.startedAt || '').localeCompare(String(a.endedAt || a.startedAt || '')));
            const groupedByMonth = new Map();
            historySessions.forEach(session => {
                const sessionDate = /^\d{4}-\d{2}-\d{2}$/.test(session.date || '') ? session.date : localDateKey(new Date(session.startedAt || ''));
                const monthKey = /^\d{4}-\d{2}-\d{2}$/.test(sessionDate) ? sessionDate.slice(0, 7) : 'unknown';
                if (!groupedByMonth.has(monthKey)) groupedByMonth.set(monthKey, new Map());
                const days = groupedByMonth.get(monthKey);
                if (!days.has(sessionDate)) days.set(sessionDate, []);
                days.get(sessionDate).push(session);
            });
            const monthGroups = [...groupedByMonth.entries()].sort(([a], [b]) => b.localeCompare(a)).map(([monthKey, days]) => {
                const monthDate = monthKey === 'unknown' ? null : new Date(`${monthKey}-01T12:00:00`);
                const monthLabel = monthDate && !Number.isNaN(monthDate.getTime())
                    ? monthDate.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })
                    : 'Date unavailable';
                const sessionsInMonth = [...days.values()].flat();
                const monthOrderCount = sessionsInMonth.reduce((total, session) => total + db.mines.filter(mine => mine.sessionId === session.id).length, 0);
                const dayGroups = [...days.entries()].sort(([a], [b]) => b.localeCompare(a)).map(([dateKey, sessions]) => {
                    const date = /^\d{4}-\d{2}-\d{2}$/.test(dateKey) ? new Date(`${dateKey}T12:00:00`) : null;
                    const dayLabel = date && !Number.isNaN(date.getTime())
                        ? date.toLocaleDateString('en-PH', { weekday: 'long', month: 'short', day: 'numeric' })
                        : 'Date unavailable';
                    const dayOrderCount = sessions.reduce((total, session) => total + db.mines.filter(mine => mine.sessionId === session.id).length, 0);
                    const cards = sessions.map(session => {
                        const count = db.mines.filter(mine => mine.sessionId === session.id).length;
                        const saved = !isLiveSessionActive(session);
                        return `<div class="mine-history-card"><button type="button" onclick="selectMineSession('${session.id}')" class="flex w-full items-start justify-between gap-3 text-left"><span class="min-w-0"><span class="block truncate font-semibold text-gray-900 dark:text-white">${escapeHtml(session.name)}</span><span class="mine-history-saved mt-1 block">${escapeHtml(formatLiveSessionTimestamp(session))}${saved ? ' · Saved' : ' · In progress'}</span></span><span class="mine-session-tab-count shrink-0">${count}</span></button>
                            <span class="mt-3 flex items-center justify-between text-xs text-gray-500"><button type="button" onclick="selectMineSession('${session.id}')" class="hover:text-gray-900 dark:hover:text-white">${count} ${count === 1 ? 'order' : 'orders'} · ${saved ? 'Saved' : 'In progress'}</button><span class="flex items-center gap-2"><button type="button" onclick="requestDeleteLiveSession('${encodeURIComponent(session.id)}')" class="btn-outline inline-flex min-h-8 items-center gap-1.5 px-2.5 text-[11px] text-rose-700 dark:text-rose-300" aria-label="Delete ${escapeHtml(session.name)}"><i class="fa-solid fa-trash-can" aria-hidden="true"></i>Delete</button><button type="button" onclick="selectMineSession('${session.id}')" aria-label="Open ${escapeHtml(session.name)}" class="text-gray-500 hover:text-gray-900 dark:hover:text-white"><i class="fa-solid fa-arrow-right" aria-hidden="true"></i></button></span></span>
                        </div>`;
                    }).join('');
                    return `<details class="mine-history-day">
                        <summary class="mine-history-day-summary"><i class="fa-solid fa-chevron-right mine-history-caret text-xs"></i><i class="fa-regular fa-calendar text-amber-600"></i><span class="flex-1 font-medium text-gray-800 dark:text-gray-200">${escapeHtml(dayLabel)}</span><span class="text-xs text-gray-500">${sessions.length} ${sessions.length === 1 ? 'live' : 'lives'} · ${dayOrderCount} ${dayOrderCount === 1 ? 'order' : 'orders'}</span></summary>
                        <div class="mine-history-session-grid">${cards}</div>
                    </details>`;
                }).join('');
                return `<details class="mine-history-month">
                    <summary class="mine-history-month-summary"><i class="fa-solid fa-chevron-right mine-history-caret text-xs"></i><i class="fa-regular fa-folder text-amber-600"></i><span class="flex-1 font-semibold text-gray-900 dark:text-white">${escapeHtml(monthLabel)}</span><span class="text-xs text-gray-500">${sessionsInMonth.length} ${sessionsInMonth.length === 1 ? 'session' : 'sessions'} · ${monthOrderCount} ${monthOrderCount === 1 ? 'order' : 'orders'}</span></summary>
                    <div class="mine-history-month-content">${dayGroups}</div>
                </details>`;
            }).join('');
            const legacyCount = db.mines.filter(mine => !mine.sessionId || !(db.liveSessions || []).some(session => session.id === mine.sessionId)).length;
            const legacyGroup = legacyCount ? `<details class="mine-history-month">
                <summary class="mine-history-month-summary"><i class="fa-solid fa-chevron-right mine-history-caret text-xs"></i><i class="fa-regular fa-folder text-gray-500"></i><span class="flex-1 font-semibold text-gray-900 dark:text-white">Earlier orders</span><span class="text-xs text-gray-500">${legacyCount} ${legacyCount === 1 ? 'order' : 'orders'}</span></summary>
                <div class="mine-history-month-content"><button type="button" onclick="selectMineSession('__legacy__')" class="mine-history-card text-left"><span class="font-semibold text-gray-900 dark:text-white">Orders before session history</span><span class="text-xs text-gray-500">Open the earlier order list</span></button></div>
            </details>` : '';
            container.innerHTML = monthGroups + legacyGroup || '<div class="col-span-full rounded-xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500 dark:border-gray-700">No saved live sessions yet. End a live session to save it here.</div>';
        }

        function renderFullMinesTable() {
            const tbody = document.getElementById('fullMinesTableBody');
            tbody.innerHTML = '';
            if (!tbody.dataset.mineRowViewBound) {
                tbody.addEventListener('click', event => {
                    const target = event.target instanceof Element ? event.target : event.target.parentElement;
                    if (!target || target.closest('button, input, select, textarea, a, label, [contenteditable="true"]')) return;
                    const row = target.closest('tr[data-mine-view-id]');
                    if (row) viewMine(row.dataset.mineViewId);
                });
                tbody.addEventListener('keydown', event => {
                    if (event.key !== 'Enter' && event.key !== ' ') return;
                    const target = event.target instanceof Element ? event.target : event.target.parentElement;
                    if (target?.closest('button, input, select, textarea, a, label, [contenteditable="true"]')) return;
                    const row = target?.closest('tr[data-mine-view-id]');
                    if (!row) return;
                    event.preventDefault();
                    viewMine(row.dataset.mineViewId);
                });
                tbody.dataset.mineRowViewBound = 'true';
            }
            renderMineSessionTabs();

            const historyList = document.getElementById('mineHistoryList');
            const unpaidView = document.getElementById('mineUnpaidView');
            const invoiceView = document.getElementById('mineInvoiceView');
            const historyHeader = document.getElementById('mineHistoryDetailHeader');
            const tableView = document.getElementById('mineOrdersTableView');
            const endButton = document.getElementById('btnEndLiveSession');
            const selectedSession = (db.liveSessions || []).find(session => session.id === mineSessionView);
            const showingHistoryCards = mineSessionView === '__history__';
            const showingUnpaidLedger = mineSessionView === '__unpaid__';
            const showingItemStatus = mineSessionView === '__item_status__';
            const showingInvoices = mineSessionView === '__invoices__';
            historyList?.classList.toggle('hidden', !showingHistoryCards);
            unpaidView?.classList.toggle('hidden', !showingUnpaidLedger);
            invoiceView?.classList.toggle('hidden', !showingInvoices);
            tableView?.classList.toggle('hidden', showingHistoryCards || showingUnpaidLedger || showingInvoices);
            historyHeader?.classList.toggle('hidden', showingHistoryCards || showingUnpaidLedger || showingInvoices || (!showingItemStatus && mineSessionView !== '__legacy__' && !selectedSession));
            historyHeader?.classList.toggle('flex', !showingHistoryCards && !showingUnpaidLedger && !showingInvoices && (showingItemStatus || mineSessionView === '__legacy__' || Boolean(selectedSession)));
            historyHeader?.querySelector('button')?.classList.toggle('hidden', showingItemStatus);
            endButton?.classList.toggle('hidden', showingUnpaidLedger || showingInvoices || !(selectedSession && isLiveSessionActive(selectedSession)));
            document.getElementById('minePaymentFilters')?.classList.toggle('hidden', showingItemStatus);
            document.getElementById('mineItemStatusFilters')?.classList.toggle('hidden', !showingItemStatus);
            document.getElementById('mineFilterLabel').textContent = showingItemStatus ? 'Item status' : 'Payment status';

            if (showingInvoices) {
                renderBuyerInvoices();
                const count = document.getElementById('mineFeedCount');
                if (count) count.textContent = `${getBuyerInvoiceGroups().length} buyer ${getBuyerInvoiceGroups().length === 1 ? 'invoice' : 'invoices'}`;
                return;
            }

            if (showingHistoryCards) {
                renderMineHistoryList();
                const historicalSessionIds = new Set((db.liveSessions || []).filter(session => !session.deletedAt && (session.date !== localDateKey() || !isLiveSessionActive(session))).map(session => session.id));
                const knownSessionIds = new Set((db.liveSessions || []).map(session => session.id));
                const historyTotal = db.mines.filter(mine => historicalSessionIds.has(mine.sessionId) || !mine.sessionId || !knownSessionIds.has(mine.sessionId)).length;
                const count = document.getElementById('mineFeedCount');
                if (count) count.textContent = `${historyTotal} ${historyTotal === 1 ? 'order' : 'orders'} in history`;
                return;
            }

            if (showingUnpaidLedger) {
                renderUnpaidLedger();
                return;
            }

            const historyTitle = document.getElementById('mineHistorySessionTitle');
            const historyDate = document.getElementById('mineHistorySessionDate');
            if (mineSessionView === '__legacy__') {
                if (historyTitle) historyTitle.textContent = 'Earlier orders';
                if (historyDate) historyDate.textContent = 'Orders saved before live sessions were introduced';
            } else if (showingItemStatus) {
                if (historyTitle) historyTitle.textContent = 'Item Status';
                if (historyDate) historyDate.textContent = 'Track fulfillment across all live sessions';
            } else if (selectedSession && historyHeader) {
                if (historyTitle) historyTitle.textContent = selectedSession.name;
                if (historyDate) historyDate.textContent = `${formatLiveSessionTimestamp(selectedSession)}${isLiveSessionActive(selectedSession) ? ' · In progress' : ' · Saved!'}`;
            }

            let sessionMines = [];
            if (mineSessionView === '__legacy__') {
                sessionMines = db.mines.filter(mine => !mine.sessionId || !(db.liveSessions || []).some(session => session.id === mine.sessionId));
            } else if (showingItemStatus) {
                sessionMines = db.mines;
            } else if (mineSessionView !== '__new__') {
                sessionMines = db.mines.filter(mine => mine.sessionId === mineSessionView);
            }

            const filtered = sessionMines.filter(mine => {
                if (mineFilterTab.startsWith('ITEM_STATUS:')) {
                    const selectedItemStatus = mineFilterTab.slice('ITEM_STATUS:'.length);
                    if (selectedItemStatus !== 'ALL' && String(mine.deliveryStatus || 'PENDING').toUpperCase() !== selectedItemStatus) return false;
                }
                if (mineFilterTab === 'PAID' && getMinePaymentStatus(mine) !== 'PAID') return false;
                if (mineFilterTab === 'UNPAID' && getReportOrderAmounts(mine).balance <= 0) return false;
                return true;
            });
            const count = document.getElementById('mineFeedCount');
            if (count) count.textContent = `${filtered.length} ${filtered.length === 1 ? 'order' : 'orders'}`;

            if (!filtered.length) {
                const selectedSession = (db.liveSessions || []).find(session => session.id === mineSessionView);
                const emptyMessage = showingItemStatus
                    ? 'No orders match this item status.'
                    : mineSessionView === '__new__'
                    ? 'Start a live session to get a clean feed for today. Earlier orders remain safely in History.'
                    : mineSessionView === '__history__'
                        ? 'No earlier orders yet.'
                        : `No ${mineFilterTab === 'ALL' ? '' : mineFilterTab.toLowerCase() + ' '}orders in ${escapeHtml(selectedSession?.name || 'this session')} yet.`;
                const action = mineSessionView === '__new__'
                    ? '<button onclick="startLiveSession()" class="btn-primary mt-3 px-3 py-2 text-xs"><i class="fa-solid fa-plus mr-1"></i> Start live session</button>'
                    : '';
                tbody.innerHTML = `<tr><td colspan="15" class="px-4 py-12 text-center"><div class="mx-auto max-w-sm text-sm font-medium text-gray-700 dark:text-gray-300">${emptyMessage}</div>${action}</td></tr>`;
                return;
            }

            const buyerGroups = new Map();
            filtered.forEach(mine => {
                const buyerName = String(mine.name || 'Unknown buyer').trim().replace(/\s+/g, ' ') || 'Unknown buyer';
                const buyerKey = buyerName.toLocaleLowerCase();
                const sessionKey = mine.sessionId || `legacy:${mine.date}`;
                const groupKey = `${sessionKey}::${buyerKey}`;
                if (!buyerGroups.has(groupKey)) buyerGroups.set(groupKey, { buyerName, orders: [] });
                buyerGroups.get(groupKey).orders.push(mine);
            });

            buyerGroups.forEach(group => {
                const groupAmounts = group.orders.reduce((totals, mine) => {
                    const amounts = getReportOrderAmounts(mine);
                    totals.total += amounts.total;
                    totals.balance += amounts.balance;
                    return totals;
                }, { total: 0, balance: 0 });
                const preferredSeller = group.orders.find(mine => mine.seller)?.seller || 'TRICIA';
                const groupStatuses = [...new Set(group.orders.map(mine => String(mine.deliveryStatus || 'PENDING').toUpperCase()))];
                const groupStatusSummary = groupStatuses.length > 1 ? `Mixed: ${groupStatuses.join(' · ')}` : groupStatuses[0];
                const sessionLabel = showingItemStatus
                    ? (db.liveSessions || []).find(session => session.id === group.orders[0]?.sessionId)?.name || 'Earlier orders'
                    : '';
                tbody.innerHTML += `<tr class="bg-amber-50/70 dark:bg-amber-500/[0.06]"><td colspan="15" class="border-t border-gray-200 px-3 py-2.5 dark:border-gray-700"><div class="flex flex-wrap items-center justify-between gap-2"><div class="flex min-w-0 flex-wrap items-center gap-2"><button type="button" data-add-buyer-item="${escapeHtml(group.buyerName)}" data-add-buyer-seller="${escapeHtml(preferredSeller)}" class="inline-flex h-7 shrink-0 items-center gap-1 rounded-lg border border-amber-300 bg-white px-2 text-[10px] font-semibold text-amber-800 transition hover:bg-amber-100 dark:border-amber-500/30 dark:bg-gray-900 dark:text-amber-300 dark:hover:bg-amber-500/10"><i class="fa-solid fa-plus" aria-hidden="true"></i>Add item</button><i class="fa-solid fa-user-group text-amber-600" aria-hidden="true"></i><strong class="text-xs text-gray-900 dark:text-white">${escapeHtml(group.buyerName)}</strong><span class="rounded-full bg-white px-2 py-0.5 text-[10px] font-medium text-gray-500 dark:bg-gray-900 dark:text-gray-400">${group.orders.length} ${group.orders.length === 1 ? 'item' : 'items'}${sessionLabel ? ` · ${escapeHtml(sessionLabel)}` : ''}</span></div><div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px]"><span class="${groupStatuses.length > 1 ? 'font-semibold text-amber-800 dark:text-amber-300' : 'text-gray-500 dark:text-gray-400'}">${escapeHtml(groupStatusSummary)}</span><span class="text-gray-600 dark:text-gray-300">Group total <strong class="font-mono">${formatCurrency(groupAmounts.total)}</strong>${groupAmounts.balance > 0 ? ` · ${formatCurrency(groupAmounts.balance)} due` : ''}</span></div></div></td></tr>`;
                group.orders.forEach(m => {
                const paymentStatus = getMinePaymentStatus(m);
                const encodedMineId = encodeURIComponent(String(m.id || '')).replace(/'/g, '%27');
                const isPaid = paymentStatus === 'PAID';
                const isPartial = paymentStatus === 'PARTIAL';
                const isCancelled = m.status === 'RETURNED' || m.status === 'CANCELLED';
                const paymentMethod = m.mop === 'BPI' ? 'Bank' : m.mop === 'COD' ? 'Cash' : (m.mop || 'Cash');
                const requestedItemStatus = String(m.deliveryStatus || 'PENDING').toUpperCase();
                const itemStatus = ['PENDING', 'NOT SHIPPED', 'SHIPPED', 'PICK UP', 'MAXIM'].includes(requestedItemStatus) ? requestedItemStatus : 'PENDING';
                const shippingFee = normalizeShippingFeeStatus(m.shippingFeeStatus);
                const shippingFeeLabel = getShippingFeeStatusLabel(shippingFee);
                const shippingFeeStyle = shippingFee === 'FREE'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300'
                    : shippingFee === 'NOT_FREE'
                        ? 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300'
                        : 'border-gray-200 bg-gray-100 text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300';
                const statusControl = isCancelled
                    ? '<span class="mine-status-static status-cancelled"><i class="fa-solid fa-ban"></i> Cancelled</span>'
                    : isPaid
                        ? '<span class="mine-status-static status-paid"><i class="fa-solid fa-circle-check"></i>PAID</span>'
                    : `<button type="button" onclick="handleStatusChange(decodeURIComponent('${encodedMineId}'), 'PAID')" aria-label="Mark order ${escapeHtml(m.name)} as paid" aria-pressed="false" class="mine-status-toggle ${isPartial ? 'status-partial' : 'status-unpaid'}"><i class="fa-solid ${isPartial ? 'fa-hourglass-half' : 'fa-clock'}"></i>${isPartial ? 'PARTIALLY PAID' : 'UNPAID'}</button>`;
                const itemStatusControl = `<select aria-label="Item status for ${escapeHtml(m.item || m.name)}" onchange="handleMineItemStatusChange(decodeURIComponent('${encodedMineId}'), this.value)" class="mine-select mine-delivery-select status-color-${itemStatus.toLowerCase().replace(/ /g, '-')}"><option value="PENDING" ${itemStatus === 'PENDING' ? 'selected' : ''}>PENDING</option><option value="NOT SHIPPED" ${itemStatus === 'NOT SHIPPED' ? 'selected' : ''}>NOT SHIPPED</option><option value="SHIPPED" ${itemStatus === 'SHIPPED' ? 'selected' : ''} ${!isPaid ? 'disabled' : ''}>SHIPPED${!isPaid ? ' (FULL PAYMENT REQUIRED)' : ''}</option><option value="PICK UP" ${itemStatus === 'PICK UP' ? 'selected' : ''}>PICK UP</option><option value="MAXIM" ${itemStatus === 'MAXIM' ? 'selected' : ''}>MAXIM</option></select>`;
                tbody.innerHTML += `
                    <tr data-mine-view-id="${escapeHtml(m.id)}" tabindex="0" aria-label="View order details for ${escapeHtml(m.name)}" class="cursor-pointer hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-500 dark:hover:bg-gray-800/50 transition">
                        <td class="py-2.5 px-2 text-[12px] font-mono whitespace-nowrap">${escapeHtml(m.date)}<br><span class="text-[10px] text-gray-400">${escapeHtml(m.time)}</span></td>
                        <td class="py-2.5 px-2"><input aria-label="Buyer name" onchange="updateMineField(decodeURIComponent('${encodedMineId}'), 'name', this.value)" class="w-40 bg-transparent text-sm font-bold outline-none" value="${escapeHtml(m.name)}"></td>
                        <td class="py-2.5 px-2"><input aria-label="Product details" onchange="updateMineField(decodeURIComponent('${encodedMineId}'), 'item', this.value)" class="w-60 bg-transparent text-sm outline-none" value="${escapeHtml(m.item)}"></td>
                        <td class="py-2.5 px-2 font-mono text-xs text-gray-600 dark:text-gray-300">${escapeHtml(m.sku || '—')}</td>
                        <td class="py-2.5 px-2 text-right"><input aria-label="Price" type="number" step="0.01" onchange="updateMineField(decodeURIComponent('${encodedMineId}'), 'price', this.value)" class="w-20 bg-transparent text-sm font-mono text-right outline-none" value="${Number(m.price) || 0}"></td>
                        <td class="py-2.5 px-2 text-right"><input aria-label="Downpayment" type="number" step="0.01" onchange="updateMineField(decodeURIComponent('${encodedMineId}'), 'dp', this.value)" class="w-16 bg-transparent text-sm font-mono text-right outline-none" value="${Number(m.dp) || 0}"></td>
                        <td class="py-2.5 px-2 text-right"><input aria-label="Order total" type="number" step="0.01" onchange="updateMineField(decodeURIComponent('${encodedMineId}'), 'total', this.value)" class="w-20 bg-transparent text-sm font-mono text-right font-bold outline-none" value="${Number(m.total) || 0}"></td>
                        <td class="py-2.5 px-2">${statusControl}</td>
                        <td class="py-2.5 px-2">${itemStatusControl}</td>
                        <td class="mine-order-remark-cell py-2.5 px-2 max-w-56 text-xs">${itemStatus === 'NOT SHIPPED' && m.deliveryNote ? `<span class="mine-order-remark font-bold leading-4 text-blue-800 dark:text-blue-300">${escapeHtml(m.deliveryNote)}</span>` : '<span class="text-gray-400 dark:text-gray-500">—</span>'}</td>
                        <td class="py-2.5 px-2"><span class="inline-flex whitespace-nowrap rounded-full border px-2 py-1 text-[10px] font-bold ${shippingFeeStyle}">${escapeHtml(shippingFeeLabel)}</span></td>
                        <td class="py-2.5 px-2 whitespace-nowrap">${escapeHtml(liveHostLabel(m.seller || ''))}</td>
                        <td class="py-2.5 px-2"><select aria-label="Mode of payment" onchange="handleMOPChange('${m.id}', this.value)" class="mine-select"><option value="GCash" ${paymentMethod==='GCash'?'selected':''}>GCash</option><option value="Bank" ${paymentMethod==='Bank'?'selected':''}>Bank</option><option value="Maya" ${paymentMethod==='Maya'?'selected':''}>Maya</option><option value="Cash" ${paymentMethod==='Cash'?'selected':''}>Cash</option></select></td>
                        <td class="py-2.5 px-2"><input aria-label="Payment reference" onchange="updateMineField(decodeURIComponent('${encodedMineId}'), 'ref', this.value)" class="w-36 bg-transparent text-sm outline-none" value="${escapeHtml(m.ref || '')}"></td>
                        <td class="py-2.5 px-2 text-right">
                            <div class="inline-flex items-center gap-1">
                                <button type="button" onclick="viewMine(decodeURIComponent('${encodedMineId}'))" title="View order" aria-label="View order" class="mine-action-btn"><i class="fa-regular fa-eye"></i></button>
                                <button type="button" onclick="editMineFromRow(decodeURIComponent('${encodedMineId}'))" title="Edit order" aria-label="Edit order" class="mine-action-btn"><i class="fa-solid fa-pen"></i></button>
                                <button type="button" onclick="deleteMineOrder(decodeURIComponent('${encodedMineId}'))" title="Delete order" aria-label="Delete order" class="mine-action-btn is-destructive"><i class="fa-regular fa-trash-can"></i></button>
                            </div>
                        </td>
                    </tr>
                `;
                });
            });
            tbody.querySelectorAll('[data-add-buyer-item]').forEach(button => button.addEventListener('click', () => addMineItemForBuyer(button.dataset.addBuyerItem, button.dataset.addBuyerSeller)));
        }

        function filterMines(tab) {
            mineFilterTab = tab;
            ['ALL', 'PAID', 'UNPAID', 'ITEM_STATUS-ALL', 'ITEM_STATUS-PENDING', 'ITEM_STATUS-NOT_SHIPPED', 'ITEM_STATUS-SHIPPED', 'ITEM_STATUS-PICK_UP', 'ITEM_STATUS-MAXIM'].forEach(status => {
                const button = document.getElementById('filter-btn-' + status);
                if (!button) return;
                const normalizedTab = tab.replace(':', '-').replace(' ', '_');
                const active = status === normalizedTab;
                button.classList.toggle('is-active', active);
                button.setAttribute('aria-pressed', String(active));
            });
            renderFullMinesTable();
        }

        // Utilities for inline editing and return/cancel
        function escapeHtml(text) {
            if (!text) return '';
            return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        }

        function updateMineField(id, field, value) {
            const mine = db.mines.find(m => m.id === id);
            if (!mine) return;
            if (['price','dp','total'].includes(field)) {
                mine[field] = parseFloat(value) || 0;
            } else {
                mine[field] = value;
            }
            // if status changed to RETURNED, restore stock
            if (field === 'status' && value === 'RETURNED') {
                const shirt = findShirtFromItem(mine.item);
                if (shirt) {
                    shirt.qty = (shirt.qty || 0) + 1;
                }
            }
            if (field === 'dp' || field === 'total') {
                mine.status = getMinePaymentStatusFromAmounts(mine.total, mine.dp);
            }
            saveToLocalStorage();
            if (field === 'dp' || field === 'total') {
                renderFullMinesTable();
                renderUnpaidLedger();
                updateDashboardMetrics();
            }
        }

        function getMinePaymentStatusFromAmounts(totalValue, downpaymentValue) {
            const total = Math.max(0, Number(totalValue) || 0);
            const downpayment = Math.max(0, Number(downpaymentValue) || 0);
            if (total > 0 && downpayment >= total) return 'PAID';
            return downpayment > 0 ? 'PARTIAL' : 'UNPAID';
        }

        function getMinePaymentStatus(mine) {
            const status = String(mine?.status || '').toUpperCase();
            if (['PAID', 'PARTIAL', 'UNPAID'].includes(status)) return status;
            return getMinePaymentStatusFromAmounts(mine?.total ?? mine?.price, mine?.dp);
        }

        function normalizeShippingFeeStatus(status) {
            const normalizedStatus = String(status || '').toUpperCase();
            if (normalizedStatus === 'FREE') return 'FREE';
            if (normalizedStatus === 'NOT_FREE' || normalizedStatus === 'PAID' || normalizedStatus === 'UNPAID') return 'NOT_FREE';
            return 'NONE';
        }

        function getShippingFeeStatusLabel(status) {
            const normalizedStatus = normalizeShippingFeeStatus(status);
            if (normalizedStatus === 'FREE') return 'FREE SHIPPING';
            if (normalizedStatus === 'NOT_FREE') return 'NOT FREE SHIPPING';
            return 'NONE';
        }

        function getSignedInAdminName() {
            const metadata = currentAuthUser?.user_metadata || {};
            return String(metadata.full_name || metadata.name || currentAuthUser?.email?.split('@')[0] || 'Admin').trim();
        }

        function updateMineOrderHeaderDateTime() {
            const date = document.getElementById('mineDate').value;
            const time = document.getElementById('mineTime').value;
            const label = document.getElementById('mineOrderDateTime');
            const orderDate = date ? new Date(`${date}T00:00:00`) : null;
            label.textContent = orderDate && !Number.isNaN(orderDate.getTime()) && time
                ? `${orderDate.toLocaleDateString([], { dateStyle: 'medium' })} · ${time}`
                : 'Fast entry for live selling orders';
        }

        function updateMinePaymentStatusFromAmounts() {
            const total = document.getElementById('mineTotal').value;
            const downpayment = document.getElementById('mineDp').value;
            const statusSelect = document.getElementById('mineStatus');
            statusSelect.value = getMinePaymentStatusFromAmounts(total, downpayment);
            updateMinePaymentStatusUI(statusSelect.value);
        }

        function updateMinePaymentStatusUI(status) {
            const statusSelect = document.getElementById('mineStatus');
            const referenceInput = document.getElementById('mineRef');
            const referenceHint = document.getElementById('mineRefRequiredHint');
            statusSelect.value = status;
            statusSelect.classList.remove('status-color-unpaid', 'status-color-partial', 'status-color-paid');
            statusSelect.classList.add(`status-color-${statusSelect.value.toLowerCase()}`);
            referenceInput.required = status === 'PAID';
            referenceInput.placeholder = status === 'PAID' ? 'Required for paid orders' : 'Optional reference';
            referenceHint.classList.toggle('hidden', status !== 'PAID');
            updateMineShippedStatusAvailability();
            if (document.getElementById('mineDeliveryStatus').value === 'SHIPPED') updateMineDeliveryStatusColor('SHIPPED');
        }

        function updateMineShippedStatusAvailability() {
            const fullyPaid = document.getElementById('mineStatus').value === 'PAID';
            const shippedOption = document.querySelector('#mineDeliveryStatus option[value="SHIPPED"]');
            shippedOption.disabled = !fullyPaid;
            shippedOption.textContent = fullyPaid ? 'SHIPPED' : 'SHIPPED (FULL PAYMENT REQUIRED)';
            return fullyPaid;
        }

        function updateMineDeliveryStatusColor(status) {
            const statusSelect = document.getElementById('mineDeliveryStatus');
            const note = document.getElementById('mineDeliveryNote');
            const noteField = document.getElementById('mineDeliveryNoteField');
            if (String(status || '').toUpperCase() === 'SHIPPED' && !updateMineShippedStatusAvailability()) {
                statusSelect.value = 'PENDING';
                status = 'PENDING';
                showToast('Mark the order fully paid before setting it to SHIPPED.', true);
            }
            const requiresReason = String(status || '').toUpperCase() === 'NOT SHIPPED';
            const statusClass = {
                'PENDING': 'status-color-pending',
                'NOT SHIPPED': 'status-color-not-shipped',
                'SHIPPED': 'status-color-shipped',
                'PICK UP': 'status-color-pick-up',
                'MAXIM': 'status-color-maxim'
            }[String(status || '').toUpperCase()];
            statusSelect.classList.remove('status-color-pending', 'status-color-not-shipped', 'status-color-shipped', 'status-color-pick-up', 'status-color-maxim');
            if (statusClass) statusSelect.classList.add(statusClass);
            noteField.classList.toggle('hidden', !requiresReason);
            note.required = requiresReason;
        }

        function handleMinePaymentStatusSelection(status) {
            const totalInput = document.getElementById('mineTotal');
            const downpaymentInput = document.getElementById('mineDp');
            if (status === 'PAID') downpaymentInput.value = totalInput.value;
            updateMinePaymentStatusUI(status);
        }

        // When MOP changes to GCash or status changes to PAID, require/ref modal if needed
        function handleMOPChange(id, newMop) {
            updateMineField(id, 'mop', newMop);
            const mine = db.mines.find(m => m.id === id);
            if (!mine) return;
            if (newMop === 'GCash' && mine.status === 'PAID' && !mine.ref) {
                openRefModal(id);
            }
        }

        async function handleMineItemStatusChange(id, newStatus) {
            const mine = db.mines.find(item => item.id === id);
            if (!mine) return;
            const normalizedStatus = String(newStatus || '').toUpperCase();
            if (normalizedStatus === String(mine.deliveryStatus || 'PENDING').toUpperCase()) return;
            if (normalizedStatus === 'SHIPPED' && getMinePaymentStatus(mine) !== 'PAID') {
                showToast('Mark this item fully paid before setting it to SHIPPED.', true);
                renderFullMinesTable();
                return;
            }
            if (normalizedStatus === 'NOT SHIPPED' && !String(mine.deliveryNote || '').trim()) {
                const reason = await showAppPrompt('Add a remark', 'Add a short reason for why this item has not shipped.', 'Remarks', '', 'Save status');
                if (!reason) {
                    renderFullMinesTable();
                    return;
                }
                mine.deliveryNote = reason;
            }
            mine.deliveryStatus = normalizedStatus;
            recordAuditEvent('Updated item status', 'Mine order', mine.id, `${mine.name} · ${mine.item} marked ${normalizedStatus}`);
            saveToLocalStorage();
            renderFullMinesTable();
            showToast(`Item status saved as ${normalizedStatus}`);
        }

        function handleStatusChange(id, newStatus) {
            const mine = db.mines.find(m => m.id === id);
            if (!mine) return;
            if (newStatus === 'PAID') {
                if (!mine.ref) {
                    openRefModal(id);
                    return;
                }
                mine.dp = Math.max(0, Number(mine.total || mine.price || 0));
                mine.status = newStatus;
            } else {
                mine.status = getMinePaymentStatusFromAmounts(mine.total, mine.dp);
            }
            recordAuditEvent('Updated payment status', 'Mine order', mine.id, `${mine.name} marked ${mine.status}`);
            saveToLocalStorage();
            renderFullMinesTable();
            renderUnpaidLedger();
            updateDashboardMetrics();
            showToast(`Order status updated to ${mine.status}`);
        }

        function findShirtFromItem(itemStr) {
            if (!itemStr) return null;
            const cleaned = itemStr.toLowerCase();
            return db.shirts.find(s => cleaned.includes(s.name.toLowerCase()) && cleaned.includes(String(s.size).toLowerCase()));
        }

        async function returnMineOrder(id) {
            const mine = db.mines.find(m => m.id === id);
            if (!mine) return;
            if (!await showAppConfirm('Return or cancel this order?', 'This will mark the order as returned/cancelled and restore its stock.', 'Return order', true)) return;
            // set status and restore stock if linked
            const shirt = findShirtFromItem(mine.item);
            if (shirt) {
                shirt.qty = (shirt.qty || 0) + 1;
                if (shirt.soldCount) shirt.soldCount = Math.max(0, shirt.soldCount - 1);
            }
            mine.status = 'RETURNED';
            saveToLocalStorage();
            refreshAllUI();
            showToast('Order marked returned and stock restored');
        }

        // Reference modal helpers
        function openRefModal(mineId) {
            const mine = db.mines.find(m => m.id === mineId);
            if (!mine) return;
            document.getElementById('modalRef').dataset.mineId = mineId;
            document.getElementById('refTargetInfo').innerText = `${mine.name} — ${mine.item} — ${formatCurrency(mine.total)}`;
            document.getElementById('refInput').value = mine.ref || '';
            document.getElementById('modalRef').classList.remove('hidden');
            setTimeout(()=>{ document.getElementById('refInput').focus(); document.getElementById('refInput').select(); },120);
        }

        function closeRefModal() {
            const modal = document.getElementById('modalRef');
            modal.classList.add('hidden');
            delete modal.dataset.mineId;
        }

        function confirmRef() {
            const modal = document.getElementById('modalRef');
            const mineId = modal.dataset.mineId;
            if (!mineId) return closeRefModal();
            const val = document.getElementById('refInput').value.trim();
            const mine = db.mines.find(m => m.id === mineId);
            if (!mine) return closeRefModal();
            if (!val) {
                showToast('Enter a payment reference before marking this order paid.', true);
                document.getElementById('refInput').focus();
                return;
            }
            mine.ref = val;
            // ensure status is PAID when ref provided
            mine.status = 'PAID';
            mine.dp = Math.max(0, Number(mine.total || mine.price || 0));
            saveToLocalStorage();
            closeRefModal();
            renderFullMinesTable();
            renderUnpaidLedger();
            updateDashboardMetrics();
            showToast('Payment reference saved');
        }

        function reportDateKey(date) {
            return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        }

        function reportDateLabel(dateKey, options = { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' }) {
            const date = new Date(`${dateKey}T12:00:00`);
            return Number.isNaN(date.getTime()) ? dateKey : date.toLocaleDateString('en-PH', options);
        }

        function isReportableMine(mine) {
            if (!mine || !mine.date || /^(CANCELLED|CANCELED|RETURNED)$/i.test(String(mine.status || ''))) return false;
            return !/^m\d+$/i.test(String(mine.id || ''));
        }

        function getReportOrderAmounts(mine) {
            const total = Math.max(0, Number(mine.total ?? mine.price ?? 0) || 0);
            if (getMinePaymentStatus(mine) === 'PAID') return { total, collected: total, balance: 0 };
            const downpayment = Math.min(total, Math.max(0, Number(mine.dp || 0) || 0));
            return { total, collected: downpayment, balance: Math.max(0, total - downpayment) };
        }

        function getReportDayData(dateKey) {
            const orders = (db.mines || []).filter(mine => mine.date === dateKey && isReportableMine(mine));
            const orderSessionIds = new Set(orders.map(mine => mine.sessionId).filter(Boolean));
            const sessions = (db.liveSessions || []).filter(session => {
                const sessionDate = session.date || (session.startedAt ? localDateKey(new Date(session.startedAt)) : '');
                return sessionDate === dateKey || orderSessionIds.has(session.id);
            });
            const totals = orders.reduce((result, mine) => {
                const amounts = getReportOrderAmounts(mine);
                result.gross += amounts.total;
                result.collected += amounts.collected;
                result.pending += amounts.balance;
                return result;
            }, { gross: 0, collected: 0, pending: 0 });
            return {
                date: dateKey,
                ...totals,
                orders,
                sessions,
                hasRecords: orders.length > 0 || sessions.length > 0
            };
        }

        async function shiftReportMonth(amount) {
            if (editingReportDate && !await showAppConfirm('Discard unsaved changes?', 'Your unsaved daily sheet edits will be lost.', 'Discard changes', true)) return;
            editingReportDate = null;
            reportLedgerDraft = null;
            reportMonthCursor = new Date(reportMonthCursor.getFullYear(), reportMonthCursor.getMonth() + amount, 1);
            selectedReportDate = null;
            renderDailyLedger();
        }

        async function goToCurrentReportMonth() {
            if (editingReportDate && !await showAppConfirm('Discard unsaved changes?', 'Your unsaved daily sheet edits will be lost.', 'Discard changes', true)) return;
            editingReportDate = null;
            reportLedgerDraft = null;
            const now = new Date();
            reportMonthCursor = new Date(now.getFullYear(), now.getMonth(), 1);
            selectedReportDate = null;
            renderDailyLedger();
        }

        async function openReportDay(dateKey) {
            if (editingReportDate) {
                if (!await showAppConfirm('Discard unsaved changes?', 'Your unsaved daily sheet edits will be lost.', 'Discard changes', true)) return;
                editingReportDate = null;
                reportLedgerDraft = null;
            }
            editingReportSessionId = null;
            selectedReportDate = dateKey;
            renderDailyLedger();
        }

        async function closeReportDay() {
            if (editingReportDate && !await showAppConfirm('Discard unsaved changes?', 'Your unsaved daily sheet edits will be lost.', 'Discard changes', true)) return;
            if (editingReportSessionId && !await showAppConfirm('Discard unsaved changes?', 'Your unsaved live-session edits will be lost.', 'Discard changes', true)) return;
            editingReportDate = null;
            reportLedgerDraft = null;
            editingReportSessionId = null;
            selectedReportDate = null;
            renderDailyLedger();
        }

        function getDailySheetRecord(dateKey) {
            return (db.dailyLedger || []).find(record => record.date === dateKey) || null;
        }

        function getReportSessionSeller(dateKey, period) {
            const periodPattern = new RegExp(`\\b${period}\\b`, 'i');
            const sessions = (db.liveSessions || []).filter(session => {
                const sessionDate = session.date || (session.startedAt ? localDateKey(new Date(session.startedAt)) : '');
                return sessionDate === dateKey && periodPattern.test(String(session.name || ''));
            });
            const sessionHosts = new Set(sessions.map(session => String(session.host || session.seller || '').trim().toUpperCase()).filter(Boolean));
            if (sessionHosts.size === 1) return [...sessionHosts][0];
            if (sessionHosts.size > 1) return '';
            const sessionIds = new Set(sessions.map(session => session.id));
            const sellers = new Set((db.mines || [])
                .filter(mine => mine.date === dateKey && sessionIds.has(mine.sessionId))
                .map(mine => String(mine.seller || '').trim().toUpperCase())
                .filter(seller => seller && seller !== 'WALK-IN'));
            return sellers.size === 1 ? [...sellers][0] : '';
        }

        function getReportSessionSummary(data, session) {
            const unambiguousSession = data.sessions.length === 1 && String(data.sessions[0].id) === String(session.id);
            const knownSessionIds = new Set((db.liveSessions || []).map(item => String(item.id)));
            const orders = data.orders.filter(mine => {
                if (String(mine.sessionId || '') === String(session.id)) return true;
                const hasUnmatchedSession = mine.sessionId && !knownSessionIds.has(String(mine.sessionId));
                return unambiguousSession && (!mine.sessionId || hasUnmatchedSession);
            });
            const totals = orders.reduce((result, mine) => {
                const amounts = getReportOrderAmounts(mine);
                result.mineSales += amounts.total;
                result.unpaid += amounts.balance;
                if (mine.seller) result.sellers.add(String(mine.seller).trim().toUpperCase());
                return result;
            }, { mineSales: 0, unpaid: 0, sellers: new Set() });
            const dayRecord = getDailySheetRecord(data.date);
            const period = String(session.name || '').match(/\b(morning|afternoon|evening)\b/i)?.[1]?.toLowerCase();
            const legacySeller = period ? String(dayRecord?.[`${period}Seller`] || '').trim().toUpperCase() : '';
            const seller = String(session.host || session.seller || '').trim().toUpperCase()
                || legacySeller
                || (totals.sellers.size === 1 ? [...totals.sellers][0] : totals.sellers.size > 1 ? 'Multiple sellers' : '—');
            const sessionLedger = dayRecord?.sessionTotals || {};
            const storedAmounts = sessionLedger[session.id] || (data.sessions.length === 1 ? dayRecord || {} : {});
            const walkIn = Math.max(0, Number(storedAmounts.walkIn || 0) || 0);
            const boxBundle = Math.max(0, Number(storedAmounts.boxBundle || 0) || 0);
            const fbBoost = Math.max(0, Number(storedAmounts.fbBoost || storedAmounts.boost || 0) || 0);
            return {
                orders,
                seller,
                mineSales: totals.mineSales,
                unpaid: totals.unpaid,
                walkIn,
                boxBundle,
                fbBoost,
                totalSales: totals.mineSales + walkIn + boxBundle - fbBoost
            };
        }

        function beginReportSessionEdit(dateKey, sessionId) {
            editingReportSessionId = sessionId;
            renderReportDayDetail(dateKey);
        }

        function cancelReportSessionEdit(dateKey) {
            editingReportSessionId = null;
            renderReportDayDetail(dateKey);
        }

        function saveReportSessionEdit(dateKey, sessionId, button) {
            if (editingReportSessionId !== sessionId) return;
            const row = button?.closest('tr');
            const amounts = { walkIn: 0, boxBundle: 0, fbBoost: 0 };
            row?.querySelectorAll('[data-report-session-field]').forEach(input => {
                amounts[input.dataset.reportSessionField] = Math.max(0, Number(input.value || 0) || 0);
            });
            if (!Array.isArray(db.dailyLedger)) db.dailyLedger = [];
            let record = getDailySheetRecord(dateKey);
            if (!record) {
                record = { date: dateKey };
                db.dailyLedger.push(record);
            }
            if (!record.sessionTotals || typeof record.sessionTotals !== 'object') record.sessionTotals = {};
            if (Object.values(amounts).some(amount => amount > 0)) record.sessionTotals[sessionId] = amounts;
            else delete record.sessionTotals[sessionId];
            editingReportSessionId = null;
            saveToLocalStorage();
            renderReportDayDetail(dateKey);
            showToast('Live-session sales saved.');
        }

        function setReportView(mode) {
            if (mode !== 'grid' && mode !== 'list') return;
            reportViewMode = mode;
            renderDailyLedger();
        }

        function getDailySheetTotal(record) {
            const amount = field => Math.max(0, Number(record?.[field] || 0) || 0);
            return amount('afternoon') + amount('evening') + amount('walkIn') + amount('boxBundle') - amount('boost');
        }

        function hasDailySheetEntry(record) {
            return Boolean(record && (
                String(record.afternoonSeller || '').trim() ||
                String(record.eveningSeller || '').trim() ||
                ['afternoon', 'evening', 'walkIn', 'boxBundle', 'boost'].some(field => Number(record[field] || 0) !== 0)
            ));
        }

        function reportSellerOptions(currentValue) {
            const sellers = new Set([...getLiveHostNames().map(name => name.toUpperCase()), 'OTHERS']);
            if (currentValue) sellers.add(String(currentValue).trim().toUpperCase());
            const options = [...sellers].map(name => {
                const label = liveHostLabel(name);
                return `<option value="${escapeHtml(name)}" ${String(currentValue || '').toUpperCase() === name ? 'selected' : ''}>${escapeHtml(label)}</option>`;
            }).join('');
            return `<option value="">Choose seller</option>${options}`;
        }

        function renderReportLedgerFields(dateKey, record, editable) {
            const fields = [
                ['afternoonSeller', 'Afternoon live seller', 'seller'],
                ['afternoon', 'Afternoon sales', 'amount'],
                ['eveningSeller', 'Evening live seller', 'seller'],
                ['evening', 'Evening sales', 'amount'],
                ['walkIn', 'Walk-in sales', 'amount'],
                ['boxBundle', 'Box bundle sales', 'amount'],
                ['boost', 'Facebook boost cost', 'amount']
            ];
            const rendered = fields.map(([field, label, kind]) => {
                const savedValue = record?.[field];
                const value = field === 'afternoonSeller'
                    ? (savedValue || getReportSessionSeller(dateKey, 'afternoon'))
                    : field === 'eveningSeller'
                        ? (savedValue || getReportSessionSeller(dateKey, 'evening'))
                        : savedValue;
                if (!editable) {
                    const display = kind === 'seller'
                        ? (value ? escapeHtml(value) : '—')
                        : (Number(value || 0) > 0 ? formatCurrency(value) : '—');
                    return `<td class="whitespace-nowrap px-2 py-2.5 ${kind === 'amount' ? 'text-right font-mono' : ''}">${display}</td>`;
                }
                if (kind === 'seller') {
                    return `<td class="px-2 py-2"><select aria-label="${label} for ${escapeHtml(reportDateLabel(dateKey))}" data-ledger-field="${field}" onchange="updateReportLedgerDraft('${dateKey}', '${field}', this.value)" class="input-shadcn w-36 max-w-full px-2 py-1.5 text-xs">${reportSellerOptions(value)}</select></td>`;
                }
                return `<td class="px-2 py-2 text-right"><input type="number" min="0" step="0.01" inputmode="decimal" aria-label="${label} for ${escapeHtml(reportDateLabel(dateKey))}" data-ledger-field="${field}" value="${Number(value || 0) > 0 ? Number(value) : ''}" placeholder="—" oninput="updateReportLedgerDraft('${dateKey}', '${field}', this.value, this)" class="input-shadcn w-24 px-2 py-1.5 text-right text-xs font-mono"></td>`;
            });
            rendered.push(`<td data-sales-total class="whitespace-nowrap px-3 py-2.5 text-right font-mono text-sm font-extrabold text-gray-900 dark:text-white">${formatCurrency(getDailySheetTotal(record))}</td>`);
            return rendered.join('');
        }

        function renderReportMonth() {
            const monthTitle = document.getElementById('reportMonthTitle');
            const summary = document.getElementById('reportMonthSummary');
            const sheetBody = document.getElementById('reportDailySheetBody');
            if (!monthTitle || !summary || !sheetBody) return;
            const year = reportMonthCursor.getFullYear();
            const month = reportMonthCursor.getMonth();
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            const firstWeekday = new Date(year, month, 1).getDay();
            monthTitle.textContent = reportMonthCursor.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' });
            const grid = document.getElementById('reportCalendarGrid');
            const gridView = document.getElementById('reportGridView');
            const listView = document.getElementById('reportListView');
            const gridToggle = document.getElementById('reportGridToggle');
            const listToggle = document.getElementById('reportListToggle');
            gridView?.classList.toggle('hidden', reportViewMode !== 'grid');
            listView?.classList.toggle('hidden', reportViewMode !== 'list');
            if (gridToggle) {
                gridToggle.setAttribute('aria-pressed', String(reportViewMode === 'grid'));
                gridToggle.className = `rounded-md px-3 py-2 text-xs font-semibold transition-colors ${reportViewMode === 'grid' ? 'bg-gray-950 text-white shadow-sm dark:bg-white dark:text-gray-950' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/10'}`;
            }
            if (listToggle) {
                listToggle.setAttribute('aria-pressed', String(reportViewMode === 'list'));
                listToggle.className = `rounded-md px-3 py-2 text-xs font-semibold transition-colors ${reportViewMode === 'list' ? 'bg-gray-950 text-white shadow-sm dark:bg-white dark:text-gray-950' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/10'}`;
            }
            let monthOrderCount = 0;
            let monthSessionCount = 0;
            let daysWithRecords = 0;
            const rows = [];
            const monthDays = Array.from({ length: daysInMonth }, (_, index) => {
                const day = index + 1;
                const dateKey = reportDateKey(new Date(year, month, day));
                return { day, dateKey, data: getReportDayData(dateKey) };
            });
            const activeMineCounts = monthDays.map(({ data }) => data.orders.length).filter(count => count > 0);
            const minMineCount = activeMineCounts.length ? Math.min(...activeMineCounts) : 0;
            const maxMineCount = activeMineCounts.length ? Math.max(...activeMineCounts) : 0;
            const calendarCells = Array.from({ length: firstWeekday }, () => '<div aria-hidden="true" class="min-h-28 bg-gray-50/70 dark:bg-white/[0.02]"></div>');
            for (const { day, dateKey, data } of monthDays) {
                const sheetRecord = getDailySheetRecord(dateKey);
                const editing = editingReportDate === dateKey;
                const visibleRecord = editing ? reportLedgerDraft : sheetRecord;
                const sheetTotal = getDailySheetTotal(visibleRecord);
                const mineCount = data.orders.length;
                monthOrderCount += data.orders.length;
                monthSessionCount += data.sessions.length;
                if (data.hasRecords || hasDailySheetEntry(sheetRecord)) daysWithRecords++;
                const hasSheetTotal = hasDailySheetEntry(sheetRecord);
                const hasMineOrders = mineCount > 0;
                const today = dateKey === localDateKey();
                const mineLevel = mineCount === 0 || minMineCount === maxMineCount
                    ? (mineCount === 0 ? 'none' : 'medium')
                    : mineCount === minMineCount
                        ? 'low'
                        : mineCount === maxMineCount
                            ? 'high'
                            : 'medium';
                const mineLevelClass = mineLevel === 'high'
                    ? 'bg-emerald-100/80 dark:bg-emerald-400/10'
                    : mineLevel === 'medium'
                        ? 'bg-yellow-100/80 dark:bg-yellow-300/10'
                        : mineLevel === 'low'
                            ? 'bg-orange-100/80 dark:bg-orange-400/10'
                            : '';
                const mineCountClass = mineLevel === 'high'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-200'
                    : mineLevel === 'medium'
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-300/15 dark:text-yellow-200'
                        : mineLevel === 'low'
                            ? 'bg-orange-100 text-orange-800 dark:bg-orange-400/15 dark:text-orange-200'
                            : 'bg-gray-100 text-gray-500 dark:bg-white/[0.06] dark:text-gray-400';
                const activityBadges = [
                    hasSheetTotal ? `<span class="block truncate rounded-md bg-amber-100/80 px-2 py-1 text-[10px] font-medium text-amber-900 dark:bg-amber-400/10 dark:text-amber-200">Daily sheet · ${formatCurrency(sheetTotal)}</span>` : '',
                    hasMineOrders ? `<span class="block truncate rounded-md bg-blue-100/80 px-2 py-1 text-[10px] font-medium text-blue-900 dark:bg-blue-400/10 dark:text-blue-200">${data.orders.length} ${data.orders.length === 1 ? 'mine' : 'mines'} · ${formatCurrency(data.gross)}</span>` : '',
                    !hasSheetTotal && !hasMineOrders && data.sessions.length ? `<span class="block truncate rounded-md bg-violet-100/80 px-2 py-1 text-[10px] font-medium text-violet-900 dark:bg-violet-400/10 dark:text-violet-200">${data.sessions.length} ${data.sessions.length === 1 ? 'live session' : 'live sessions'}</span>` : ''
                ].filter(Boolean).join('');
                const calendarActivity = activityBadges || '<span class="block px-1 py-1 text-[10px] text-gray-400 dark:text-gray-500">No activity</span>';
                calendarCells.push(`<button type="button" onclick="openReportDay('${dateKey}')" aria-label="Open ${escapeHtml(reportDateLabel(dateKey))} daily sheet${mineCount ? ` and ${mineCount} mine orders` : ''}" data-mine-level="${mineLevel}" class="group min-h-28 bg-card p-2.5 text-left transition-colors hover:bg-gray-50 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-500 ${mineLevelClass} dark:hover:bg-white/[0.04]"><span class="flex items-center justify-between"><span class="grid h-7 min-w-7 place-items-center rounded-full px-1.5 text-xs font-semibold ${today ? 'bg-gray-950 text-white dark:bg-white dark:text-gray-950' : 'text-gray-800 group-hover:bg-gray-100 dark:text-gray-200 dark:group-hover:bg-white/10'}">${day}</span><span class="text-[10px] text-gray-400 dark:text-gray-500">${reportDateLabel(dateKey, { weekday: 'short' })}</span></span><span class="mt-3 grid content-start gap-1.5">${calendarActivity}</span></button>`);
                const sessionSummaries = data.sessions.map(session => ({ session, ...getReportSessionSummary(data, session) }));
                const liveSellerNames = [...new Set(sessionSummaries.map(summary => summary.seller).filter(seller => seller && seller !== '—'))];
                const liveNames = [...new Set(data.sessions.map(session => String(session.name || 'Live session').trim()).filter(Boolean))];
                const sessionTotals = sessionSummaries.reduce((totals, summary) => {
                    totals.walkIn += summary.walkIn;
                    totals.boxBundle += summary.boxBundle;
                    totals.fbBoost += summary.fbBoost;
                    totals.totalSales += summary.totalSales;
                    return totals;
                }, { walkIn: 0, boxBundle: 0, fbBoost: 0, totalSales: 0 });
                const sessionLedger = visibleRecord?.sessionTotals || {};
                const hasAssignedSessionTotals = data.sessions.some(session => sessionLedger[session.id]);
                if (!sessionSummaries.length) {
                    const legacySellers = [visibleRecord?.afternoonSeller, visibleRecord?.eveningSeller].map(seller => String(seller || '').trim().toUpperCase()).filter(Boolean);
                    liveSellerNames.push(...legacySellers);
                    if (Number(visibleRecord?.afternoon || 0) > 0 || visibleRecord?.afternoonSeller) liveNames.push('Afternoon');
                    if (Number(visibleRecord?.evening || 0) > 0 || visibleRecord?.eveningSeller) liveNames.push('Evening');
                    if (!liveNames.length && data.orders.length) liveNames.push('Mine orders');
                    if (!liveSellerNames.length) liveSellerNames.push(...data.orders.map(order => String(order.seller || '').trim().toUpperCase()).filter(Boolean));
                }
                const displayedSellers = [...new Set(liveSellerNames)];
                const walkInTotal = hasAssignedSessionTotals ? sessionTotals.walkIn : Math.max(0, Number(visibleRecord?.walkIn || 0) || 0);
                const boxBundleTotal = hasAssignedSessionTotals ? sessionTotals.boxBundle : Math.max(0, Number(visibleRecord?.boxBundle || 0) || 0);
                const fbBoostTotal = hasAssignedSessionTotals ? sessionTotals.fbBoost : Math.max(0, Number(visibleRecord?.fbBoost ?? visibleRecord?.boost ?? 0) || 0);
                const dailyTotalSales = hasAssignedSessionTotals
                    ? sessionTotals.totalSales
                    : data.gross + getDailySheetTotal(visibleRecord);
                const sellerContent = displayedSellers.length
                    ? displayedSellers.map(seller => `<span class="block whitespace-nowrap">${escapeHtml(seller)}</span>`).join('')
                    : '<span class="text-gray-400">—</span>';
                const liveNameContent = liveNames.length
                    ? liveNames.map(name => `<span class="block whitespace-nowrap">${escapeHtml(name)}</span>`).join('')
                    : '<span class="text-gray-400">—</span>';
                const actionButtons = editing
                    ? '<span class="text-[10px] font-medium text-amber-700 dark:text-amber-300">Editing below</span>'
                    : `<button type="button" onclick="openReportDay('${dateKey}')" class="btn-outline px-2.5 py-1.5 text-xs">View</button><button type="button" onclick="beginReportLedgerEdit('${dateKey}')" class="btn-outline px-2.5 py-1.5 text-xs"><i class="fa-solid fa-pen mr-1"></i>Edit</button>`;
                rows.push(`<tr data-daily-sheet-date="${dateKey}" class="transition-colors hover:bg-gray-50/70 dark:bg-slate-950/30 dark:hover:bg-white/[0.025]">
                    <td class="min-w-40 px-3 py-2.5"><button type="button" onclick="openReportDay('${dateKey}')" class="block whitespace-nowrap text-left font-semibold text-gray-900 hover:text-amber-700 dark:text-white dark:hover:text-amber-400">${escapeHtml(reportDateLabel(dateKey, { weekday: 'long', month: 'short', day: 'numeric' }))}</button><span class="mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${mineCountClass}" title="${mineCount ? `${mineLevel[0].toUpperCase()}${mineLevel.slice(1)} mine activity` : 'No mine orders'}">${mineCount} ${mineCount === 1 ? 'mine' : 'mines'}</span></td>
                    <td class="px-2 py-2.5 font-medium text-gray-800 dark:text-gray-200">${sellerContent}</td>
                    <td class="min-w-36 px-2 py-2.5 text-gray-700 dark:text-gray-300">${liveNameContent}</td>
                    <td class="whitespace-nowrap px-2 py-2.5 text-right font-mono tabular-nums">${formatCurrency(data.gross)}</td>
                    <td class="whitespace-nowrap px-2 py-2.5 text-right font-mono tabular-nums ${data.pending ? 'font-semibold text-rose-700 dark:text-rose-300' : 'text-gray-500'}">${formatCurrency(data.pending)}</td>
                    <td class="whitespace-nowrap px-2 py-2.5 text-right font-mono tabular-nums">${formatCurrency(walkInTotal)}</td>
                    <td class="whitespace-nowrap px-2 py-2.5 text-right font-mono tabular-nums">${formatCurrency(boxBundleTotal)}</td>
                    <td class="whitespace-nowrap px-2 py-2.5 text-right font-mono tabular-nums">${formatCurrency(fbBoostTotal)}</td>
                    <td data-month-sales-total class="whitespace-nowrap px-3 py-2.5 text-right font-mono text-sm font-extrabold text-gray-900 dark:text-white">${formatCurrency(dailyTotalSales)}</td>
                    <td class="px-3 py-2 text-right"><div class="inline-flex gap-1.5">${actionButtons}</div></td>
                </tr>`);
                if (editing) {
                    rows.push(`<tr class="border-b border-amber-200/70 bg-amber-50/40 dark:border-amber-500/20 dark:bg-amber-500/[0.035]"><td class="whitespace-nowrap px-3 py-3 text-[10px] font-semibold uppercase tracking-wide text-gray-500">Daily sheet fields</td>${renderReportLedgerFields(dateKey, visibleRecord, true)}<td class="px-3 py-2 text-right"><div class="inline-flex gap-1.5"><button type="button" onclick="saveReportLedgerEdit('${dateKey}', this)" class="btn-primary px-2.5 py-1.5 text-xs">Save</button><button type="button" onclick="cancelReportLedgerEdit()" class="btn-outline px-2.5 py-1.5 text-xs">Cancel</button></div></td></tr>`);
                }
            }
            const trailingBlanks = (7 - (calendarCells.length % 7)) % 7;
            for (let blank = 0; blank < trailingBlanks; blank++) calendarCells.push('<div aria-hidden="true" class="min-h-28 bg-gray-50/70 dark:bg-white/[0.02]"></div>');
            sheetBody.innerHTML = rows.join('');
            if (grid) grid.innerHTML = calendarCells.join('');
            summary.textContent = `${daysWithRecords} days with activity · ${monthOrderCount} ${monthOrderCount === 1 ? 'mine' : 'mines'} · ${monthSessionCount} ${monthSessionCount === 1 ? 'live session' : 'live sessions'}`;
        }

        async function beginReportLedgerEdit(dateKey) {
            if (editingReportDate && editingReportDate !== dateKey) {
                if (!await showAppConfirm('Discard unsaved changes?', 'Your unsaved daily sheet edits will be lost.', 'Discard changes', true)) return;
            }
            const existing = getDailySheetRecord(dateKey) || {};
            editingReportDate = dateKey;
            reportLedgerDraft = {
                date: dateKey,
                afternoonSeller: existing.afternoonSeller || getReportSessionSeller(dateKey, 'afternoon'),
                afternoon: Number(existing.afternoon || 0),
                eveningSeller: existing.eveningSeller || getReportSessionSeller(dateKey, 'evening'),
                evening: Number(existing.evening || 0),
                walkIn: Number(existing.walkIn || 0),
                boxBundle: Number(existing.boxBundle || 0),
                boost: Number(existing.boost || 0)
            };
            renderDailyLedger();
        }

        function updateReportLedgerDraft(dateKey, field, value, input = null) {
            if (editingReportDate !== dateKey || !reportLedgerDraft) return;
            const validFields = ['afternoonSeller', 'afternoon', 'eveningSeller', 'evening', 'walkIn', 'boxBundle', 'boost'];
            if (!validFields.includes(field)) return;
            reportLedgerDraft[field] = field.endsWith('Seller') ? String(value || '') : Math.max(0, Number(value || 0) || 0);
            if (input) {
                const row = input.closest('tr');
                const total = row?.querySelector('[data-sales-total]');
                if (total) total.textContent = formatCurrency(getDailySheetTotal(reportLedgerDraft));
            }
        }

        function saveReportLedgerEdit(dateKey, button) {
            if (editingReportDate !== dateKey || !reportLedgerDraft) return;
            const row = button?.closest('tr');
            if (row) {
                row.querySelectorAll('[data-ledger-field]').forEach(field => {
                    const key = field.dataset.ledgerField;
                    reportLedgerDraft[key] = key.endsWith('Seller') ? String(field.value || '').trim() : Math.max(0, Number(field.value || 0) || 0);
                });
            }
            if (!Array.isArray(db.dailyLedger)) db.dailyLedger = [];
            let record = getDailySheetRecord(dateKey);
            if (!record) {
                record = { date: dateKey };
                db.dailyLedger.push(record);
            }
            Object.assign(record, reportLedgerDraft);
            recordAuditEvent('Updated daily sales sheet', 'Daily sales', dateKey, `Daily ledger entries for ${dateKey} updated`);
            editingReportDate = null;
            reportLedgerDraft = null;
            saveToLocalStorage();
        }

        function cancelReportLedgerEdit() {
            editingReportDate = null;
            reportLedgerDraft = null;
            renderDailyLedger();
        }

        function deleteEmptyReportSession(dateKey, sessionId) {
            const session = (db.liveSessions || []).find(item => item.id === sessionId);
            if (!session) return;
            const sessionDate = session.date || (session.startedAt ? localDateKey(new Date(session.startedAt)) : '');
            if (sessionDate !== dateKey) return;
            requestDeleteLiveSession(encodeURIComponent(sessionId));
        }

        function renderReportDayDetail(dateKey) {
            const data = getReportDayData(dateKey);
            const title = document.getElementById('reportDayTitle');
            const subtitle = document.getElementById('reportDaySubtitle');
            const sheetBody = document.getElementById('reportDaySheetBody');
            const tbody = document.getElementById('reportDayTableBody');
            title.textContent = reportDateLabel(dateKey, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
            subtitle.textContent = `${data.orders.length} ${data.orders.length === 1 ? 'mine order' : 'mine orders'} recorded on this date · ${data.sessions.length} ${data.sessions.length === 1 ? 'live session' : 'live sessions'} linked to this date. Sales are grouped by order date, even when a live started earlier.`;
            const sessionSummaries = data.sessions.map(session => ({ session, ...getReportSessionSummary(data, session) }));
            const dayTotals = sessionSummaries.reduce((result, summary) => {
                result.mineSales += summary.mineSales;
                result.unpaid += summary.unpaid;
                result.walkIn += summary.walkIn;
                result.boxBundle += summary.boxBundle;
                result.fbBoost += summary.fbBoost;
                result.totalSales += summary.totalSales;
                return result;
            }, { mineSales: 0, unpaid: 0, walkIn: 0, boxBundle: 0, fbBoost: 0, totalSales: 0 });
            const sessionRows = sessionSummaries.map(summary => {
                const { session, orders, seller, mineSales, unpaid, walkIn, boxBundle, fbBoost, totalSales } = summary;
                const isEditing = editingReportSessionId === session.id;
                const sessionId = encodeURIComponent(session.id);
                const amountCell = (field, value, label) => isEditing
                    ? `<td class="px-3 py-2 text-right"><input type="number" min="0" step="0.01" inputmode="decimal" aria-label="${label} for ${escapeHtml(session.name || 'live session')}" data-report-session-field="${field}" value="${value || ''}" placeholder="0.00" class="input-shadcn w-28 px-2 py-1.5 text-right text-xs font-mono"></td>`
                    : `<td class="whitespace-nowrap px-3 py-3 text-right font-mono tabular-nums">${formatCurrency(value)}</td>`;
                const extras = getDailySheetRecord(dateKey)?.sessionTotals?.[session.id] || {};
                const canDelete = !orders.length && !walkIn && !boxBundle && !fbBoost;
                const actions = isEditing
                    ? `<div class="inline-flex gap-1"><button type="button" onclick="saveReportSessionEdit('${dateKey}', decodeURIComponent('${sessionId}'), this)" class="btn-primary px-2.5 py-1.5 text-xs">Save</button><button type="button" onclick="cancelReportSessionEdit('${dateKey}')" class="btn-outline px-2.5 py-1.5 text-xs">Cancel</button></div>`
                    : `<div class="inline-flex gap-1"><button type="button" onclick="beginReportSessionEdit('${dateKey}', decodeURIComponent('${sessionId}'))" class="btn-outline px-2.5 py-1.5 text-xs"><i class="fa-solid fa-pen mr-1" aria-hidden="true"></i>Edit</button>${canDelete ? `<button type="button" data-delete-report-session="${escapeHtml(session.id)}" data-report-date="${escapeHtml(dateKey)}" class="rounded-md px-2 py-1.5 text-xs font-medium text-rose-700 transition-colors hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 dark:text-rose-300 dark:hover:bg-rose-500/10">Delete</button>` : ''}</div>`;
                return `<tr class="transition-colors hover:bg-gray-50/70 dark:hover:bg-white/[0.025]"><td class="whitespace-nowrap px-3 py-3 font-semibold text-gray-800 dark:text-gray-200">${escapeHtml(seller)}</td><td class="min-w-40 px-3 py-3"><span class="block font-medium text-gray-900 dark:text-white">${escapeHtml(session.name || 'Live session')}</span><span class="mt-0.5 block text-[11px] text-gray-500">Sales on ${escapeHtml(reportDateLabel(dateKey, { weekday: 'short', month: 'short', day: 'numeric' }))} · live started ${escapeHtml(formatLiveSessionTimestamp(session))}</span></td><td class="whitespace-nowrap px-3 py-3 text-right font-mono font-semibold tabular-nums">${formatCurrency(mineSales)}</td><td class="whitespace-nowrap px-3 py-3 text-right font-mono font-semibold tabular-nums ${unpaid ? 'text-rose-700 dark:text-rose-300' : 'text-gray-500'}">${formatCurrency(unpaid)}</td>${amountCell('walkIn', extras.walkIn ?? walkIn, 'Walk-in sales')}${amountCell('boxBundle', extras.boxBundle ?? boxBundle, 'Box bundle sales')}${amountCell('fbBoost', extras.fbBoost ?? extras.boost ?? fbBoost, 'Facebook boost cost')}<td class="whitespace-nowrap px-3 py-3 text-right font-mono font-bold tabular-nums text-gray-950 dark:text-white">${formatCurrency(totalSales)}</td><td class="px-3 py-2 text-right">${actions}</td></tr>`;
            }).join('');
            const totalsRow = sessionSummaries.length
                ? `<tr class="border-t-2 border-gray-200 bg-gray-50/80 font-semibold dark:border-white/10 dark:bg-white/[0.035]"><td colspan="2" class="whitespace-nowrap px-3 py-3 text-gray-800 dark:text-gray-200">Day total</td><td class="whitespace-nowrap px-3 py-3 text-right font-mono tabular-nums">${formatCurrency(dayTotals.mineSales)}</td><td class="whitespace-nowrap px-3 py-3 text-right font-mono tabular-nums text-rose-700 dark:text-rose-300">${formatCurrency(dayTotals.unpaid)}</td><td class="whitespace-nowrap px-3 py-3 text-right font-mono tabular-nums">${formatCurrency(dayTotals.walkIn)}</td><td class="whitespace-nowrap px-3 py-3 text-right font-mono tabular-nums">${formatCurrency(dayTotals.boxBundle)}</td><td class="whitespace-nowrap px-3 py-3 text-right font-mono tabular-nums">${formatCurrency(dayTotals.fbBoost)}</td><td class="whitespace-nowrap px-3 py-3 text-right font-mono tabular-nums">${formatCurrency(dayTotals.totalSales)}</td><td></td></tr>`
                : '';
            sheetBody.innerHTML = sessionRows
                ? `${sessionRows}${totalsRow}`
                : '<tr><td colspan="9" class="px-3 py-8 text-center text-sm text-gray-500">No live sessions were recorded for this date. Older day-level totals remain available in the monthly sheet.</td></tr>';
            const sessionsById = new Map((db.liveSessions || []).map(session => [session.id, session]));
            if (!data.orders.length) {
                tbody.innerHTML = '<tr><td colspan="7" class="py-8 px-3 text-center text-sm text-gray-500">No mine orders recorded for this date.</td></tr>';
            } else {
                tbody.innerHTML = data.orders.map(mine => {
                    const amounts = getReportOrderAmounts(mine);
                    const session = sessionsById.get(mine.sessionId);
                    const status = getMinePaymentStatus(mine);
                    const statusLabel = status === 'PAID' ? 'Paid' : status === 'PARTIAL' ? 'Partial' : 'Unpaid';
                    const statusStyle = status === 'PAID'
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300'
                        : status === 'PARTIAL'
                            ? 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300'
                            : 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300';
                    const statusControl = status === 'PAID'
                        ? `<span class="inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium ${statusStyle}">${escapeHtml(statusLabel)}</span>`
                        : `<button type="button" data-open-mine-order="${escapeHtml(mine.id)}" title="Open this mine order in its live-session records" class="inline-flex cursor-pointer items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${statusStyle}">${escapeHtml(statusLabel)}<i class="fa-solid fa-arrow-up-right-from-square text-[9px]" aria-hidden="true"></i></button>`;
                    return `<tr class="transition-colors hover:bg-gray-50/70 dark:bg-slate-950/30 dark:hover:bg-white/[0.025]"><td class="py-3 px-3 font-medium text-gray-900 dark:text-white">${escapeHtml(mine.name || '—')}</td><td class="py-3 px-3">${escapeHtml(mine.item || '—')}</td><td class="py-3 px-3">${escapeHtml(session?.name || 'Unassigned / earlier order')}</td><td class="py-3 px-3">${statusControl}</td><td class="py-3 px-3 text-right font-medium tabular-nums">${formatCurrency(amounts.total)}</td><td class="py-3 px-3 text-right tabular-nums">${formatCurrency(amounts.collected)}</td><td class="py-3 px-3 text-right font-medium tabular-nums ${amounts.balance > 0 ? 'text-rose-700 dark:text-rose-300' : 'text-gray-500'}">${formatCurrency(amounts.balance)}</td></tr>`;
                }).join('');
                tbody.querySelectorAll('[data-open-mine-order]').forEach(button => button.addEventListener('click', () => openMineOrderRecord(button.dataset.openMineOrder)));
            }
            sheetBody.querySelectorAll('[data-delete-report-session]').forEach(button => {
                button.addEventListener('click', () => deleteEmptyReportSession(button.dataset.reportDate, button.dataset.deleteReportSession));
            });
        }

        function renderDailyLedger() {
            renderReportMonth();
            const calendar = document.getElementById('reportCalendarView');
            const detail = document.getElementById('reportDayDetail');
            const showingDetail = Boolean(selectedReportDate);
            calendar?.classList.toggle('hidden', showingDetail);
            detail?.classList.toggle('hidden', !showingDetail);
            if (showingDetail) renderReportDayDetail(selectedReportDate);
        }

        // Modals & Actions
        function openNewMineModal() {
            const activeSession = getActiveLiveSession();
            if (!activeSession) {
                openMineAfterSessionStart = true;
                startLiveSession();
                return;
            }
            if (mineSessionView === '__history__' && activeSession) {
                mineSessionView = activeSession.id;
                mineFilterTab = 'ALL';
                renderFullMinesTable();
            }
            document.getElementById('formMineOrder').reset();
            updateMinePaymentStatusFromAmounts();
            updateMineDeliveryStatusColor(document.getElementById('mineDeliveryStatus').value);
            document.getElementById('mineDate').value = localDateKey();
            document.getElementById('mineTime').value = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            document.getElementById('mineAdminName').value = getSignedInAdminName();
            document.getElementById('mineSeller').innerHTML = liveHostOptions('TRICIA', false, false);
            document.getElementById('mineSeller').value = 'TRICIA';
            updateMineOrderHeaderDateTime();
            document.getElementById('modalNewMine').classList.remove('hidden');
        }

        function closeNewMineModal() {
            const modal = document.getElementById('modalNewMine');
            modal.classList.add('hidden');
            delete modal.dataset.editId;
        }

        function addMineItemForBuyer(buyerName, seller) {
            const activeSession = getActiveLiveSession();
            if (!activeSession) {
                showToast('Start a live session before adding another item.', true);
                return;
            }
            mineSessionView = activeSession.id;
            mineFilterTab = 'ALL';
            activeLiveSessionId = activeSession.id;
            db.activeLiveSessionId = activeSession.id;
            renderFullMinesTable();
            openNewMineModal();
            document.getElementById('mineBuyerName').value = buyerName;
            const sellerSelect = document.getElementById('mineSeller');
            if ([...sellerSelect.options].some(option => option.value === seller)) sellerSelect.value = seller;
            document.getElementById('mineItemDetails').focus();
            updateMinePaymentStatusFromAmounts();
            showToast(`Add another item for ${buyerName}`);
        }

        function saveNewMineOrder(e) {
            e.preventDefault();
            const paymentStatus = document.getElementById('mineStatus').value;
            const paymentReference = document.getElementById('mineRef').value.trim();
            if (paymentStatus === 'PAID' && !paymentReference) {
                showToast('Add a payment reference before marking this order paid.', true);
                document.getElementById('mineRef').focus();
                return;
            }
            const deliveryStatus = document.getElementById('mineDeliveryStatus').value;
            if (deliveryStatus === 'SHIPPED' && document.getElementById('mineStatus').value !== 'PAID') {
                showToast('Mark the order fully paid before setting it to SHIPPED.', true);
                document.getElementById('mineDeliveryStatus').focus();
                return;
            }
            // before saving, attempt to decrement stock if linked
            const editId = document.getElementById('modalNewMine').dataset.editId;
            if (!editId && !getActiveLiveSession()) {
                resumeMineAfterSessionStart = true;
                startLiveSession();
                return;
            }
            const deliveryNote = document.getElementById('mineDeliveryNote').value.trim();
            if (deliveryStatus === 'NOT SHIPPED' && !deliveryNote) {
                showToast('Add a reason or note for an item that is not shipped.', true);
                document.getElementById('mineDeliveryNote').focus();
                return;
            }
            // before saving, attempt to decrement stock if linked
            const proceed = quickMineSaveFromModal();
            if (!proceed) return;

            if (editId) {
                const mine = db.mines.find(m => m.id === editId);
                if (!mine) return;
                mine.date = document.getElementById('mineDate').value;
                mine.time = document.getElementById('mineTime').value;
                mine.name = document.getElementById('mineBuyerName').value;
                mine.item = document.getElementById('mineItemDetails').value;
                mine.price = parseFloat(document.getElementById('minePrice').value) || 0;
                mine.dp = parseFloat(document.getElementById('mineDp').value) || 0;
                mine.total = parseFloat(document.getElementById('mineTotal').value) || 0;
                mine.status = document.getElementById('mineStatus').value;
                mine.sku = document.getElementById('mineSKU').value.trim();
                mine.seller = document.getElementById('mineSeller').value;
                mine.mop = document.getElementById('mineMop').value;
                mine.ref = document.getElementById('mineRef').value || mine.ref;
                mine.deliveryStatus = document.getElementById('mineDeliveryStatus').value;
                mine.deliveryNote = document.getElementById('mineDeliveryNote').value.trim();
                mine.shippingFeeStatus = document.getElementById('mineShippingFeeStatus').value;
                mine.updatedBy = getSignedInAdminName();
                recordAuditEvent('Updated mine order', 'Mine order', mine.id, `${mine.name} · ${mine.item} updated`);
                delete document.getElementById('modalNewMine').dataset.editId;
                closeNewMineModal();
                saveToLocalStorage();
                refreshAllUI();
                showToast(`Updated mine for ${mine.name}`);
                return;
            }

            const newMine = {
                id: 'm_' + Date.now(),
                date: document.getElementById('mineDate').value,
                time: document.getElementById('mineTime').value,
                name: document.getElementById('mineBuyerName').value,
                item: document.getElementById('mineItemDetails').value,
                price: parseFloat(document.getElementById('minePrice').value) || 0,
                dp: parseFloat(document.getElementById('mineDp').value) || 0,
                total: parseFloat(document.getElementById('mineTotal').value) || 0,
                status: document.getElementById('mineStatus').value,
                sku: document.getElementById('mineSKU').value.trim(),
                seller: document.getElementById('mineSeller').value,
                mop: document.getElementById('mineMop').value,
                ref: document.getElementById('mineRef').value || '',
                deliveryStatus: document.getElementById('mineDeliveryStatus').value,
                deliveryNote: document.getElementById('mineDeliveryNote').value.trim(),
                shippingFeeStatus: document.getElementById('mineShippingFeeStatus').value,
                createdBy: getSignedInAdminName(),
                sessionId: activeLiveSessionId
            };
            db.mines.unshift(newMine);
            recordAuditEvent('Recorded mine order', 'Mine order', newMine.id, `${newMine.name} · ${newMine.item} · ${formatCurrency(newMine.total)}`);
            closeNewMineModal();
            saveToLocalStorage();
            refreshAllUI();
            showToast(`Successfully recorded mine for ${newMine.name}!`);
        }

        function toggleOrderStatus(id) {
            const mine = db.mines.find(m => m.id === id);
            if (mine) {
                if (mine.status === 'PAID') mine.status = getMinePaymentStatusFromAmounts(mine.total, mine.dp);
                else {
                    mine.dp = Math.max(0, Number(mine.total || mine.price || 0));
                    mine.status = 'PAID';
                }
                recordAuditEvent('Updated payment status', 'Mine order', mine.id, `${mine.name} marked ${mine.status}`);
                saveToLocalStorage();
                showToast(`Order status updated to ${mine.status}`);
            }
        }

        async function deleteMineOrder(id) {
            const mine = (db.mines || []).find(item => item.id === id);
            if (!mine || !await showAppConfirm('Move this order to Trash?', 'You can restore this mine order later from Audit Logs.', 'Move to Trash', true)) return;
            moveRecordToTrash('Mine order', mine, `${mine.name || 'Buyer'} · ${mine.item || 'Order'}`);
            db.mines = db.mines.filter(item => item.id !== id);
            saveToLocalStorage();
            showToast('Order moved to Audit Logs trash.');
        }

        function viewMine(id) {
            const mine = db.mines.find(m => m.id === id);
            if (!mine) return;
            const el = document.getElementById('viewMineContent');
            const paymentStatus = getMinePaymentStatus(mine);
            const paymentStyle = paymentStatus === 'PAID'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300'
                : paymentStatus === 'PARTIAL'
                    ? 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300'
                    : 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300';
            const deliveryStatus = String(mine.deliveryStatus || 'PENDING').toUpperCase();
            const deliveryStyle = deliveryStatus === 'SHIPPED'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300'
                : deliveryStatus === 'NOT SHIPPED'
                    ? 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300'
                    : deliveryStatus === 'PICK UP'
                        ? 'border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-300'
                        : deliveryStatus === 'MAXIM'
                            ? 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300'
                            : 'border-gray-200 bg-gray-100 text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300';
            const orderDate = reportDateLabel(mine.date, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
            const initials = String(mine.name || '?').trim().split(/\s+/).slice(0, 2).map(part => part.charAt(0)).join('').toUpperCase();
            document.getElementById('viewMineSubtitle').textContent = `Order ${mine.id}`;
            el.innerHTML = `
                <section class="rounded-xl border border-gray-200 bg-gray-50/80 p-3.5 dark:border-gray-800 dark:bg-gray-900/60 sm:p-4">
                    <div class="flex flex-wrap items-center justify-between gap-3">
                        <div class="flex min-w-0 items-center gap-3"><span class="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-amber-100 text-sm font-bold text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">${escapeHtml(initials)}</span><div class="min-w-0"><p class="truncate text-base font-bold text-gray-950 dark:text-white">${escapeHtml(mine.name || 'Unknown buyer')}</p><p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">${escapeHtml(orderDate)}${mine.time ? ` · ${escapeHtml(mine.time)}` : ''}</p></div></div>
                        <span class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold ${paymentStyle}"><i class="fa-solid ${paymentStatus === 'PAID' ? 'fa-circle-check' : paymentStatus === 'PARTIAL' ? 'fa-hourglass-half' : 'fa-clock'}" aria-hidden="true"></i>${escapeHtml(paymentStatus === 'PARTIAL' ? 'PARTIALLY PAID' : paymentStatus)}</span>
                    </div>
                    <div class="mt-4 flex items-start gap-3 border-t border-gray-200 pt-3 dark:border-gray-800"><span class="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white text-amber-600 dark:bg-gray-800 dark:text-amber-300"><i class="fa-solid fa-bag-shopping" aria-hidden="true"></i></span><div class="min-w-0 flex-1"><p class="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Item</p><p class="mt-1 break-words text-sm font-semibold leading-5 text-gray-900 dark:text-white">${escapeHtml(mine.item || 'Item')}</p><p class="mt-1 text-[11px] text-gray-500 dark:text-gray-400">Item ID: <span class="font-mono text-gray-700 dark:text-gray-300">${escapeHtml(mine.sku || '—')}</span></p></div><span class="shrink-0 rounded-full border px-2 py-1 text-[10px] font-bold ${deliveryStyle}">${escapeHtml(deliveryStatus)}</span></div>
                </section>
                <section class="mt-4 grid grid-cols-3 gap-2 sm:gap-3" aria-label="Order amounts">
                    <div class="rounded-lg border border-gray-200 p-3 dark:border-gray-800"><p class="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Price</p><p class="mt-1 text-xs font-semibold tabular-nums text-gray-900 dark:text-white sm:text-sm">${formatCurrency(mine.price)}</p></div>
                    <div class="rounded-lg border border-gray-200 p-3 dark:border-gray-800"><p class="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Downpayment</p><p class="mt-1 text-xs font-semibold tabular-nums text-gray-900 dark:text-white sm:text-sm">${formatCurrency(mine.dp)}</p></div>
                    <div class="rounded-lg border border-amber-200 bg-amber-50/70 p-3 dark:border-amber-500/20 dark:bg-amber-500/[0.06]"><p class="text-[10px] font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-300">Total</p><p class="mt-1 text-xs font-bold tabular-nums text-gray-950 dark:text-white sm:text-sm">${formatCurrency(mine.total)}</p></div>
                </section>
                <section class="mt-4"><h4 class="mb-2 text-xs font-semibold text-gray-900 dark:text-white">Payment & fulfillment</h4><dl class="grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl border border-gray-200 p-3.5 dark:border-gray-800 sm:p-4">
                    <div><dt class="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Reference / Ref #</dt><dd class="mt-1 break-all text-xs font-medium text-gray-900 dark:text-gray-100">${escapeHtml(mine.ref || '—')}</dd></div>
                    <div><dt class="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Mode of payment</dt><dd class="mt-1 text-xs font-medium text-gray-900 dark:text-gray-100">${escapeHtml(mine.mop === 'BPI' ? 'Bank' : mine.mop === 'COD' ? 'Cash' : mine.mop || '—')}</dd></div>
                    <div><dt class="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Shipping fee</dt><dd class="mt-1 text-xs font-medium text-gray-900 dark:text-gray-100">${escapeHtml(getShippingFeeStatusLabel(mine.shippingFeeStatus))}</dd></div>
                    <div><dt class="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Live seller host</dt><dd class="mt-1 text-xs font-medium text-gray-900 dark:text-gray-100">${escapeHtml(liveHostLabel(mine.seller || ''))}</dd></div>
                    ${mine.deliveryNote ? `<div class="col-span-2 border-t border-gray-100 pt-2.5 dark:border-gray-800"><dt class="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Remarks</dt><dd class="mt-1 whitespace-pre-wrap break-words text-xs leading-5 text-gray-800 dark:text-gray-200">${escapeHtml(mine.deliveryNote)}</dd></div>` : ''}
                </dl></section>
            `;
            document.getElementById('modalViewMine').classList.remove('hidden');
        }

        function closeViewMineModal() { document.getElementById('modalViewMine').classList.add('hidden'); }

        function editMineFromRow(id) {
            const mine = db.mines.find(m => m.id === id);
            if (!mine) return;
            // populate the new mine modal for editing
            document.getElementById('mineDate').value = mine.date;
            document.getElementById('mineTime').value = mine.time;
            document.getElementById('mineAdminName').value = getSignedInAdminName();
            document.getElementById('mineBuyerName').value = mine.name;
            document.getElementById('mineItemDetails').value = mine.item;
            document.getElementById('minePrice').value = mine.price;
            document.getElementById('mineDp').value = mine.dp;
            document.getElementById('mineTotal').value = mine.total;
            document.getElementById('mineSKU').value = mine.sku || '';
            document.getElementById('mineRef').value = mine.ref || '';
            document.getElementById('mineStatus').value = getMinePaymentStatus(mine);
            document.getElementById('mineSeller').innerHTML = liveHostOptions(mine.seller, false, true);
            document.getElementById('mineSeller').value = mine.seller;
            document.getElementById('mineMop').value = mine.mop === 'BPI' ? 'Bank' : mine.mop === 'COD' ? 'Cash' : mine.mop;
            document.getElementById('mineDeliveryStatus').value = mine.deliveryStatus || 'PENDING';
            updateMinePaymentStatusUI(getMinePaymentStatus(mine));
            updateMineDeliveryStatusColor(document.getElementById('mineDeliveryStatus').value);
            document.getElementById('mineDeliveryNote').value = mine.deliveryNote || '';
            document.getElementById('mineShippingFeeStatus').value = normalizeShippingFeeStatus(mine.shippingFeeStatus);
            updateMineOrderHeaderDateTime();
            // mark modal for editing
            document.getElementById('modalNewMine').dataset.editId = id;
            document.getElementById('modalNewMine').classList.remove('hidden');
        }

        function openNewShirtModal() {
            renderProductOptionInputs();
            document.getElementById('formNewShirt').reset();
            const modal = document.getElementById('modalNewShirt');
            delete modal.dataset.editId;
            document.getElementById('productModalTitle').lastChild.textContent = ' Add Product';
            modal.classList.remove('hidden');
        }

        function closeNewShirtModal() {
            const modal = document.getElementById('modalNewShirt');
            delete modal.dataset.editId;
            document.getElementById('productModalTitle').lastChild.textContent = ' Add Product';
            modal.classList.add('hidden');
        }

        function saveNewShirt(e) {
            e.preventDefault();
            const newShirt = {
                id: 's_' + Date.now(),
                name: document.getElementById('shirtNameInput').value,
                size: document.getElementById('shirtSizeInput').value,
                color: document.getElementById('shirtColorInput').value,
                qty: parseInt(document.getElementById('shirtQtyInput').value) || 20,
                cost: parseFloat(document.getElementById('shirtCostInput').value) || 180,
                price: parseFloat(document.getElementById('shirtPriceInput').value) || 380,
                soldCount: 0
            };
            db.shirts.unshift(newShirt);
            closeNewShirtModal();
            saveToLocalStorage();
            showToast('Product added to catalog');
        }

        async function quickMineShirt(shirtId) {
            const shirt = db.shirts.find(s => s.id === shirtId);
            if (!shirt || shirt.qty <= 0) {
                showToast('Product is out of stock!', true);
                return;
            }
            if (!getActiveLiveSession()) {
                pendingQuickMineShirtId = shirtId;
                startLiveSession();
                return;
            }
            const buyer = await showAppPrompt('Record a quick mine', 'Enter the buyer’s name or Facebook profile.', 'Buyer name / Facebook profile', 'Live Buyer', 'Continue');
            if (!buyer) return;
            shirt.qty--;
            shirt.soldCount = (shirt.soldCount || 0) + 1;

            const newMine = {
                id: 'm_' + Date.now(),
                date: localDateKey(),
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                name: buyer,
                item: `${shirt.name}${formatProductVariant(shirt) ? ` (${formatProductVariant(shirt)})` : ''}`,
                price: shirt.price,
                dp: 0,
                total: shirt.price,
                status: 'UNPAID',
                sku: generateSmartSKU(shirt.name, shirt.color, shirt.size),
                seller: 'TRICIA',
                mop: 'GCash',
                deliveryStatus: 'PENDING',
                shippingFeeStatus: 'NONE',
                createdBy: getSignedInAdminName(),
                sessionId: activeLiveSessionId
            };
            db.mines.unshift(newMine);
            saveToLocalStorage();
            refreshAllUI();
            showToast(`Quick mined 1x ${shirt.name} to ${buyer}!`);
        }

        function restockShirt(shirtId) {
            const shirt = db.shirts.find(s => s.id === shirtId);
            if (!shirt) return;
            // open restock modal and set context
            document.getElementById('modalRestock').dataset.shirtId = shirtId;
            document.getElementById('restockCurrentQty').innerText = shirt.qty;
            document.getElementById('restockShirtName').innerText = shirt.name + (formatProductVariant(shirt) ? ' (' + formatProductVariant(shirt) + ')' : '');
            const q = document.getElementById('restockQtyInput');
            q.value = 10;
            document.getElementById('modalRestock').classList.remove('hidden');
            setTimeout(()=>{ q.focus(); q.select(); },120);
        }

        function closeRestockModal() {
            document.getElementById('modalRestock').classList.add('hidden');
            delete document.getElementById('modalRestock').dataset.shirtId;
        }

        function confirmRestock() {
            const modal = document.getElementById('modalRestock');
            const id = modal.dataset.shirtId;
            if (!id) return closeRestockModal();
            const add = parseInt(document.getElementById('restockQtyInput').value) || 0;
            const shirt = db.shirts.find(s => s.id === id);
            if (!shirt) return closeRestockModal();
            shirt.qty = (shirt.qty || 0) + add;
            recordAuditEvent('Restocked product', 'Product', shirt.id, `${shirt.name}: +${add} units`);
            saveToLocalStorage();
            closeRestockModal();
            refreshAllUI();
            showToast(`Restocked ${shirt.name} by ${add} units`);
        }

        async function deleteShirt(id) {
            const shirt = (db.shirts || []).find(item => item.id === id);
            if (!shirt || !await showAppConfirm('Move this product to Trash?', 'You can restore this product later from Audit Logs.', 'Move to Trash', true)) return;
            moveRecordToTrash('Product', shirt, `${shirt.name}${formatProductVariant(shirt) ? ` (${formatProductVariant(shirt)})` : ''}`);
            db.shirts = db.shirts.filter(item => item.id !== id);
            saveToLocalStorage();
            refreshAllUI();
            showToast('Product moved to Audit Logs trash.');
        }

        function editShirt(id) {
            const shirt = db.shirts.find(s => s.id === id);
            if (!shirt) return;
            renderProductOptionInputs();
            // populate modal inputs and open
            document.getElementById('productCategoryInput').value = shirt.category || inferProductCategory(shirt.name);
            document.getElementById('shirtNameInput').value = shirt.name;
            document.getElementById('shirtSizeInput').value = shirt.size === 'N/A' ? '' : (shirt.size || '');
            document.getElementById('shirtColorInput').value = shirt.color === 'N/A' ? '' : (shirt.color || '');
            document.getElementById('shirtQtyInput').value = shirt.qty;
            document.getElementById('shirtCostInput').value = shirt.cost;
            document.getElementById('shirtPriceInput').value = shirt.price;
            // set a temporary editing id
            const modal = document.getElementById('modalNewShirt');
            modal.dataset.editId = id;
            document.getElementById('productModalTitle').lastChild.textContent = ' Edit Product';
            modal.classList.remove('hidden');
        }

        // modify saveNewShirt to handle edit case
        const originalSaveNewShirt = saveNewShirt;
        function saveNewShirt(e) {
            e.preventDefault();
            const modal = document.getElementById('modalNewShirt');
            const editId = modal.dataset.editId;
            const options = ensureProductOptions();
            const category = document.getElementById('productCategoryInput').value;
            if (!options.categories.includes(category)) {
                showToast('Add or choose a category in Products before saving.', true);
                return;
            }
            const sizeInput = document.getElementById('shirtSizeInput');
            const size = cleanProductOption(sizeInput.value);
            sizeInput.value = size.toLowerCase() === 'n/a' ? '' : options.sizes.find(value => value.toLowerCase() === size.toLowerCase()) || size;
            if (editId) {
                const shirt = db.shirts.find(s => s.id === editId);
                if (!shirt) return;
                shirt.category = document.getElementById('productCategoryInput').value;
                shirt.name = document.getElementById('shirtNameInput').value;
                shirt.size = document.getElementById('shirtSizeInput').value.trim() || 'N/A';
                shirt.color = document.getElementById('shirtColorInput').value.trim() || 'N/A';
                shirt.qty = parseInt(document.getElementById('shirtQtyInput').value) || shirt.qty;
                shirt.cost = parseFloat(document.getElementById('shirtCostInput').value) || shirt.cost;
                shirt.price = parseFloat(document.getElementById('shirtPriceInput').value) || shirt.price;
                recordAuditEvent('Updated product', 'Product', shirt.id, `${shirt.name} inventory details updated`);
                delete modal.dataset.editId;
                closeNewShirtModal();
                saveToLocalStorage();
                refreshAllUI();
                showToast('Product updated successfully');
                return;
            }
            // original add behavior
            const newShirt = {
                id: 's_' + Date.now(),
                category: document.getElementById('productCategoryInput').value,
                name: document.getElementById('shirtNameInput').value,
                size: document.getElementById('shirtSizeInput').value.trim() || 'N/A',
                color: document.getElementById('shirtColorInput').value.trim() || 'N/A',
                qty: parseInt(document.getElementById('shirtQtyInput').value) || 20,
                cost: parseFloat(document.getElementById('shirtCostInput').value) || 180,
                price: parseFloat(document.getElementById('shirtPriceInput').value) || 380,
                soldCount: 0
            };
            db.shirts.unshift(newShirt);
            recordAuditEvent('Added product', 'Product', newShirt.id, `${newShirt.name} added with ${newShirt.qty} units`);
            closeNewShirtModal();
            saveToLocalStorage();
            refreshAllUI();
            showToast('Product added to catalog');
        }

        async function exportJSONBackup() {
            try {
                if (!currentAuthUser || !navigator.onLine) throw new Error('Sign in while online to create a portable encrypted backup.');
                const client = await getSupabaseClient();
                const result = await invokeWorkspaceSync(client, { action: 'export', snapshot: db });
                const backup = { format: 'clothes-mania-pos-encrypted-backup', version: 2, snapshot: result.snapshot };
                const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
                const objectUrl = URL.createObjectURL(blob);
                const dl = document.createElement('a');
                dl.href = objectUrl;
                dl.download = `clothes_mania_davao_encrypted_backup_${new Date().toISOString().split('T')[0]}.json`;
                document.body.appendChild(dl);
                dl.click();
                dl.remove();
                window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
                showToast('Server-encrypted JSON backup downloaded successfully');
            } catch (error) {
                console.error('Could not create the encrypted workspace backup.', error);
                showToast('Encrypted backup failed. Your local records were not changed.', true);
            }
        }

        // --- Smart SKU & quick-mine helpers ---
        function slugifyForSku(text) {
            return text.toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        }

        function generateSmartSKU(name, color, size) {
            // Example: CM-BLK-L-042
            const brand = 'CM';
            const colorCode = (color || 'GEN').toString().slice(0,3).toUpperCase();
            const sizeCode = (size || 'M').toString().toUpperCase();
            let itemId = '';
            do {
                const rand = Math.floor(100 + Math.random() * 900);
                itemId = `${brand}-${colorCode}-${sizeCode}-${rand}`;
            } while ((db.mines || []).some(mine => mine.sku === itemId));
            return itemId;
        }

        function generateSKUForModal() {
            const details = document.getElementById('mineItemDetails').value || '';
            // crude parse: look for (Color, Size) pattern
            let color = '';
            let size = '';
            const m = details.match(/\(([^,\)]+)\s*,\s*([^\)]+)\)/);
            if (m) { color = m[1].trim().split(' ')[0]; size = m[2].trim().split(' ')[0]; }
            const sku = generateSmartSKU(details, color, size);
            document.getElementById('mineSKU').value = sku;
        }

        function handleMineItemInput(val) {
            const suggestions = document.getElementById('mineItemSuggestions');
            suggestions.innerHTML = '';
            if (!val || val.length < 2) { suggestions.classList.add('hidden'); document.getElementById('mineShirtId').value = ''; document.getElementById('mineSKU').value=''; return; }
            const q = val.toLowerCase();
            const matches = db.shirts.filter(s => (s.name + ' ' + s.color).toLowerCase().includes(q)).slice(0,8);
            if (matches.length === 0) { suggestions.classList.add('hidden'); document.getElementById('mineShirtId').value = ''; return; }
            matches.forEach(s => {
                const el = document.createElement('div');
                el.className = 'px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer flex items-center justify-between';
                const details = document.createElement('div');
                const name = document.createElement('div');
                name.className = 'font-bold';
                name.textContent = s.name || '';
                const metadata = document.createElement('div');
                metadata.className = 'text-[11px] text-gray-500';
                metadata.textContent = `${s.color || ''} • ${s.size || ''} • ${s.qty} pcs`;
                details.append(name, metadata);
                const price = document.createElement('div');
                price.className = 'text-xs font-mono text-amber-500';
                price.textContent = formatCurrency(s.price);
                el.append(details, price);
                el.onclick = () => {
                    document.getElementById('mineItemDetails').value = `${s.name} (${s.color}, ${s.size})`;
                    document.getElementById('mineShirtId').value = s.id;
                    document.getElementById('minePrice').value = s.price;
                    document.getElementById('mineTotal').value = s.price;
                    updateMinePaymentStatusFromAmounts();
                    document.getElementById('mineSKU').value = generateSmartSKU(s.name, s.color, s.size);
                    suggestions.classList.add('hidden');
                };
                suggestions.appendChild(el);
            });
            suggestions.classList.remove('hidden');
        }

        function quickMineSaveFromModal(formData) {
            // decrement stock if linked to shirt
            const shirtId = document.getElementById('mineShirtId').value;
            if (shirtId) {
                const shirt = db.shirts.find(x => x.id === shirtId);
                if (shirt) {
                    if (shirt.qty > 0) {
                        shirt.qty -= 1;
                        shirt.soldCount = (shirt.soldCount || 0) + 1;
                    } else {
                        showToast('Cannot mine: selected shirt is out of stock', true);
                        return false;
                    }
                }
            }
            return true;
        }

        function setChartFilter(filter) {
            currentChartFilter = filter;
            ['1D', '1W', '1M', '1Y'].forEach(f => {
                const btn = document.getElementById('chart-btn-' + f);
                if (btn) {
                    if (f === filter) {
                        btn.className = "chart-filter px-3 py-1.5 rounded-lg transition bg-amber-500 text-black shadow-sm font-bold";
                    } else {
                        btn.className = "chart-filter px-3 py-1.5 rounded-lg transition text-gray-600 dark:text-gray-400 font-medium";
                    }
                    btn.setAttribute('aria-pressed', String(f === filter));
                }
            });
            initOrUpdateChart();
        }

        function initOrUpdateChart() {
            const canvas = document.getElementById('salesChartCanvas');
            const emptyState = document.getElementById('chartEmptyState');
            const emptyMessage = document.getElementById('chartEmptyMessage');
            if (!canvas || !emptyState || !emptyMessage) return;

            const now = new Date();
            const dateKey = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            const records = (Array.isArray(db.mines) ? db.mines : []).filter(mine => isReportableMine(mine) && !Number.isNaN(new Date(`${mine.date}T12:00:00`).getTime()));
            const todayKey = dateKey(now);
            let labels = [];
            let grossValues = [];
            let collectedValues = [];
            let rangeRecords = [];
            const grossByBucket = new Map();
            const collectedByBucket = new Map();
            const recordPayment = (mine, key) => {
                const orderValue = Math.max(0, Number(mine.total ?? mine.price ?? 0) || 0);
                const downpayment = Math.min(orderValue, Math.max(0, Number(mine.dp || 0)));
                const collected = getMinePaymentStatus(mine) === 'PAID' ? orderValue : downpayment;
                grossByBucket.set(key, (grossByBucket.get(key) || 0) + orderValue);
                collectedByBucket.set(key, (collectedByBucket.get(key) || 0) + collected);
            };

            if (currentChartFilter === '1D') {
                rangeRecords = records.filter(record => record.date === todayKey);
                if (rangeRecords.length) {
                    const sessions = new Map((db.liveSessions || []).map(session => [session.id, session.name || 'Live session']));
                    rangeRecords.forEach(mine => {
                        const key = mine.sessionId || '__other__';
                        recordPayment(mine, key);
                    });
                    const keys = [...grossByBucket.keys()];
                    labels = keys.map(key => sessions.get(key) || 'Other orders');
                    grossValues = keys.map(key => grossByBucket.get(key) || 0);
                    collectedValues = keys.map(key => collectedByBucket.get(key) || 0);
                }
            } else {
                if (currentChartFilter === '1Y') {
                    const months = Array.from({ length: 12 }, (_, index) => new Date(now.getFullYear(), now.getMonth() - 11 + index, 1));
                    const firstMonth = `${months[0].getFullYear()}-${String(months[0].getMonth() + 1).padStart(2, '0')}`;
                    rangeRecords = records.filter(mine => mine.date.slice(0, 7) >= firstMonth && mine.date.slice(0, 7) <= todayKey.slice(0, 7));
                    rangeRecords.forEach(mine => recordPayment(mine, mine.date.slice(0, 7)));
                    labels = months.map(month => month.toLocaleDateString(undefined, { month: 'short' }));
                    grossValues = months.map(month => grossByBucket.get(`${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`) || 0);
                    collectedValues = months.map(month => collectedByBucket.get(`${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`) || 0);
                } else {
                    const days = currentChartFilter === '1W' ? 7 : 30;
                    const dates = Array.from({ length: days }, (_, index) => new Date(now.getFullYear(), now.getMonth(), now.getDate() - days + 1 + index));
                    const startKey = dateKey(dates[0]);
                    rangeRecords = records.filter(mine => mine.date >= startKey && mine.date <= todayKey);
                    rangeRecords.forEach(mine => recordPayment(mine, mine.date));
                    labels = dates.map(date => date.toLocaleDateString(undefined, currentChartFilter === '1W' ? { weekday: 'short' } : { month: 'short', day: 'numeric' }));
                    grossValues = dates.map(date => grossByBucket.get(dateKey(date)) || 0);
                    collectedValues = dates.map(date => collectedByBucket.get(dateKey(date)) || 0);
                }
            }

            if (salesChartInstance) {
                salesChartInstance.destroy();
                salesChartInstance = null;
            }

            if (!rangeRecords.length || !grossValues.some(value => value > 0)) {
                canvas.classList.add('hidden');
                emptyMessage.textContent = 'No data for this period yet.';
                emptyState.classList.remove('hidden');
                emptyState.classList.add('flex');
                return;
            }
            if (typeof Chart === 'undefined') {
                canvas.classList.add('hidden');
                emptyMessage.textContent = 'The chart library is unavailable. Reconnect to load the chart.';
                emptyState.classList.remove('hidden');
                emptyState.classList.add('flex');
                return;
            }

            canvas.classList.remove('hidden');
            emptyState.classList.add('hidden');
            emptyState.classList.remove('flex');
            const ctx = canvas.getContext('2d');

            const isDark = document.documentElement.classList.contains('dark');

            salesChartInstance = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Gross order value',
                            data: grossValues,
                            backgroundColor: '#d4d4d8',
                            hoverBackgroundColor: '#a1a1aa',
                            borderRadius: 6,
                            maxBarThickness: 38,
                            categoryPercentage: 0.68,
                            barPercentage: 0.88
                        },
                        {
                            label: 'Cash collected',
                            data: collectedValues,
                            backgroundColor: '#737373',
                            hoverBackgroundColor: '#52525b',
                            borderRadius: 6,
                            maxBarThickness: 38,
                            categoryPercentage: 0.68,
                            barPercentage: 0.88
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top',
                            align: 'end',
                            labels: {
                                color: isDark ? '#a1a1aa' : '#71717a',
                                usePointStyle: true,
                                pointStyle: 'rectRounded',
                                boxWidth: 9,
                                boxHeight: 9,
                                padding: 16,
                                font: { size: 11, weight: '500' }
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: context => `${context.dataset.label}: ${formatCurrency(context.parsed.y)}`
                            }
                        }
                    },
                    scales: {
                        x: {
                            grid: { display: false },
                            ticks: { color: isDark ? '#a1a1aa' : '#71717a', font: { size: 11 } }
                        },
                        y: {
                            beginAtZero: true,
                            grid: { color: isDark ? '#27272a' : '#f4f4f5' },
                            ticks: {
                                color: isDark ? '#a1a1aa' : '#71717a',
                                font: { size: 11 },
                                callback: value => `₱${Number(value).toLocaleString()}`
                            }
                        }
                    }
                }
            });
        }

        async function initApp() {
            initTheme();
            startHeaderClock();
            initSidebar();
            initializeOfflineViewMode();
            passwordRecoveryPending = /(?:^|[&#])type=recovery(?:&|$)/i.test(window.location.hash);
            let storedSnapshot;
            try {
                updateLocalSaveStatus('checking', 'Reading local workspace data');
                storedSnapshot = await readPersistedWorkspaceSnapshot();
            } catch (error) {
                console.error('Saved workspace data could not be loaded safely.', error);
                showLocalSessionScreen('signin', `Saved data needs attention: ${error.message || 'could not load safely'}. Restore a known-good backup before continuing.`);
                registerOfflineAppShell();
                return;
            }
            try {
                updateLocalSaveStatus('checking', 'Unlocking local workspace');
                if (!await initializeLocalWorkspace(storedSnapshot)) return;
            } catch (error) {
                console.error('Protected local workspace could not be initialized.', error);
                updateLocalSaveStatus('error', error.message || 'Protected local workspace could not be initialized');
                showLocalSessionScreen('signin', `Saved data needs attention: ${error.message || 'protected records could not be opened safely'}.`);
                registerOfflineAppShell();
                return;
            }
            try {
                db = normalizeWorkspaceSnapshot(db);
            } catch (error) {
                console.error('Saved workspace collections could not be initialized safely.', error);
                updateLocalSaveStatus('error', error.message || 'Saved workspace data is invalid');
                showLocalSessionScreen('signin', error.message || 'Saved workspace data is invalid. Restore a known-good backup before continuing.');
                registerOfflineAppShell();
                return;
            }
            await loadFromLocalStorage();
            initializeLiveSessionState();
            seedProductsFromShirts();
            updateLocalSaveStatus('checking', 'Verifying encrypted local save');
            if (!await persistDB()) {
                showLocalSessionScreen('signin', 'Encrypted local storage failed. Do not record orders until this device can save successfully.');
                updateLocalSaveStatus('error', 'Encrypted local storage failed');
                registerOfflineAppShell();
                return;
            }
            lastSavedWorkspaceSnapshot = JSON.parse(JSON.stringify(db));
            localWorkspaceReady = true;
            refreshAllUI();
            migrateLegacyLocalBackups().catch(error => {
                console.error('Legacy local backup encryption failed.', error);
                showToast('An older local backup could not be protected. Do not restore it until reviewed.', true);
            });

            let cachedOfflineUser = null;
            try {
                if (localStorage.getItem('cm_pos_offline_session_allowed_v1') === 'true') {
                    cachedOfflineUser = JSON.parse(localStorage.getItem('cm_pos_offline_authorized_user_v1') || 'null');
                }
            } catch (error) {
                console.error('Could not restore the authorized offline session.', error);
            }

            if (navigator.onLine) {
                try {
                    const client = await getSupabaseClient();
                    const { data, error } = await client.auth.getSession();
                    if (error) throw error;
                    currentAuthUser = data.session?.user || null;
                } catch (error) {
                    console.warn('Supabase session could not be checked during startup.', error);
                }
            } else {
                try {
                    if (localStorage.getItem('cm_pos_offline_session_allowed_v1') === 'true') {
                        cachedOfflineUser = JSON.parse(localStorage.getItem('cm_pos_offline_authorized_user_v1') || 'null');
                    }
                } catch (error) {
                    console.error('Could not restore the authorized offline session.', error);
                }
            }

            if (passwordRecoveryPending) {
                showLocalSessionScreen('reset-password');
                updateCloudSyncStatus('signedOut');
                registerOfflineAppShell();
                return;
            }

            if (currentAuthUser && navigator.onLine) {
                try {
                    const client = await getSupabaseClient();
                    await ensureCloudWorkspaceMembership(client);
                } catch (error) {
                    console.error('The signed-in account is not authorized for this workspace.', error);
                    currentAuthUser = null;
                    try { await (await getSupabaseClient()).auth.signOut(); } catch (signOutError) { console.error('Could not clear the unauthorized session.', signOutError); }
                    updateCloudSyncStatus('signedOut');
                    showLocalSessionScreen('signin', friendlySignInError(error));
                    registerOfflineAppShell();
                    return;
                }
            }

            if (!currentAuthUser && !navigator.onLine && cachedOfflineUser?.id) currentAuthUser = cachedOfflineUser;
            if (currentAuthUser) {
                const allowOffline = localStorage.getItem('cm_pos_offline_session_allowed_v1') === 'true';
                finishLocalSignIn(currentAuthUser.email || '', allowOffline || !navigator.onLine);
                if (navigator.onLine) await syncCloudWorkspace();
                else updateCloudSyncStatus('offline');
            } else {
                updateCloudSyncStatus('signedOut');
                showLocalSessionScreen('signin', navigator.onLine ? '' : 'This device has no saved authorized offline session. Connect to the internet and sign in first.');
            }

            window.addEventListener('online', () => {
                setOfflineViewMode(false);
                if (currentAuthUser) {
                    document.getElementById('adminAccountBadge').textContent = 'CLOUD';
                    syncCloudWorkspace();
                } else {
                    updateCloudSyncStatus('signedOut');
                }
            });
            window.addEventListener('offline', () => {
                setOfflineViewMode(true);
                if (currentAuthUser) {
                    document.getElementById('adminAccountBadge').textContent = 'OFFLINE';
                    updateCloudSyncStatus('offline');
                }
            });
            window.addEventListener('focus', () => {
                if (currentAuthUser && navigator.onLine) syncCloudWorkspace();
            });
            document.addEventListener('visibilitychange', () => {
                if (!document.hidden && currentAuthUser && navigator.onLine) syncCloudWorkspace();
            });
            window.setInterval(() => {
                if (!document.hidden && currentAuthUser && navigator.onLine) syncCloudWorkspace();
            }, 15000);
            registerOfflineAppShell();
        }

        window.startClothesManiaPos = initApp;
