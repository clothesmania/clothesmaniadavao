# Quick Task Plan

## Objective

Clarify that reports use the signed-in shared workspace, keep the current encrypted Supabase autosync behavior visible, and make the month calendar fit narrow screens without forcing a fixed-width horizontal canvas.

## Tasks

1. Replace the misleading “Local report data” badge with a workspace-data label and explain that the global cloud status is authoritative for sync state.
2. Remove the calendar's fixed 840px minimum width and add compact narrow-screen cell styling while retaining the seven-column month layout.
3. Verify report ledger edits call the existing local persistence + debounced cloud-sync path, and run focused static checks/build if available.

## Constraints

- Do not alter encrypted snapshot or Supabase sync protocols.
- Preserve offline view-only behavior.
- Do not claim a report is synced unless the header's Cloud status says it is.
