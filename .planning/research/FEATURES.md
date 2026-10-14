# Feature Research

**Domain:** Single-device live-selling POS and inventory management
**Researched:** 2026-10-10
**Confidence:** MEDIUM

## Table Stakes

- **Fast mine entry** — record a customer and product with minimal interruption to the live host.
- **Inventory and stock-in** — track SKU, cost, retail price, quantities, and prevent overselling.
- **Payment/installment history** — record initial downpayment and later timestamped payments with amount, mode, and reference.
- **Separate financial totals** — gross order value, cash collected net of refunds, and pending receivables must remain distinct.
- **Cancellation/refund audit trail** — retain cancelled orders, restore stock, exclude cancelled sales from active totals, and record refunds.
- **Offline operation** — core data and app assets must both be available without internet.
- **Local backup/restore** — complete export and validated restore, with safeguards against silent overwrite.
- **Daily/weekly reporting** — show sales, collections, receivables, and profit with clear date/cancellation rules.
- **Visible persistence status** — surface save failures; do not claim success before durable writes complete.

## Differentiators

- Keyboard-first quick-mine flow and immediate available-stock feedback.
- Simple initial DP entry, with richer installment handling after the live stream.
- USB-friendly full backup plus human-readable Excel and PDF reports.
- Optional encrypted cloud recovery copy without requiring network access for sales.
- Cash reconciliation based on payment/refund date as well as order date.

## Defer (v2+)

- Concurrent multi-device editing and sync-conflict resolution — outside the agreed one-device workflow.
- Direct Facebook/TikTok integration — manual entry is the requested baseline.
- Multi-branch, supplier purchasing, and accounting integrations — not required for the stated live-selling workflow.

## Anti-Features

- Cloud-required selling, because connectivity interruptions must not stop the workflow.
- A single “sales” number that conflates ordered value, collected cash, and debt.
- Delete-on-cancel, because it removes the audit trail and obscures inventory/cash discrepancies.
- Counting a DP as full collection or including cancelled orders in active sales.
- Restore that silently overwrites current local records.

## Sources

- Product priorities derive from the user's stated workflow and `.planning/PROJECT.md`.
- [MDN: IndexedDB key characteristics](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Basic_Terminology) — offline-capable structured data.
- [MDN: Storage quotas and eviction](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria) — local data can be removed, so backup is separate.
- [OWASP: HTML5 Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html) — browser data is accessible to same-origin script and must be treated as untrusted.

---
*Feature research for: Clothes Mania Davao POS*
