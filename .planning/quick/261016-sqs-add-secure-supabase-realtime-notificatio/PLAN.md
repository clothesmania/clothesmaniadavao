# Quick Task Plan

## Objective

Make shared workspace changes, including live-session start/end, appear promptly on other signed-in devices without waiting for the 15-second poll.

## Tasks

1. Add an idempotent migration to enable authenticated Supabase Realtime changes for `pos_workspaces`.
2. Subscribe the signed-in browser to updates for its authorized workspace owner and immediately run the existing conflict-aware sync when a remote change arrives.
3. Retain periodic polling, focus refresh, RLS, and optimistic conflict handling as safety fallbacks.
4. Document the migration/deployment requirement and add static regression coverage.

## Constraints

- Never send workspace data over Realtime; receive only update notifications and fetch content through the authenticated encrypted Edge Function.
- Do not weaken RLS or bypass the existing conflict flow.
- Do not apply migrations or deploy to production as part of local implementation.
