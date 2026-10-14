# Architecture Research

**Domain:** Offline-first browser POS with optional recovery backup
**Researched:** 2026-10-10
**Confidence:** MEDIUM

## Recommended Architecture

Use one authoritative browser app with bundled offline resources and a versioned, transactional local data model. IndexedDB is the operational source of truth. USB export/restore provides user-controlled recovery; optional encrypted cloud backup is a separate disaster-recovery copy, not a multi-device live database.

## Components

1. **Offline app shell** — locally bundled HTML, scripts, styles, fonts, and assets; service worker and Cache API support offline startup.
2. **Domain/data layer** — versioned products, stock movements, orders/order lines, payments, refunds, and audit events.
3. **Fast POS UI** — quick mines and stock feedback; core actions do not wait for network calls.
4. **Derived reporting** — calculate gross value, cash receipts less refunds, receivables, and profit from canonical records using explicit date rules.
5. **Recovery and exports** — versioned snapshot, validation, restore preview/confirmation, local XLSX/PDF, and optional encrypted remote copy.

## Data Flow

```text
Order action → validate → atomic IndexedDB transaction (order + stock + initial payment)
             → confirm commit → refresh affected UI and metrics

Backup → consistent versioned snapshot → USB download or optional encryption/upload

Restore → validate version and relationships → show preview and preserve current copy
        → explicit confirmation → transactional import/migration
```

## Important Decisions

- **One writer:** Select a production frontend and prevent the other app from writing the live schema.
- **Ledger over mutable totals:** Keep payment/refund events; derive balance and collection metrics for auditability.
- **Cancellation as a state transition:** Record time/reason, restore stock through a compensating movement, exclude from active order value/profit, retain earlier payments, and log refunds separately.
- **Atomic operations:** An order and stock decrement should succeed or fail together; show success only after persistence commits.
- **Local-first is not permanent:** Request persistent browser storage when available, expose write failures, and maintain user backups.
- **Cloud backup is not sync:** Keep one operational device; replacement-device restore is deliberate and validated.
- **Stable origin:** Browser database and service-worker cache are origin-scoped; document a stable HTTPS/local-server launch path rather than relying on `file://`.

## Security Boundaries

- IndexedDB does not protect against local device access or same-origin XSS. Treat stored strings as untrusted and render safely.
- Encrypt backup payloads before optional upload. Specify key derivation and recovery before offering the feature; a lost key can make the backup unusable.
- Minimize customer data and payment references; never store payment credentials.
- Validate imported backups and apply schema migration safely before records become active.

## Sources

- [MDN: Using Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers) — offline cache lifecycle.
- [MDN: Offline and background operation](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Offline_and_background_operation) — caching app resources for offline use.
- [MDN: IndexedDB key characteristics](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Basic_Terminology) — structured offline browser storage.
- [MDN: Storage quotas and eviction](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria) — persistence and data-loss risks.
- [OWASP: HTML5 Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html) — browser storage and XSS.
- [MDN: SubtleCrypto.encrypt](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/encrypt) — secure-context encryption API.

---
*Architecture research for: Clothes Mania Davao POS*
