---
last_mapped_commit: cfacc02aa0f9800754f6d573e59d04e5a8ba0cf7
last_mapped_at: 2026-10-10
---
# External Integrations

**Analysis Date:** 2026-10-10

## APIs & External Services

**CDN-hosted frontend assets (`index.html`):**
- Tailwind via `https://cdn.tailwindcss.com` supplies utility CSS at runtime.
- Chart.js via jsDelivr draws the dashboard chart.
- Dexie 3.2.2 via unpkg wraps IndexedDB.
- Google Fonts serves Inter and Outfit; cdnjs serves Font Awesome 6.4.0 icons.
- These are browser-side asset requests; no application API client or backend endpoint exists.

**Client package registry:**
- npm installs the packages declared in `client/package.json` for local Vite development/builds.

## Data Storage

**Databases:**
- Browser IndexedDB, database `ClothesManiaDB`, table `kv` with `&key` as its key path.
- Both frontends store the complete app snapshot under key `db`.
- The standalone page prefers IndexedDB and falls back to localStorage key `clothesManiaDavaoDB_v4`; the React client currently uses Dexie only.
- Storage is local to a browser profile and origin. There is no remote sync or central database.

**File Storage:**
- Static assets are local under `images/` and `client/public/`.
- JSON backup export is initiated in the browser by `exportJSONBackup()` in `index.html`.

**Caching:**
- No application cache or server cache detected.

## Authentication & Identity

**Auth Provider:**
- None. The standalone page notes that login was removed; the React scaffold initializes `loggedIn` to `true` and does not implement authentication.

## Monitoring & Observability

**Error Tracking:**
- No external error tracking detected.

**Logs:**
- Browser `console.error` is used for IndexedDB read/write failures in `index.html` and `client/src/App.jsx`.
- Some localStorage write failures are silently ignored.

## CI/CD & Deployment

**Hosting:**
- Not detected. No deployment manifest or hosting configuration exists in the tracked project files.

**CI Pipeline:**
- None detected.

## Environment Configuration

**Required env vars:**
- None detected.

**Secrets location:**
- No secrets or secret-management configuration detected.

## Webhooks & Callbacks

**Incoming:**
- None. No application server or API routes are present.

**Outgoing:**
- None. The browser requests static CDN assets only; business data is not sent to an external endpoint.

---

*Integration audit: 2026-10-10*
