# Supabase setup

The root Next.js POS remains local-first. It stores the working copy encrypted in IndexedDB and synchronizes a server-encrypted shared workspace snapshot to `public.pos_workspaces`. Supabase Auth stores account credentials; the app never stores passwords locally. Up to five separate admin accounts can access the same workspace, and all admins have full edit access. The Supabase Edge Function can decrypt workspace snapshots; this is backend-managed encryption, not end-to-end encryption.

## Database migrations

Apply migrations in filename order to the Supabase project. The shared-admin integration requires `202610140004_shared_admin_workspaces.sql` after migrations `001`–`003`. Migration `202610160001_server_managed_workspace_encryption.sql` then rejects plaintext and old client-encrypted formats on new snapshot writes. Existing v1 passphrase-encrypted snapshots remain readable during migration and are replaced after an authorized admin enters the legacy passphrase once. Snapshot timestamps detect concurrent writes; clean devices refresh automatically, while dirty conflicting copies are preserved and require an admin to choose which snapshot to keep.

The encrypted snapshot remains the source of truth and recovery copy. Migration `202610160002_encrypted_workspace_records.sql` additionally maintains one encrypted row per mine order, inventory product, live session, host, ledger entry, audit event, and recoverable deleted record in `public.pos_workspace_records`. The payload remains AES-GCM encrypted; database table rows can be counted and managed by type, but customer and payment-reference fields are not readable as plaintext in the Supabase Table Editor. The legacy `sales_orders` and `payments` tables are not populated by this sync path.

Apply the record-projection migration after `202610160001_server_managed_workspace_encryption.sql`, then deploy the matching `workspace-sync` Edge Function and frontend. On the first authenticated read, the Edge Function projects the existing encrypted snapshot into the new table; subsequent saves update the snapshot and encrypted rows atomically. The optimistic timestamp check still rejects concurrent edits. Do not apply this migration by dropping or replacing existing workspace data.

Apply `202610160003_workspace_realtime.sql` after the record-projection migration to add the lightweight `pos_workspace_sync_events` table to Supabase's Realtime publication. A database trigger updates this signal row when a workspace changes. Signed-in clients receive only the workspace ID and update timestamp, then fetch the encrypted snapshot through `workspace-sync`; the Realtime event does not expose the snapshot. Row-level security limits events to authorized workspace members. The app retains focus refresh and 15-second polling as fallbacks if Realtime is unavailable.

## Server-managed encryption deployment

1. Generate a random 32-byte key and encode it as base64, for example with `openssl rand -base64 32`. Store it securely; losing or changing it without a rotation migration makes current server-encrypted snapshots and exported backups unreadable.
2. Add the value as the Supabase Edge Function secret `WORKSPACE_ENCRYPTION_KEY` (Dashboard → Edge Functions → Secrets, or `supabase secrets set WORKSPACE_ENCRYPTION_KEY=...`). Never put it in browser code, Vercel variables exposed to the browser, or Git.
3. Deploy `workspace-sync` from this repository with JWT verification enabled (`supabase functions deploy workspace-sync`). It uses the user's JWT and the public project key to call membership-checked RPCs; it does not use a service-role key.
4. Deploy the matching frontend and verify that an admin can sign in and sync successfully. Then apply `202610160001_server_managed_workspace_encryption.sql` to reject direct plaintext and client-encrypted writes.
5. Sign in online and confirm `Cloud: synced`. For a legacy v1 workspace, enter the old passphrase when prompted once to migrate it. Newly provisioned devices do not need a workspace passphrase.

Each browser device keeps a non-extractable encryption key in IndexedDB and stores the local snapshot encrypted. That key is device-specific; browser storage clearing or device loss can prevent offline recovery, so keep a separate secure cloud backup. Server-side encrypted snapshots and exported JSON backups are decryptable only by this project's Edge Function key. Supabase operators with access to that function/key can read data. Document and test your key-backup and restore procedure before using production records.

## Admin accounts and sign-in

- The first existing admin account becomes the workspace owner. Sign in online in the POS after applying the migration; if no cloud snapshot exists yet, the app initializes it from that device's current local records.
- The owner or another admin opens the account menu → **Manage admins**, enters the invited admin's email, and creates a one-time invitation code. Share the code securely. It expires after 24 hours and reserves one of five seats.
- The invited admin chooses **Create an account**, enters the matching email and invitation code, then confirms their email if Supabase requests it. After sign-in, their account joins the same workspace.
- Use each admin's own account on each device. Select the offline authorization option to reopen that device's saved workspace without internet. Offline changes queue locally; other devices see them after reconnect and sync.
- If a new device contains different local data, choose **Restore cloud copy** to load the shared store. The existing device data is saved locally before replacement.

## Password recovery email

The sign-in screen's **Forgot password?** action uses Supabase Auth email recovery. Configure a custom SMTP provider in Supabase **Authentication → SMTP Settings** for reliable delivery beyond the built-in email quota. Add the production Vercel URL to **Authentication → URL Configuration → Redirect URLs** so recovery links return to the app.

Only the Supabase project URL and public publishable key belong in browser code. Never expose SMTP credentials or a service-role/secret key.
