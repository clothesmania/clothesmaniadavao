---
status: complete
date: 2026-10-21
source_commit: 08fceaece1704a4a5b67675a4dd51bb36f595a49
deployment_id: FbZTJYrUYv5Zmip94RwxXLdNatXv
production_url: https://clothesmaniadavao.vercel.app
---

# Next.js production deployment

Deployed the reviewed migration to the existing Vercel project `clothesmania-9562/clothesmaniadavao` and its existing production domain.

## Changes

- GitHub already contained migration commit `8e0d3b1` and documentation commit `08fceae`. The previous automatic deployment failed with `NEXT_NO_ROUTES_MANIFEST` because Vercel retained the old static output override `.`.
- Changed the framework preset from Other to Next.js, removed the old Build Command and Output Directory overrides, retained the repository root, and aligned the project Node.js setting with `22.x`.
- Added the supplied `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` as production Config variables. Existing Vite variables were retained for rollback compatibility.
- Redeployed source commit `08fceae` to Production using the latest project settings, without the old build cache. Vercel completed successfully in about 40 seconds and assigned `clothesmaniadavao.vercel.app`.

## Verification

- Vercel status: Ready. Deployment details: https://vercel.com/clothesmania-9562/clothesmaniadavao/FbZTJYrUYv5Zmip94RwxXLdNatXv
- Both `/` and `/index.html` return the Next.js POS shell.
- All 114 assets in the remote production offline manifest return HTTP 200. The remote manifest was used because Linux build hashes and asset counts differ from the local Windows build.
- The service worker has update-friendly cache headers. `.env.local`, `.git/config`, and source markup return HTTP 404.
- The deployed dependency bundle includes the supplied public Supabase configuration. Supabase Auth returns HTTP 200 and allows the production origin through CORS.
- Browser startup restored the existing authorized admin session and displayed **Cloud: synced**. No manual account credential entry, sales/payment test records, schema changes, or security-setting changes were made.
- Screenshot: `production-synced.png` captures the live app and successful cloud status without customer records.

The production deployment is complete. Broader transaction, conflict, password-recovery, and multi-device tests remain separate from this deployment check.
