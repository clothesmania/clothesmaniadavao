---
status: complete
date: 2026-10-16
---

# Summary

- Added an RLS-protected, lightweight `pos_workspace_sync_events` signal table and a trigger that updates it when the encrypted workspace changes.
- Added a Supabase Realtime listener filtered to the signed-in workspace. It receives only the owner ID and timestamp, then uses the existing authenticated Edge Function to fetch and apply the encrypted snapshot with conflict checks intact.
- Kept the existing 15-second polling and focus refresh as fallbacks.
- Documented the required migration and added regression coverage.

## Verification

- 14 focused standalone tests passed; 7 encryption/projection tests passed.
- `git diff --check` passed.
- The migration and frontend have not been applied/deployed to production; Realtime updates require both before they take effect.
