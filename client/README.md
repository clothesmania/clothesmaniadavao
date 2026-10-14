# Clothes Mania Davao POS — Production Client

The client is the production Vite/React path for Products, Inventory, POS/Orders, Collections, and Audit Logs. The root `index.html` remains the reviewed prototype and uses its legacy browser database; the clients have separate storage schemas.

## Run locally

1. Run `npm install` in this directory.
2. Copy `.env.example` to `.env.local` and enter the Supabase project URL and publishable key.
3. Apply both SQL migrations in timestamp order from `../supabase/migrations/`.
4. Run `npm run dev` and open the URL Vite prints.

Without Supabase configuration, the app runs in clearly labeled local-preview mode. With configuration, sign in online once; that browser profile is bound to the signed-in account, and its cached app shell and IndexedDB workspace remain usable offline after the first successful load. Local sales, collections, cancellations, refunds, and stock changes enter a durable outbox and sync when online. For prototype data on another browser origin, export a JSON backup in the old app, select that file in the new client, review its counts, download a safety copy, and explicitly confirm migration; seeded prototype records remain marked as samples.

Only the Supabase publishable key belongs in browser configuration. Never put a secret or service-role key in `.env.local`, Vercel client variables, or browser code. Database access is restricted by Auth and row-level security.

## Validate

- `npm test` runs offline auth, account binding, local transaction, stock, order, payment, cancellation/refund, and legacy migration tests.
- `npm run build` creates the Vercel-ready static build in `dist/`.

Vercel should use `client/` as its project root and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in the project environment. Production deployment is intentionally deferred until the Supabase project is provisioned, both migrations and RLS are verified remotely, an authenticated sync/restore test passes, and offline reload behavior is tested on the deployment origin. Legacy daily sheets and deleted-record snapshots remain in the archived source snapshot; they are not yet normalized into production reports or a restore interface.
