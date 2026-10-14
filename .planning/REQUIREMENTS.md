# Requirements: Clothes Mania Davao POS

**Defined:** 2026-10-10
**Core Value:** The host can reliably record every mine, payment, and stock change at live-selling speed—even when the internet is unavailable—and recover the business records if the device is lost.

## v1 Requirements

### Prototype UI

- [ ] **UI-01**: The admin/host can navigate a clickable prototype of Dashboard, Quick Mine, Products, Orders/Payments, Reports, and Backup screens using clearly labeled sample data.
- [ ] **UI-02**: Prototype actions update only disposable sample data, and the user can reset it without changing the production database.
- [ ] **UI-03**: After prototype approval, each production screen is implemented incrementally with its real local data and working behavior before moving to the next screen.

### Offline and Local Data

- [ ] **OFFL-01**: The admin/host can open the app and use core POS screens with the network disconnected after the app has been installed/loaded on its supported origin.
- [ ] **SYNC-01**: Every successful local business write is durably queued and synchronized to Supabase in the background when online, using stable IDs and idempotent retries; pending/failed state is visible and never blocks offline work.
- [ ] **SYNC-02**: Supabase Auth and row-level security restrict business data to authorized accounts; browser code contains no service-role key, and remote sync status/last success are visible.
- [ ] **DEP-01**: The production build deploys to Vercel with configured Supabase public client settings, secure redirect policies, and verified offline workflows after initial installation/load.
- [ ] **DATA-01**: The app stores operational records locally in a versioned schema and migrates supported prior data without silent loss.
- [ ] **DATA-02**: The app reports persistence failures and does not present an unsuccessful write as saved.
- [ ] **DATA-03**: A first-use production database does not silently mix synthetic demo transactions with real business records.
- [ ] **DATA-04**: Existing browser data is backed up and previewed before migration; all records and identifiers are preserved, and seeded sample data remains clearly marked and excluded from real-business totals by default.

### Inventory and Orders

- [ ] **INV-01**: The admin/host can create and update products with a unique SKU, cost, retail price, and stock quantity.
- [ ] **INV-02**: The admin/host can record stock-in and see resulting available quantities.
- [ ] **SALE-01**: The admin/host can record a customer's mine against a product and the app atomically saves the order and deducts its quantity.
- [ ] **SALE-02**: The app prevents overselling by rejecting an order quantity greater than available stock.
- [ ] **SALE-03**: The admin/host can enter an untracked/free-form item for a mine without corrupting managed product stock.

### Payments and Audit

- [ ] **PAY-01**: The admin/host can record an initial downpayment with amount, payment mode, and optional reference when creating an order.
- [ ] **PAY-02**: The admin/host can add later payments with timestamp, amount, payment mode, and reference; the app recalculates the balance and marks the order paid when its remaining balance reaches zero.
- [ ] **CANC-01**: The admin/host can cancel an order with an audit timestamp and optional reason; the app restores stock, retains the record, and excludes the order from active order value and profit.
- [ ] **REF-01**: The admin/host can record a refund against payments on a cancelled order; the app retains its details and subtracts it from cash-collected totals.

### Financials and Reports

- [ ] **FIN-01**: The dashboard separately shows gross value of non-cancelled orders, cash collected net of refunds, and pending receivables.
- [ ] **FIN-02**: The dashboard shows daily and weekly totals and calculates profit from selling price less recorded product cost, excluding cancelled orders.
- [ ] **FIN-03**: Reports identify the date basis used for orders, payments, and refunds so period totals can be reconciled.
- [ ] **EXP-01**: The admin/host can export an Excel workbook with inventory, orders/sales, payment history, and financial summary data.
- [ ] **EXP-02**: The admin/host can generate daily and weekly PDF sales and balance reports.

### Backup and Recovery

- [ ] **BKP-01**: The admin/host can export a complete versioned local backup containing products, stock, orders, payments, cancellations, and refunds.
- [ ] **BKP-02**: Before restoring, the app validates backup structure and relationships, displays a preview, preserves the current data in a backup, and requires explicit confirmation.
- [ ] **BKP-03**: A verified Supabase copy can support device recovery without making cloud connectivity necessary for normal operation or enabling concurrent multi-device editing; restore previews and preserves existing local data.

### Security

- [ ] **SEC-01**: The app safely renders stored and imported customer/product values so they cannot execute as markup or script.

## v2 Requirements

### Deferred

- Multi-device concurrent editing and automatic conflict resolution — the agreed workflow is one admin/host on one primary device.
- Direct Facebook/TikTok comment or order integrations — manual fast entry is the v1 workflow.
- Multi-branch inventory and accounting-system integrations — not required for the initial single-store workflow.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Cloud-required selling | The POS must continue to work offline. |
| Multi-user concurrent editing | The user selected a single-device operating model; backup restore is for recovery only. |
| Silent deletion of cancelled orders | It would remove the audit trail needed to reconcile stock and collections. |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| UI-01–UI-02 | Phase 1 | Pending |
| UI-03, DATA-01–DATA-04, INV-01–INV-02, SEC-01, SYNC-01 | Phase 2 | Pending |
| SALE-01–SALE-03 | Phase 3 | Pending |
| PAY-01–PAY-02, CANC-01, REF-01, FIN-01–FIN-03 | Phase 4 | Pending |
| OFFL-01, BKP-01–BKP-02, EXP-01–EXP-02 | Phase 5 | Pending |
| BKP-03, SYNC-02, DEP-01 | Phase 6 | Pending |

| Requirement | Phase | Status |
|-------------|-------|--------|
| UI-01–UI-03 | Pending roadmap | Pending |
| OFFL-01, DATA-01–DATA-04, SYNC-01–SYNC-02 | Pending roadmap | Pending |
| INV-01–INV-02, SALE-01–SALE-03 | Pending roadmap | Pending |
| PAY-01–PAY-02, CANC-01, REF-01 | Pending roadmap | Pending |
| FIN-01–FIN-03, EXP-01–EXP-02 | Pending roadmap | Pending |
| BKP-01–BKP-03, DEP-01 | Pending roadmap | Pending |
| SEC-01 | Pending roadmap | Pending |

**Coverage:**
- v1 requirements: 29 total
- Mapped to phases: 25
- Unmapped: 0

---
*Requirements defined: 2026-10-10*
*Last updated: 2026-10-10 after UI-first scope approval*
