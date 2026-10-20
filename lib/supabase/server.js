import 'server-only'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// For future authenticated route handlers. The POS shell contains no server data.
export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookieOptions: { name: 'cm-pos-supabase-auth-v1' },
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: values => {
          for (const { name, value, options } of values) cookieStore.set(name, value, options)
        }
      }
    }
  )
}
