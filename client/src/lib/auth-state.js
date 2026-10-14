export function resolveLocalAuthState({ sessionUser = null, cachedUser = null, online = true }) {
  if (sessionUser) return { user: sessionUser, offline: !online }
  if (!online && cachedUser?.userId) {
    return { user: { id: cachedUser.userId, email: cachedUser.email || '' }, offline: true }
  }
  return { user: null, offline: !online }
}
