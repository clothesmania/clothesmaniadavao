# Clothes Mania Davao — Local Development

Run the standalone POS locally with Node.js (no extra package installation required):

```bash
node scripts/serve.mjs
```

Then open: http://127.0.0.1:8000/index.html

Notes:
- The deployed standalone app is `index.html`; `client/` is a separate React scaffold.
- The service worker caches the app shell and CDN assets after a successful online load. First-time setup still requires internet access for CDN-hosted libraries.
- Local snapshots use a per-device key stored in IndexedDB. Cloud snapshots and downloaded JSON backups use a key held by the Supabase Edge Function. Supabase can decrypt cloud data; keep the server key backed up securely. Existing passphrase-encrypted records require the legacy passphrase once to migrate. If local IndexedDB is cleared or its device key is lost, do not sign in from the damaged browser; recover the local records from a known-good device/backup first.
- The local server binds to `127.0.0.1` and only serves the app entry point, app scripts, and images.
- Run standalone smoke checks with `node --test tests/standalone.test.cjs`.
- Run client data-layer tests with `npm test` from `client/`.
- Deploy the Supabase encryption function, secret, and database migration as described in `supabase/README.md` before updating the production frontend.
