# Supabase setup

The root `index.html` app remains local-first. It stores the working copy in IndexedDB and, after Supabase email/password sign-in, synchronizes the complete workspace snapshot to `public.pos_workspaces` for the authenticated user. Supabase Auth stores account credentials; the app never stores passwords locally.

## Database migration

Apply migrations in filename order to the Supabase project. The current POS snapshot integration requires `202610140003_pos_workspace_snapshots.sql`. That migration enables row-level security, allows each authenticated user to read only their own snapshot, and limits writes to the owner-checked `save_pos_workspace_snapshot` RPC with an expected timestamp to detect stale copies.

The snapshot table stores the POS data as JSONB. It does not populate the separate relational sales, order, or inventory tables from migrations `001` and `002`.

## First sign-in and sync

- Create or use an account under Supabase Authentication with email and password.
- Open the root POS app online and sign in there. A Supabase dashboard session does not sign in to the POS app.
- On the first sign-in, the app uploads the device's current workspace if the cloud copy is empty. If a different cloud copy already exists, choose whether to keep the device copy or restore the cloud copy; both copies are backed up locally before replacement.
- Select the offline authorization checkbox to allow this browser profile to reopen its local workspace without internet. Offline writes queue locally and sync after connectivity returns.
- Device-only accounts from the old prototype are not Supabase accounts; create them in Supabase Auth before using them with this integration.

Only the Supabase project URL and public publishable key belong in browser code. Never expose a service-role or secret key.
