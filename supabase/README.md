# Supabase setup

The root `index.html` app remains local-first. It stores the working copy in IndexedDB and synchronizes a shared workspace snapshot to `public.pos_workspaces`. Supabase Auth stores account credentials; the app never stores passwords locally. Up to five separate admin accounts can access the same workspace, and all admins have full edit access.

## Database migrations

Apply migrations in filename order to the Supabase project. The shared-admin integration requires `202610140004_shared_admin_workspaces.sql` after migrations `001`–`003`. It backfills membership for existing cloud workspace owners, adds invitation-based membership capped at five seats (including pending invitations), and changes snapshot reads/writes to membership-checked RPCs. Snapshot timestamps detect concurrent writes; clean devices refresh automatically, while dirty conflicting copies are preserved and require an admin to choose which snapshot to keep.

The snapshot table stores POS data as JSONB. It does not populate the separate relational sales, order, or inventory tables from migrations `001` and `002`.

## Admin accounts and sign-in

- The first existing admin account becomes the workspace owner. Sign in online in the POS after applying the migration; if no cloud snapshot exists yet, the app initializes it from that device's current local records.
- The owner or another admin opens the account menu → **Manage admins**, enters the invited admin's email, and creates a one-time invitation code. Share the code securely. It expires after 24 hours and reserves one of five seats.
- The invited admin chooses **Create an account**, enters the matching email and invitation code, then confirms their email if Supabase requests it. After sign-in, their account joins the same workspace.
- Use each admin's own account on each device. Select the offline authorization option to reopen that device's saved workspace without internet. Offline changes queue locally; other devices see them after reconnect and sync.
- If a new device contains different local data, choose **Restore cloud copy** to load the shared store. The existing device data is saved locally before replacement.

## Password recovery email

The sign-in screen's **Forgot password?** action uses Supabase Auth email recovery. Configure a custom SMTP provider in Supabase **Authentication → SMTP Settings** for reliable delivery beyond the built-in email quota. Add the production Vercel URL to **Authentication → URL Configuration → Redirect URLs** so recovery links return to the app.

Only the Supabase project URL and public publishable key belong in browser code. Never expose SMTP credentials or a service-role/secret key.
