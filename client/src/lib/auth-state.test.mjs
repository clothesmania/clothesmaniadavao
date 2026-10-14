import test from 'node:test'
import assert from 'node:assert/strict'
import { resolveLocalAuthState } from './auth-state.js'

test('an authenticated session works online and is marked offline when disconnected', () => {
  const user = { id: 'admin-id', email: 'admin@example.com' }
  assert.deepEqual(resolveLocalAuthState({ sessionUser: user, online: true }), { user, offline: false })
  assert.deepEqual(resolveLocalAuthState({ sessionUser: user, online: false }), { user, offline: true })
})

test('the previously authorized local user can reopen offline without a live session', () => {
  assert.deepEqual(resolveLocalAuthState({ cachedUser: { userId: 'admin-id', email: 'admin@example.com' }, online: false }), {
    user: { id: 'admin-id', email: 'admin@example.com' },
    offline: true
  })
})

test('offline access is denied until this device has completed an online sign-in', () => {
  assert.deepEqual(resolveLocalAuthState({ online: false }), { user: null, offline: true })
  assert.deepEqual(resolveLocalAuthState({ cachedUser: { userId: 'admin-id' }, online: true }), { user: null, offline: false })
})
