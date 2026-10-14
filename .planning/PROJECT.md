# Clothes Mania Davao POS

## What This Is

Clothes Mania Davao POS is a fast, offline-first point-of-sale and inventory app for a live-selling clothing business. Up to five admins can share the same inventory and sales workspace across devices. Each device keeps a local working copy for offline operations and safely synchronizes when online.

## Core Value

The host can reliably record every mine, payment, and stock change at live-selling speed—even when the internet is unavailable—and recover the business records if the device is lost.

## Business Context

- **Customer**: Clothes Mania Davao; the admin/host operates the system during and after live sales.
- **Revenue model**: Retail clothing sales through social live-selling and related channels.
- **Success metric**: No lost or oversold orders, with accurate stock, collected cash, and outstanding balances at end of day.
- **Strategy notes**: Each admin uses an individual account; local records commit first and sync to Supabase in the background. Online edits across devices are supported with stale-copy detection and explicit conflict protection.

## Requirements

### Validated

- ✓ The existing repository contains a feature-rich standalone browser POS prototype and a separate minimal React/Vite scaffold; they are not currently equivalent applications.
- ✓ The standalone prototype already has product, order/mine, ledger, dashboard, and browser-persistence concepts, but its current persistence and demo-data behavior are not yet safe to treat as authoritative business records.

### Active

- [ ] A clickable UI prototype lets the admin/host explore the main workflows using clearly identified, resettable sample data that cannot alter real business records.
- [ ] After prototype approval, each production screen is delivered incrementally with its real local data and behavior rather than remaining a mock.
- [ ] The admin/host can use the core POS workflow on one device without internet access.
- [ ] Product stock and order changes remain accurate, durable, and recoverable in local storage.
- [ ] Quick-mine orders track gross order value, cash collected, and outstanding receivables separately.
- [ ] Multiple partial payments are recorded as timestamped ledger entries with payment mode and reference details.
- [ ] Cancelled orders retain an audit trail, restore stock, leave active sales/profit totals, and support recording refunds against collected payments.
- [ ] The owner can review meaningful daily and weekly sales, collection, receivable, and profit totals.
- [ ] The admin can export and restore a complete USB-friendly backup and create Excel and PDF reports.
- [ ] The admin/host can see pending, synced, and failed Supabase changes; sync never blocks local work.
- [ ] Current browser records are preserved through an explicit backup/preview migration, including seeded records clearly marked as samples.
- [ ] Production deployment on Vercel uses Supabase Auth and row-level security without exposing privileged keys.

### Out of Scope

- Cloud-only source of truth or cloud-required selling — live selling must continue offline and local data is committed first.
- Direct Facebook or TikTok comment/order integrations — the current workflow is manual fast entry; no platform API integration has been requested.

## Context

- This is a brownfield project. `.planning/codebase/` contains the GSD architecture, stack, structure, conventions, testing, integration, and concern maps.
- The repository has a standalone app at `index.html` and a separate React/Vite app in `client/`. Both use the same IndexedDB database/key but have different schemas and can overwrite each other's stored snapshot; a single authoritative frontend and versioned data contract need to be chosen before relying on either for real records.
- The standalone page loads core libraries from CDNs, so it currently needs internet for some assets even though its data is stored locally. Its first-run demo seeding, reset/persistence behavior, and unsafe HTML interpolation are known risks documented in `.planning/codebase/CONCERNS.md`.
- No automated test suite, backend, authentication, cloud sync, or production deployment setup was found in the codebase map. The application should be treated as a prototype until data integrity and recovery are verified.
- Daily workflow: stock in garments with cost/retail price and quantity; record customer mines quickly; capture an initial downpayment; add later installments; settle or cancel orders; record refunds where needed; then review daily/weekly figures.
- Financial terms must remain distinct: gross order value is the value of non-cancelled orders; cash collected is payments received less refunds; pending receivables are unpaid balances; profit must be defined consistently with cancellations, refunds, and payment timing before implementation.
- Product records should receive stable unique SKUs. Ad hoc items may be entered during a live, but their cost/price treatment must be explicit so profit is not fabricated.

## Constraints

- **Offline operation**: Core workflows and required application assets must work without an internet connection — live-stream selling cannot depend on connectivity.
- **Local-first storage**: The primary working copy remains on the user's device; queued Supabase synchronization is required when online but must not become a requirement to operate.
- **Multi-admin access**: Support up to five full-access admin accounts sharing one store workspace, with conflict detection and no silent overwrite.
- **Data safety**: Backups and restore must preserve products, inventory, orders, payment history, cancellations, refunds, and identifiers; restore must avoid silently replacing current data.
- **Sensitive records**: Customer and payment-reference data are stored locally and in Supabase; access, encryption, row-level policies, and backup-key recovery need deliberate design.
- **Existing codebase**: Preserve useful behavior while resolving the competing root and React implementations and their incompatible shared storage schema.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Offline-first, local-authoritative app | Internet interruptions must not slow or stop live selling. | — Pending |
| Up to five admins share one store workspace | Supports access from the laptop and phone with individual accounts and audit attribution. | — Pending |
| Local-first sync with conflict safeguards | Keeps offline sales available while protecting concurrent edits from silent overwrite. | — Pending |
| Keep an auditable order/payment/refund history | Cancellations, installments, and refunds must reconcile stock and actual cash. | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `$gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `$gsd-complete-milestone`): review the full document, core value, business context, scope boundaries, and current product context.

---
*Last updated: 2026-10-10 after project vision and scope confirmation*
