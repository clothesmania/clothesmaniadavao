import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { decryptWorkspaceSnapshot, encryptWorkspaceSnapshot } from './workspace-crypto.mjs';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

function jsonResponse(status: number, body: Record<string, unknown>) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
}

Deno.serve(async request => {
    if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
    if (request.method !== 'POST') return jsonResponse(405, { error: 'Method not allowed.' });

    const authorization = request.headers.get('Authorization');
    const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!token) return jsonResponse(401, { error: 'Sign in to access the workspace.' });

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const publishableKey = Deno.env.get('SUPABASE_ANON_KEY');
    const encryptionKey = Deno.env.get('WORKSPACE_ENCRYPTION_KEY');
    if (!supabaseUrl || !publishableKey || !encryptionKey) {
        return jsonResponse(503, { error: 'Workspace sync is not configured on the server.' });
    }

    const client = createClient(supabaseUrl, publishableKey, {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { persistSession: false, autoRefreshToken: false }
    });

    try {
        const { data: userData, error: authError } = await client.auth.getUser(token);
        if (authError || !userData.user) return jsonResponse(401, { error: 'Your sign-in session is invalid or expired.' });

        const body = await request.json();
        if (body.action === 'ensure') {
            const snapshot = body.snapshot;
            if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) throw new Error('Workspace snapshot must be an object.');
            const encrypted = await encryptWorkspaceSnapshot(snapshot, encryptionKey);
            const { data, error } = await client.rpc('ensure_pos_workspace', { p_initial_snapshot: encrypted });
            if (error) throw error;
            return jsonResponse(200, { workspaceOwnerId: data });
        }

        if (body.action === 'get') {
            const { data, error } = await client.rpc('get_pos_workspace_snapshot');
            if (error) throw error;
            const row = Array.isArray(data) ? data[0] : data;
            if (!row) return jsonResponse(200, { remote: null });
            if (row.snapshot?.format === 'clothes-mania-server-encrypted') {
                return jsonResponse(200, {
                    remote: {
                        workspace_owner_id: row.workspace_owner_id,
                        snapshot: await decryptWorkspaceSnapshot(row.snapshot, encryptionKey),
                        updated_at: row.updated_at
                    }
                });
            }
            return jsonResponse(200, {
                remote: {
                    workspace_owner_id: row.workspace_owner_id,
                    legacySnapshot: row.snapshot,
                    updated_at: row.updated_at
                }
            });
        }

        if (body.action === 'save') {
            const snapshot = body.snapshot;
            if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) throw new Error('Workspace snapshot must be an object.');
            const encrypted = await encryptWorkspaceSnapshot(snapshot, encryptionKey);
            const { data, error } = await client.rpc('save_pos_workspace_snapshot', {
                p_snapshot: encrypted,
                p_expected_updated_at: body.expectedUpdatedAt ?? null
            });
            if (error) throw error;
            return jsonResponse(200, { updatedAt: data });
        }

        if (body.action === 'export') {
            const snapshot = body.snapshot;
            if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) throw new Error('Workspace snapshot must be an object.');
            return jsonResponse(200, { snapshot: await encryptWorkspaceSnapshot(snapshot, encryptionKey) });
        }

        return jsonResponse(400, { error: 'Unsupported workspace sync action.' });
    } catch (error) {
        console.error('Workspace sync request failed.', error);
        const message = error instanceof Error ? error.message : 'Workspace sync failed.';
        const code = (error as { code?: string }).code || null;
        const status = code === '40001' || /changed|conflict/i.test(message) ? 409 : 400;
        return jsonResponse(status, { error: message, code });
    }
});
