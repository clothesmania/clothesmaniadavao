'use client'

import { createBrowserClient } from '@supabase/ssr'

export function createClient(url, key, options = {}) {
  return createBrowserClient(url, key, {
    ...options,
    cookieOptions: { name: 'cm-pos-supabase-auth-v1' }
  })
}
