---
last_mapped_commit: cfacc02aa0f9800754f6d573e59d04e5a8ba0cf7
last_mapped_at: 2026-10-10
---
# Codebase Concerns

**Analysis Date:** 2026-10-10

## Tech Debt

**Monolithic standalone page:**
- Issue: `index.html` is about 1,930 lines and combines markup, CSS, state, persistence, business logic, and rendering.
- Files: `index.html`.
- Impact: Changes are difficult to isolate, reason about, or test; inline event handlers and duplicated function declarations increase regression risk.
- Fix approach: Split by domain and view only when a target frontend is chosen; add tests around existing storage and business behavior before moving it.

**Parallel React scaffold:**
- Issue: `client/src/App.jsx` is a minimal dashboard with static zero metrics and placeholder chart/table panels, not a complete port of the standalone system.
- Files: `client/src/App.jsx`, `client/src/main.jsx`, `index.html`.
- Impact: Users can mistake two different implementations for one synchronized app; each can overwrite the shared IndexedDB snapshot.
- Fix approach: Decide which frontend is authoritative, define a versioned shared data contract, then port or retire the other intentionally.

**Root setup instructions lack a package manifest:**
- Issue: `README.md` tells users to run `npm run start`, but the root has no `package.json`; only a lockfile is present.
- Files: `README.md`, `package-lock.json`.
- Impact: The documented root startup command is not reproducible from the checked-in root files.
- Fix approach: Document a known available static server or add the intended root manifest and lock it consistently.

## Known Bugs / Behavioral Risks

**Reset may reload stale IndexedDB state:**
- Symptoms: `resetDemoData()` removes only localStorage, then `loadFromLocalStorage()` prefers the existing Dexie `db` row.
- Files: `index.html:927-952`, `index.html:1762-1768`.
- Trigger: Reset after a Dexie snapshot has been written.
- Workaround: None documented; clearing the site’s IndexedDB data manually may be required.

**Synthetic demo data is mixed into persisted business data:**
- Symptoms: Startup seeds orders to 50 and ledger entries to 30 with generated values, then saves those values to persistent storage.
- Files: `index.html:873-925`, `index.html:1911-1921`.
- Trigger: First run or saved state below the seed target.
- Impact: A demo dataset can appear like actual business records, and generated values vary by browser/run.

## Security Considerations

**User-controlled strings enter HTML templates:**
- Risk: Buyer, product, color, item, and related stored fields are interpolated into `innerHTML` in multiple renderers. Stored content can therefore become executable markup/script in the same origin.
- Files: `index.html` renderers around `renderDashboardTransactions()`, `renderProductsCatalog()`, `renderFullMinesTable()`, `renderDailyLedger()`, and `handleMineItemInput()`.
- Current mitigation: An `escapeHtml()` helper exists, but coverage is not consistent across the rendering code.
- Recommendations: Render data with `textContent`/DOM nodes or consistently escape every untrusted field before HTML insertion; validate at input boundaries as an additional measure.

**No authentication or authorization:**
- Risk: The app has no identity boundary and stores data in the local browser profile.
- Files: `index.html`, `client/src/App.jsx`.
- Current mitigation: None detected; login is explicitly removed in the standalone page.
- Recommendations: Treat it as a local demo/prototype; add a real authorization and server-side persistence design before using it for multi-user or sensitive business data.

**CDN dependency availability and supply chain:**
- Risk: Core libraries load at runtime from public CDNs without local fallback or integrity hashes.
- Files: `index.html`.
- Current mitigation: None detected.
- Recommendations: Pin and integrity-protect CDN assets or bundle dependencies for a production deployment.

## Performance Bottlenecks

**Full UI refresh after mutations:**
- Problem: `saveToLocalStorage()` refreshes all views after each mutation; renderers rebuild DOM with string concatenation.
- Files: `index.html:954-959`, `index.html:1042-1050`.
- Cause: Whole-screen refresh and repeated `innerHTML` appends scale with all displayed records.
- Improvement path: Measure with realistic datasets, then update only affected regions or move to a component renderer.

## Fragile Areas

**Storage and schema boundary:**
- Files: `index.html`, `client/src/App.jsx`.
- Why fragile: Both versions write the same IndexedDB database and key as an entire object, while only the standalone version has the complete `mines`/`shirts`/`dailyLedger`/`products` model and localStorage fallback.
- Safe modification: Document and test schema changes; avoid writes from the scaffold until its behavior and migration rules are defined.
- Test coverage: No automated tests exist.

**Standalone render/action coupling:**
- Files: `index.html`.
- Why fragile: Inline `onclick` attributes, DOM ID lookups, state mutations, and render templates are tightly coupled.
- Safe modification: Trace each UI action to its handler and persistence call; check the corresponding renderer and modal lifecycle.
- Test coverage: No automated tests exist.

## Scaling Limits

**Browser-only persistence:**
- Current capacity: Limited to a browser's local storage quota and one browser profile/origin.
- Limit: No synchronization, centralized backup, concurrent-user handling, or server-side durability.
- Scaling path: Introduce a backend, data ownership/authentication, and explicit conflict/migration semantics if multi-device use is required.

## Dependencies at Risk

**Standalone CDN dependencies:**
- Risk: External URL or network changes can break Tailwind, chart rendering, IndexedDB wrapper, icons, and fonts at runtime.
- Impact: The root app has no bundler-managed dependency graph or offline asset bundle.
- Migration plan: Bundle pinned dependencies if reliable offline or production behavior becomes a requirement.

---

*Concern analysis: 2026-10-10*
