# Stack Research

**Domain:** Offline-first, single-device retail POS
**Researched:** 2026-10-10
**Confidence:** MEDIUM

## Recommended Stack

| Technology | Purpose | Why |
|------------|---------|-----|
| IndexedDB (existing Dexie layer may be retained) | Structured local business records | Supports offline queries and transactional structured storage; preferable to a single whole-object JSON snapshot. |
| Service Worker + Cache API | Offline app-shell resources | Cache app scripts, styles, and assets so the app can start without CDN access. |
| Web Crypto API | Optional encrypted backup | Supports authenticated AES-GCM; key creation and recovery need explicit design. |
| One chosen frontend (standalone or React/Vite) | Production UI | The repo has two independent frontends with incompatible schemas; select one before adding business writes. |

## Supporting Libraries

| Library | Version | Purpose | Notes |
|---------|---------|---------|-------|
| Dexie | Existing 3.2.2 | IndexedDB schema, transactions, migrations | Verify compatibility and migration plan before retaining. |
| XLSX/PDF library | Not selected | Local report generation | Select and pin only when export scope and formats are approved; test fully offline. |

## Alternatives Considered

| Recommended | Alternative | When to use alternative |
|-------------|-------------|-------------------------|
| IndexedDB entities and transactions | localStorage JSON snapshot | Small noncritical preferences only; not the main transactional sales database. |
| Bundled assets and service-worker cache | CDN-only scripts/styles | Only when offline startup is not required. |
| Optional encrypted recovery copy | Cloud-authoritative app | Only if the operating model changes to multi-device/cloud-first. |

## What NOT to Use

| Avoid | Why | Use instead |
|-------|-----|-------------|
| CDN-only runtime dependencies | App may not load when internet is down. | Bundle required dependencies and verify cold offline launch. |
| Two clients writing the same snapshot key | Partial schema can overwrite complete business records. | One authoritative client, versioned records, and explicit migrations. |
| Browser storage as the only backup | Data can be cleared or evicted. | Local database plus tested export/restore and optional off-device backup. |

## Implementation Notes

- IndexedDB and service-worker data are origin-scoped; use a stable local/HTTPS origin and document launch/update behavior. Do not assume `file://` supports PWA/service-worker behavior.
- Request persistent storage where supported, show its status, and handle quota/write failures visibly. Persistence is not a substitute for a backup.
- Avoid selecting export/cloud libraries until the authoritative frontend, browser targets, and recovery requirements are confirmed.

## Sources

- [MDN: IndexedDB key characteristics](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Basic_Terminology) — structured local browser data and offline-capable queries.
- [MDN: Storage quotas and eviction](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria) — persistence, quota, and eviction behavior.
- [MDN: Using Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers) — lifecycle and offline caching.
- [MDN: SubtleCrypto.encrypt](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/encrypt) — secure-context requirement and AES-GCM.
- [OWASP: HTML5 Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html) — XSS and browser-storage risks.

---
*Stack research for: Clothes Mania Davao POS*
