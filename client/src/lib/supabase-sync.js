import { createClient } from '@supabase/supabase-js'
import { bindLocalWorkspaceToUser, getPendingOutboxEvents, markSyncCompleted, updateOutboxEvent } from './local-db.js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })
  : null

export const isSupabaseConfigured = Boolean(supabase)

let isSyncing = false

export async function syncPendingChanges(onProgress = () => {}) {
  if (!supabase || !navigator.onLine || isSyncing) return { synced: 0, pending: 0 }
  const { data: sessionResult } = await supabase.auth.getSession()
  if (!sessionResult.session) return { synced: 0, pending: 0, needsSignIn: true }
  await bindLocalWorkspaceToUser(sessionResult.session.user)

  isSyncing = true
  let synced = 0
  try {
    const events = await getPendingOutboxEvents()
    for (const event of events) {
      await updateOutboxEvent(event.id, { status: 'syncing', lastError: null })
      onProgress({ current: synced, total: events.length, event })

      const { error } = await supabase.rpc('apply_inventory_event', { p_event: event })
      if (error) {
        await updateOutboxEvent(event.id, {
          status: 'failed',
          attempts: event.attempts + 1,
          lastError: error.message,
          failedAt: new Date().toISOString()
        })
        break
      }

      await updateOutboxEvent(event.id, {
        status: 'synced',
        attempts: event.attempts + 1,
        syncedAt: new Date().toISOString(),
        lastError: null
      })
      synced += 1
    }

    if (synced) await markSyncCompleted(new Date().toISOString())
    const remaining = await getPendingOutboxEvents()
    return { synced, pending: remaining.length }
  } finally {
    isSyncing = false
  }
}
