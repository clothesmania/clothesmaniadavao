# Supabase setup

The root `index.html` app remains local-first. It stores the working copy encrypted in IndexedDB and synchronizes a server-encrypted shared workspace snapshot to `public.pos_workspaces`. Supabase Auth stores account credentials; the app never stores passwords locally. Up to five separate admin accounts can access the same workspace, and all admins have full edit access. The Supabase Edge Function can decrypt workspace snapshots; this is backend-managed encryption, not end-to-end encryption.

## Database migrations

Apply migrations in filename order to the Supabase project. The shared-admin integration requires `202610140004_shared_admin_workspaces.sql` after migrations `001`–`003`. Migration `202610160001_server_managed_workspace_encryption.sql` then rejects plaintext and old client-encrypted formats on new snapshot writes. Existing v1 passphrase-encrypted snapshots remain readable during migration and are replaced after an authorized admin enters the legacy passphrase once. Snapshot timestamps detect concurrent writes; clean devices refresh automatically, while dirty conflicting copies are preserved and require an admin to choose which snapshot to keep.

The snapshot table stores POS data as JSONB. It does not populate the separate relational sales, order, or inventory tables from migrations `001` and `002`.

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
