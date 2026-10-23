# Clothes Mania Davao POS

The complete POS runs as a **Next.js App Router** application from the repository root. Next.js handles the page, routing, local assets, build, and Vercel hosting. The existing business runtime is retained in `public/pos-runtime.js` to preserve all screens and data behavior during this conversion; it mounts once after hydration. It has not yet been rewritten into individual React screen components.

## Run locally

Use Node.js 22 and run from the repository root:

```bash
npm ci
```

Copy `.env.example` to `.env.local` and supply the public project settings:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
```

```bash
npm run dev
```

Open [http://127.0.0.1:8000/index.html](http://127.0.0.1:8000/index.html). `/` serves the same POS. Keep using the same origin and browser profile to access existing local records and the device encryption key. The root `.env.local` is already configured locally for the supplied project and is ignored by Git. Restart after changing it.

Supabase, Dexie, Chart.js, Inter, and Font Awesome are bundled locally. Core app assets no longer require a CDN. `client/` is the archived Vite alternate implementation and is not the active application or deployment root.

## Supabase and data preservation

The browser client uses `@supabase/ssr` and the public environment variables. Existing localStorage sign-in tokens transfer to its cookie session only after successful restoration. A conflicting account or failed restoration preserves the previous token. The IndexedDB database, workspace keys, encrypted snapshots, and offline authorization identifiers remain unchanged.

The browser calls the existing authenticated `workspace-sync` Edge Function and listens to its RLS-protected Realtime signal. Products, orders, payments, reports, cancellations, deleted records, and encryption continue through the existing workspace flow. This conversion does not apply SQL migrations, deploy Edge Functions, or replace cloud records. See [Supabase setup](supabase/README.md) for backend provisioning and key recovery.

Only the URL and publishable key belong in `NEXT_PUBLIC_` settings. Keep `WORKSPACE_ENCRYPTION_KEY` in Supabase Edge Function secrets; never include service-role keys or encryption secrets in frontend variables.

Existing offline behavior is retained: a previously authorized device can reopen saved records offline, and editing/sign-in require internet. Production builds cache the public shell, scripts, fonts, icons, and images after the first online load. Authenticated API responses and Supabase traffic are never cached. Development unregisters the old app worker and clears only application-shell caches, preserving IndexedDB records and keys.

## Product choices

In **Products & Inventory**, use **Manage categories** or **Manage sizes / variants** below the filters to add, rename, or delete choices. Renaming updates current product assignments; deletion is blocked until every product using that choice has been reassigned. Historical sales remain unchanged. The product form uses the same categories and offers saved size suggestions; typing a new size also saves it as a choice.

Choice lists are additive `productOptions.categories` and `productOptions.sizes` arrays in the workspace snapshot. Existing inventory seeds these lists on first use. Unused choices persist through encrypted local storage, cloud snapshots, and encrypted backups; no Supabase table migration is needed. Restoring a product also restores any choices needed for its assignments. Choice edits follow the existing online editing requirement and activity log.

## Verify a production build

```bash
npm test
npm run build
npm start
```

Tests cover encryption, existing POS behavior, session transfer, startup ordering, account isolation, receipt print layout, and offline worker behavior. The build generates Next.js output and its versioned offline shell. `npm start` serves that build at the same local origin; stop the dev server first.

With the production server running, `npm run check:build` verifies both POS routes, every generated offline asset, worker update headers, and private-file protection.

Sign in with an existing admin account and confirm **Cloud: synced** to validate authenticated access, backend encryption configuration, and shared workspace synchronization. Public endpoint reachability alone does not prove authenticated sync.

## Vercel

Use the existing repository connection with these settings:

| Setting | Value |
| --- | --- |
| Root Directory | repository root (`.`), not `client/` |
| Framework Preset | Next.js |
| Build Command | `npm run build` |
| Install Command | `npm ci` |
| Output Directory | framework default; remove any old `dist` override |
| Environment | set both `NEXT_PUBLIC_SUPABASE_*` values for Production and Preview as needed |

`vercel.json` sets the framework and build/install commands. Public environment values are embedded at build time, so redeploy after changing them. In Supabase Authentication → URL Configuration, keep the production URL and add `http://127.0.0.1:8000/**` and authorized Vercel callback URLs to Redirect URLs for password recovery and email confirmation. Use specific preview origins where possible.

The Next.js app was deployed to [clothesmaniadavao.vercel.app](https://clothesmaniadavao.vercel.app) on October 21, 2026. Vercel uses the repository root, Next.js defaults, Node.js 22, and the production Supabase variables. The live app restored the existing admin session and showed **Cloud: synced**; both routes and all 114 production offline assets passed HTTP checks. No sales/payment test records were submitted. Continue validating transaction flows, conflict handling, password recovery, and offline reload when making changes. Browser storage is origin-specific; a different Vercel domain must recover the authorized workspace from its cloud copy.

## Source layout

- `app/`: Next.js page, layout, styles, and startup component.
- `src/pos/shell.html`: complete POS markup; static application code only.
- `public/pos-runtime.js`: business actions and encrypted local/cloud synchronization.
- `lib/supabase/`: browser/server client helpers and legacy session transfer.
- `scripts/`: local asset bundling and offline-shell generation.
- `workspace-crypto.js`, `report-io.js`, `images/`: retained source assets copied into `public/` during preparation.
- `supabase/`: migrations and authenticated encryption Edge Function.
