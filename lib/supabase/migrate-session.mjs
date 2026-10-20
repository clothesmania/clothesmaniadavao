export const legacySessionKey = 'cm-pos-supabase-auth-v1'

export async function migrateLegacySession(client, storage = window.localStorage) {
  const saved = storage.getItem(legacySessionKey)
  if (!saved) return
  let legacy
  try { legacy = JSON.parse(saved) } catch {
    throw new Error('The saved sign-in session could not be read. Sign in again; your local records are preserved.')
  }
  if (!legacy.access_token || !legacy.refresh_token) return
  const { data, error } = await client.auth.getSession()
  if (error) throw error
  if (data.session && data.session.user.id !== legacy.user?.id) {
    throw new Error('Two different admin sessions were found. Sign out and sign in to the intended account before syncing.')
  }
  if (!data.session) {
    const migrated = await client.auth.setSession({ access_token: legacy.access_token, refresh_token: legacy.refresh_token })
    if (migrated.error) throw migrated.error
    if (!migrated.data.session) throw new Error('The previous sign-in could not be restored. Sign in again.')
  }
  // Never discard the old session until the new cookie session is established.
  if (storage.getItem(legacySessionKey) === saved) storage.removeItem(legacySessionKey)
}
