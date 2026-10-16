---
status: complete
date: 2026-10-16
---

# Summary

- Replaced the misleading “Local report data” badge with “Workspace report data” and clarified that the header's Cloud status confirms sync.
- Removed the month calendar's 840px minimum width and added compact mobile calendar cells.
- Clarified in the sign-in view that sign-in and changes require internet; successful updates sync automatically to the encrypted shared database.
- Verified report ledger and session edits use `saveToLocalStorage()`, which persists locally and queues the authenticated cloud sync.
- Added a regression test for the report label, responsive calendar, and autosave path.

## Verification

- 13 focused standalone tests passed; 7 crypto/projection tests passed; 16 client tests passed.
- `git diff --check` passed.
- The complete standalone suite's local HTTP test could not fetch its loopback server in this environment.
- The client Vite build was blocked by a sandbox `EPERM` resolving `client/index.html`; the React client is separate from the edited standalone page.
