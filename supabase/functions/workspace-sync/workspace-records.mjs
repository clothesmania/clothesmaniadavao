import { encryptWorkspaceSnapshot } from './workspace-crypto.mjs';

const workspaceCollections = [
    { recordType: 'mine_order', snapshotKey: 'mines' },
    { recordType: 'product', snapshotKey: 'shirts', fallbackKey: 'products' },
    { recordType: 'live_session', snapshotKey: 'liveSessions' },
    { recordType: 'host', snapshotKey: 'hosts' },
    { recordType: 'daily_ledger', snapshotKey: 'dailyLedger' },
    { recordType: 'audit_log', snapshotKey: 'auditLogs' },
    { recordType: 'deleted_host', snapshotKey: 'deletedHosts' },
    { recordType: 'deleted_record', snapshotKey: 'deletedRecords' }
];

export function collectWorkspaceRecords(snapshot) {
    if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) {
        throw new Error('Workspace snapshot must be an object.');
    }

    return workspaceCollections.flatMap(({ recordType, snapshotKey, fallbackKey }) => {
        const collection = Array.isArray(snapshot[snapshotKey])
            ? snapshot[snapshotKey]
            : fallbackKey && Array.isArray(snapshot[fallbackKey])
                ? snapshot[fallbackKey]
                : [];
        const ids = new Set();

        return collection.map((record, index) => {
            if (!record || typeof record !== 'object' || Array.isArray(record)) {
                throw new Error(`Workspace ${snapshotKey} contains an invalid record.`);
            }
            const recordId = String(record.id || record.date || `row-${index + 1}`);
            if (ids.has(recordId)) throw new Error(`Workspace ${snapshotKey} contains duplicate record IDs.`);
            ids.add(recordId);
            return { recordType, recordId, record };
        });
    });
}

export async function encryptWorkspaceRecords(snapshot, encodedKey) {
    const records = collectWorkspaceRecords(snapshot);
    return Promise.all(records.map(async ({ recordType, recordId, record }) => ({
        recordType,
        recordId,
        payload: await encryptWorkspaceSnapshot({ recordType, recordId, record }, encodedKey)
    })));
}
