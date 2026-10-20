# Quick Task Plan

## Objective

Make the existing local POS easy to start and verify its connection to the supplied Supabase project. Inspection confirmed the deployed standalone app and separate Vite client already use the supplied URL and publishable key; the pasted Next.js registry block is incompatible with both entry points.

## Tasks

1. Verify the public Auth endpoint, sync function availability, and existing browser SDK download without writing business data.
2. Restore the missing root npm manifest with commands for the existing standalone server and a repeatable, read-only Supabase connectivity check.
3. Document the correct standalone and Vite setup, run existing checks, and start the standalone app on its established origin.

## Validation

- Run the connectivity check against Supabase Auth and the sync function's CORS preflight; distinguish reachability from authenticated sync.
- Run the existing standalone test suite and confirm the server serves the configured app while blocking repository files.
- Verify the local app loads. Account sign-in and authenticated sync require the user's existing account.

## Execution

Performed inline under the GSD quick skill's spawn restriction. No schema, records, or account settings are changed.
