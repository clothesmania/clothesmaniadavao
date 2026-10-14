# Phase 2: Real Product and Inventory Screen - Context

**Gathered:** 2026-10-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Establish the production data foundation and deliver the first real Products and Inventory workflow without disrupting the UI flow the client is reviewing. Local IndexedDB remains the operational source while offline; successful local writes queue for automatic, idempotent Supabase synchronization when connectivity returns. This phase must make the shared data model and sync pattern safe for later orders, payments, reports, and recovery work.

</domain>

<decisions>
## Implementation Decisions

### Local-first operation and Supabase sync
- **D-01:** Keep core POS operations available offline; persist locally before attempting any network synchronization.
- **D-02:** Automatically queue local changes and push them to Supabase when online; show sync state and surfaced failures instead of blocking selling or claiming an unsuccessful remote write succeeded.
- **D-03:** Preserve the project's single-primary-device model; do not introduce concurrent multi-device editing or conflict resolution in this phase.
- **D-04:** Require initial online account setup, then permit the already-authorized admin to unlock the saved local session offline.
- **D-05:** Use Supabase Auth and database row-level security for online access. Never place service-role credentials in browser code.

### Existing browser records
- **D-06:** Migrate all existing browser records to the new model and Supabase; do not silently discard historical rows.
- **D-07:** Identify seeded prototype/sample rows during migration and keep their sample designation so they remain reviewable but do not inflate real-business financial metrics by default.
- **D-08:** Preserve an exportable backup and provide a migration preview/count before applying the migration or first remote sync.

### Client-facing flow
- **D-09:** Preserve the current reviewed navigation and screen flow while replacing unsafe storage behavior incrementally; keep prototype sample data isolated from production records.
- **D-10:** Retire or isolate the placeholder React snapshot so two frontends cannot overwrite a shared incompatible database key.

### the agent's Discretion
- Choose the local schema and migration mechanism, outbox representation, retry/backoff behavior, and Supabase table/API layout that best support atomic local operations and idempotent single-device sync.
- Implement stock changes as auditable movements and associate order lines with stable product identifiers.
- Decide how to present connection/sync status accessibly without slowing fast-entry workflows.
- Add tests for financial totals, inventory transitions, migrations, and offline queue replay; use test fixtures that distinguish samples from business records.

</decisions>

<canonical_refs>
## Canonical References

### Product scope and requirements
- `.planning/PROJECT.md` — Core value and offline-first, local-first, single-device constraints.
- `.planning/REQUIREMENTS.md` — Versioned local data, inventory, atomic order/stock behavior, financial correctness, backup, and security acceptance requirements.
- `.planning/ROADMAP.md` — Phase boundaries and success criteria.

### Existing implementation
- `index.html` — Current reviewed standalone UI, sample data, persistence, inventory, orders, reports, and dashboard logic.
- `report-io.js` — Existing import/export behavior and financial summary calculations.
- `client/src/App.jsx` — Placeholder React UI currently sharing the IndexedDB database/key; must not remain a competing writer.
- `AGENTS.md` — Repository architecture, persistence conventions, and workflow requirements.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- The root `index.html` contains the client-reviewed end-to-end flow and existing product/order/report concepts.
- The existing import/export module can inform legacy record migration and backup preview, but its report inclusion rules need reconciliation.
- Existing audit log and trash patterns can inform record traceability, but must be transactionally tied to inventory/payment changes.

### Established Patterns
- The standalone app currently saves a full mutable snapshot to IndexedDB and localStorage; new production writes must not keep this as the authoritative mutation model.
- The React scaffold also writes a snapshot to `ClothesManiaDB` key `db`; isolate it or remove its write path before connecting production records.
- Seeded products and order IDs exist in `index.html`; migration must identify these without confusing genuine browser-entered records.

### Integration Points
- Replace the persistence seam currently centered on `persistDB()`, `saveToLocalStorage()`, and `initApp()` with versioned local repositories and explicit migration.
- Product stock changes, live mines, and order cancellation/return flows must use the same local transaction/movement ledger before sync is enabled for those entities.
- Supabase schema, policies, and browser sync must use the same stable IDs and idempotency contract as the local outbox.

</code_context>

<specifics>
## Specific Ideas

- The client is currently reviewing the existing screen flow; preserve that flow while making the underlying data operations safer.
- User-approved migration choice: sync all current browser records, retaining sample markings for seeded prototype data.
- User-approved offline access choice: after initial online setup, unlock the saved local session offline and sync again when online.

</specifics>

<deferred>
## Deferred Ideas

- Concurrent editing across multiple devices and conflict resolution remain out of scope for the initial single-device workflow.
- Production Vercel deployment should follow local workflow, offline, sync, and recovery verification; it is not part of the first inventory slice.

</deferred>

---

*Phase: 2-real-product-and-inventory-screen*
*Context gathered: 2026-10-14*
