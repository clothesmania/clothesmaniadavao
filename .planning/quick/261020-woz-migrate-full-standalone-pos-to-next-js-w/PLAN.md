# Quick Task Plan

## Objective

Convert the complete active standalone POS to a root Next.js App Router application for Vercel, using the supplied root NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY configuration. Preserve all screens, encrypted IndexedDB records, account access, workspace synchronization, conflict protection, Realtime, reports, and receipts.

## Implementation

1. Extract the full POS shell, styles, and existing imperative business runtime into Next.js assets; mount once after hydration, retain global handlers required by the screens, and remove the competing root HTML entry point.
2. Bundle Supabase, Dexie, Chart.js, fonts, and icons locally. Use Supabase's Next.js browser client with cookie sessions and migrate the existing localStorage session when present. Retain all local database/encryption identifiers and existing membership-checked Edge Function sync.
3. Configure root Next.js npm scripts, public environment examples, a static public POS shell, the legacy /index.html path, Vercel, and a production service worker caching the generated app assets. Do not cache Supabase traffic or personal server responses.
4. Adapt regression tests to the canonical migrated runtime, test mounting/session migration/offline caching, run tests and a production build, then verify the app in a browser on its existing local origin.

## Scope and limits

- Keep the existing imperative business logic during this framework conversion so business behavior and storage are preserved; Next.js owns routing, rendering, assets, build, and hosting.
- No database replacement, migrations, production deployment, account changes, or business-record writes.
- Existing client/ is an archived alternate implementation and is not the Vercel project root.
- Vercel remote project settings and an authenticated end-to-end sync test require the connected deployment/account; prepare reviewable local configuration and document remaining external steps.

## Workflow

Execute inline under the GSD quick skill's spawn restriction. Supersedes the earlier local connection-tooling task at the user's request.
