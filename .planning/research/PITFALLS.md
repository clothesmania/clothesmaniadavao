# Pitfalls Research

**Domain:** Offline-first browser-based retail POS
**Researched:** 2026-10-10
**Confidence:** MEDIUM

## Critical Pitfalls

### 1. Treating IndexedDB as a permanent backup
Browser storage is best-effort by default and may be cleared or evicted. Request persistence where available, display backup age, handle quota/write failures, and test complete export/restore before real sales. Warning signs: silent write errors and no tested restore.

### 2. Offline records but online-only application assets
CDN scripts/styles/fonts can prevent startup when disconnected. Bundle required assets, cache the app shell, and test a cold browser restart with the network disabled. An already-open tab is not an offline-start test.

### 3. Two clients overwrite one another's schema
The root and React apps currently write `ClothesManiaDB.kv['db']` with different data models. Choose one production client, version the schema, and back up existing data before migration. Avoid whole-object writes from an incomplete scaffold.

### 4. XSS exposes or changes the local database
Same-origin script can access browser storage; unsafe `innerHTML` insertion of stored buyer/product text can execute markup and tamper with records. Use safe DOM text rendering/encoding, validate imported data, and reduce third-party runtime scripts.

### 5. Non-atomic stock/order writes
If order save succeeds but stock decrement fails, records diverge; retries may duplicate a mine. Commit order, order lines, stock movement, and initial payment in one IndexedDB transaction; confirm UI success only after commit.

### 6. Misleading financial totals
Order value, cash received, receivables, and profit differ. Later installments, cancellations, and partial refunds can distort date totals if derived from a `paid` flag or current status alone. Keep timestamped events, define formulas/date bases, and test full and partial payment/refund cases.

### 7. Restore overwrites newer or incompatible data
Direct JSON assignment can destroy newer records or create broken relationships. Validate schema/version/IDs, create a pre-restore backup, show backup date and record counts, require confirmation, and restore transactionally.

### 8. Encrypted backup with no recovery model
Encryption is ineffective if the key is stored beside ciphertext; a lost key can also make records unrecoverable. Define key derivation and recovery, test on a fresh device, and do not claim protection against malicious same-origin code or an unlocked compromised device.

## Sources

- [MDN: Storage quotas and eviction](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria) — persistence, quota, and eviction.
- [MDN: Using Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers) — offline asset caching.
- [OWASP: HTML5 Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html) — XSS and browser storage risks.
- [MDN: SubtleCrypto.encrypt](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/encrypt) — secure-context and encryption guidance.
- `.planning/codebase/CONCERNS.md` — repository-specific schema collision, demo seeding, reset behavior, and unsafe HTML interpolation.

---
*Pitfalls research for: Clothes Mania Davao POS*
