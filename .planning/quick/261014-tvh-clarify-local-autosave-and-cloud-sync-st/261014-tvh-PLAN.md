---
quick_id: 261014-tvh
slug: clarify-local-autosave-and-cloud-sync-st
status: complete
created: 2026-10-14
---

# Local save and cloud sync indicators

## Objective

Make it clear that POS changes save on this device first and automatically sync to Supabase when online and authenticated.

## Completed

- Kept the existing debounce-based automatic sync queue on every local POS save and on reconnect/startup.
- Added separate local-save and cloud-sync icons/statuses to the header, including compact icon-only treatment on narrow screens.
- Show local saving, device-saved, browser-storage fallback, and local failure states independently from cloud syncing, offline-queued, synced, sign-in-required, conflict, and error states.

## Verification

- Root inline JavaScript and `sw.js` pass `node --check`.
- `git diff --check` passes.
- Reloaded the root app and confirmed both device-save and cloud status indicators are present in the accessibility tree.
- No business records were added or changed for testing. End-to-end cloud upload still requires the user to sign into the POS with Supabase Auth.
