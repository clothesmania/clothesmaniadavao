# Phase 7 Context: Shared Admin Workspace and Password Recovery

## Decisions

- One Clothes Mania store workspace is shared across a maximum of five admin accounts total, including the original owner.
- Each admin uses their own account. All five accounts have full access to view and edit inventory, live sessions, orders, payments, reports, and audit history.
- Admins may use the system from laptop and phone and may edit concurrently. When online copies conflict, preserve both and require an explicit choice; never silently overwrite.
- Each device remains local-first. Offline edits remain usable and sync when that device reconnects.
- Additional accounts join through email-bound, expiring invitations rather than unrestricted public signup.
- Password recovery uses a Supabase Auth email link that returns to the POS so the admin can set a new password.

## Operational Notes

- Supabase custom SMTP is required for reliable signup and password-reset delivery beyond the built-in email quota.
- Database migration 004 must be applied before deploying the updated app bundle.
- Existing business snapshots must be preserved during workspace initialization and conflict resolution.

## References

- `index.html`
- `supabase/migrations/202610140003_pos_workspace_snapshots.sql`
- `supabase/migrations/202610140004_shared_admin_workspaces.sql`
- `supabase/README.md`
