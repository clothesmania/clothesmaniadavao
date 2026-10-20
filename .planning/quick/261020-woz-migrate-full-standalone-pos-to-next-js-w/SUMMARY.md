---
status: complete
date: 2026-10-20
implementation_commit: 8e0d3b1
---

# Next.js POS conversion

The repository root now runs the complete POS as a Next.js 16 App Router application with React 19 and Node.js 22. Next.js renders the public shell and owns routing, local assets, production builds, and Vercel configuration. Existing imperative business logic is preserved in `public/pos-runtime.js`; this is a framework/hosting conversion, not a rewrite of each screen into a React component.

## Delivered

- Extracted the full existing UI and styles into `src/pos/shell.html` and `app/pos.css`, with guarded once-only startup after hydration and an initialization overlay.
- Added official Supabase SSR browser/server helpers, root NEXT_PUBLIC environment variables, migration of existing localStorage sessions to cookies, and recovery from expired legacy tokens. The supplied project settings are in ignored root `.env.local`.
- Retained IndexedDB database name, all workspace/encryption identifiers, authorized offline reopening, membership-checked encrypted Edge Function sync, optimistic conflicts, Realtime signals, reports, and receipt printing.
- Bundled Supabase, Dexie, Chart.js, fonts, and icons locally. Added a versioned production service worker containing all generated Next.js/public assets; it excludes remote/Auth/API traffic. Development removes only obsolete app-shell caches and unregisters its worker.
- Preserved the existing local origin on port 8000 and `/index.html` via a rewrite to `/`.
- Added root Vercel configuration, reproducible npm lockfile, deployment instructions, and a production HTTP check command. Marked the separate Vite implementation as archived reference.

## Validation

- All 34 tests pass, including actual installed Supabase SSR SDK cookie persistence/restoration with a mocked Auth response, failed legacy transfer, conflicting identities, fresh sign-in recovery, startup ordering, encryption, existing business regressions, and worker caching boundaries.
- `npm run build` succeeds and creates 116 offline assets.
- `npm run check:build` passes against the production Next.js server: both routes, all assets, worker update headers, and 404 responses for `.env.local`, `.git/config`, and source markup.
- Browser inspection confirms the original sign-in UI works on the Next.js build. Stopped the local server and successfully reloaded the cached Next.js app, then restarted production on the original address.
- npm audit reports zero vulnerabilities after using the supported Tailwind 4 PostCSS integration.
- No database migrations, account changes, production data writes, pushes, or deployment were performed.

## External steps remaining

The Vercel project is not linked locally and no Vercel CLI/account access is available in this workspace. Set its Root Directory to the repository root, use the Next.js preset/default output, set both NEXT_PUBLIC_SUPABASE variables, and redeploy the committed code. Keep authorized Supabase callback URLs configured. Existing admin sign-in, authenticated encrypted sync, password recovery, and deployment-origin offline behavior still require account/deployment verification. Public Supabase Auth, CORS, and function availability were verified read-only; that does not establish authenticated workspace access.
