import Dexie from 'dexie'
import Chart from 'chart.js/auto'
import { createClient } from '../../lib/supabase/client.js'
import { migrateLegacySession } from '../../lib/supabase/migrate-session.mjs'

window.Dexie = Dexie
window.Chart = Chart
window.ClothesManiaDependencies = {
  createClient,
  migrateLegacySession,
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
}
