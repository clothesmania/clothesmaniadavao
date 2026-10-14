# Project Research Summary

**Project:** Clothes Mania Davao POS
**Domain:** Offline-first single-device live-selling retail POS
**Researched:** 2026-10-10
**Confidence:** MEDIUM

## Executive Summary

This is a local-first POS app for one admin/host handling live-selling orders, stock, collections, and unpaid balances. The strongest fit is one authoritative browser app with a bundled offline shell and transactional IndexedDB records. USB export/restore is the user's recovery path; cloud backup can be optional and encrypted, without becoming a second live database.

The main risk is treating browser storage as permanently safe or assuming locally stored data means the app itself works offline. Browser storage is best-effort by default, and the current root app depends on CDN assets. Reliable use requires bundled assets, visible persistence/write failure status, tested backups/restores, and atomic history for order, stock, payment, cancellation, and refund events.

The standalone page and React scaffold currently write the same IndexedDB key with different schemas. Choose one authoritative frontend before expanding the data model. Exact profit rules, payment/refund reporting dates, and backup-key recovery still need product decisions.

## Key Findings

### Recommended Stack

See [STACK.md](STACK.md). Keep IndexedDB (potentially through the existing Dexie layer), bundle runtime assets, and use a service worker/Cache API for offline startup. Web Crypto can encrypt optional backups, but key recovery and XSS limitations need deliberate handling.

**Core technologies:**
- IndexedDB/Dexie: local structured business data — supports offline queries and transactional records.
- Service Worker + Cache API: offline app shell — caches required scripts, styles, and assets.
- Web Crypto API: optional backup encryption — requires a secure context and a defined recovery model.
- One chosen frontend: authoritative UI — avoids incompatible clients overwriting shared storage.

### Expected Features

See [FEATURES.md](FEATURES.md).

**Must have (table stakes):**
- Quick mine entry, inventory accuracy, and cost/retail product records.
- Installment/refund ledger and separate gross, collected, and receivable totals.
- Auditable cancellations, offline startup, and visible data-save status.
- Full local backup/restore and daily/weekly financial reporting.

**Should have (competitive):**
- Keyboard-first entry, stock availability cues, USB-friendly Excel/PDF reports, and optional encrypted cloud recovery.

**Defer (v2+):**
- Multi-device editing, social-platform API integration, multi-branch operation, and automatic conflict resolution.

### Architecture Approach

See [ARCHITECTURE.md](ARCHITECTURE.md). Bundle the app shell, route all business writes through one versioned IndexedDB layer, and commit related order/stock/payment changes atomically. Derive reports from retained events. Treat remote backup as an encrypted, deliberate replacement-device recovery copy.

**Major components:**
1. Offline app shell — locally bundled assets and cached startup.
2. Domain/data layer — versioned records and atomic order/stock/payment/refund operations.
3. Reports and recovery — derived totals, validated restore, local Excel/PDF, optional encrypted backup.

### Critical Pitfalls

See [PITFALLS.md](PITFALLS.md).

1. **Browser data is not a backup** — request persistence, surface failures, and test restore.
2. **CDN assets break offline startup** — bundle resources and test a cold disconnected launch.
3. **Competing data writers** — select one frontend and migrate through a versioned schema.
4. **XSS can expose/corrupt stored records** — render safely and treat stored/imported values as untrusted.
5. **Accounting and stock drift** — record atomic events and define date/formula rules.

## Implications for Roadmap

Suggested phases to validate against the v1 requirements:

### Phase 1: Establish a Safe Local Foundation
**Rationale:** A single writer and trustworthy data model are prerequisites.
**Delivers:** Choose the production frontend, version local schema, define migrations, expose persistence state, and remove synthetic business records.
**Avoids:** Competing-schema overwrites and demo data mixed with real sales.

### Phase 2: Trustworthy Inventory and Live Orders
**Rationale:** A mine must update order and stock together.
**Delivers:** Stock-in, products/SKUs, quick mines, stock movement history, atomic order capture.

### Phase 3: Payment Ledger and Reconciliation
**Rationale:** Partial payments and refunds require explicit event semantics.
**Delivers:** Installment/refund history, audit-safe cancellation, gross/collected/receivable/profit rules and reports.

### Phase 4: Offline App Shell and Local Recovery
**Rationale:** Local records alone do not guarantee offline launch or recoverability.
**Delivers:** Bundled assets, service-worker caching, offline/save status, complete USB backup and validated restore.

### Phase 5: Business Exports and Optional Cloud Safety Net
**Rationale:** Export and cloud recovery should use a stable, tested schema.
**Delivers:** XLSX/PDF and optional encrypted remote backup with replacement-device restore.

### Phase Ordering Rationale

- Resolve frontend/schema ownership before migration or new write paths.
- Make order/stock/payment invariants reliable before trusting financial metrics.
- Test offline launch separately from local database access.
- Add optional remote recovery only after local backup/restore is dependable.

### Research Flags

- **Phase 1:** Inventory real data separately from seeded demo data; plan schema migration.
- **Phase 3:** Confirm profit recognition, partial refunds, and reporting-date semantics.
- **Phase 5:** Select export libraries, cloud provider, encryption/key recovery, and privacy approach.
- **Phase 2 and 4:** Established browser patterns; still require real-browser regression tests.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | MEDIUM | Browser APIs are documented; exact frontend, versions, and deployment remain undecided. |
| Features | MEDIUM | Grounded in the user's workflow; final v1 scope awaits confirmation. |
| Architecture | MEDIUM | Established patterns; migration and app-origin choices need validation. |
| Pitfalls | HIGH | Risks are documented by MDN/OWASP and the codebase map. |

**Overall confidence:** MEDIUM

### Gaps to Address

- **Accounting policy:** Decide whether profit is tied to order or payment dates and how partial refunds affect it.
- **Deployment origin:** Choose the supported local/PWA launch path and browser/device targets.
- **Backup keys:** Define how encrypted cloud data remains recoverable on a replacement device.
- **Existing data:** Reconcile real and seeded demo records before any migration/reset.

## Sources

### Primary (HIGH confidence)
- [MDN: IndexedDB key characteristics](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Basic_Terminology) — structured offline browser storage.
- [MDN: Storage quotas and eviction](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria) — quota, persistence, and eviction.
- [MDN: Using Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers) — offline caching and lifecycle.
- [MDN: SubtleCrypto.encrypt](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/encrypt) — secure contexts and encryption.
- [OWASP: HTML5 Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html) — browser storage and XSS.

### Secondary (MEDIUM confidence)
- `.planning/codebase/ARCHITECTURE.md` and `.planning/codebase/CONCERNS.md` — project-specific findings.
- User-provided workflow — product goals and constraints.

---
*Research completed: 2026-10-10*
*Ready for requirements: yes*
