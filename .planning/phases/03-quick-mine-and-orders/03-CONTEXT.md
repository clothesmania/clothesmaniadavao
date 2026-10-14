# Phase 3: Quick Mine and Orders - Context

**Gathered:** 2026-10-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Implement real offline-first mine/order entry in the React client. Product orders must reserve inventory atomically; free-form items must never modify managed stock. Convert supported legacy mine records to queryable local orders while retaining the complete source snapshot and sample-data labels.
</domain>

<decisions>
## Implementation Decisions

- **D-01:** Commit the order, stock-out movement, any initial payment, audit record, and corresponding outbox events in one IndexedDB transaction.
- **D-02:** Reject a product order if requested quantity exceeds current available stock. Free-form items have no product link and do not change inventory.
- **D-03:** Store buyer, item snapshot, live-session name/ID, seller, order date/time, unit price, quantity, total, payment status, sample flag, and legacy ID on each order.
- **D-04:** Retain old record IDs as `legacyId` while assigning UUIDs for new local/remote primary keys; preserve the entire original snapshot as a recoverable archive.
- **D-05:** Mark seeded legacy orders as samples; keep them visible for review but exclude them from production financial summaries by default.
- **D-06:** Map legacy `PAID` records to collected amount equal to order total; otherwise import positive `dp` as an initial payment and retain method/reference values. A raw snapshot remains the fallback for unsupported legacy fields.
- **D-07:** Preserve existing dashboard/navigation prototype separately; production work stays in the React/Vite client.
- **D-08:** Use stable UUID events and an idempotent Supabase RPC; no service-role key in the browser.

### Discretion
- Choose transaction/table structure, validation, outbox payloads, and minimal POS UI to meet the above behavior.
</decisions>

<canonical_refs>
- `.planning/ROADMAP.md`
- `.planning/REQUIREMENTS.md`
- `index.html` and `report-io.js` for legacy fields and sample conventions
- `client/src/lib/local-db.js` and `supabase/migrations/202610140001_initial_local_first_schema.sql`
</canonical_refs>
