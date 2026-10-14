# Roadmap: Clothes Mania Davao POS

## Overview

Start with a clickable, sample-data UI prototype that is isolated from business records. Then establish a versioned local-first data foundation with queued Supabase sync and deliver production workflows vertically. Local commits must remain available offline; online synchronization, financial reconciliation, and Vercel deployment are accepted only after inventory, order/payment history, and recovery behavior are verified.

## Phases

- [ ] **Phase 1: Clickable UI Prototype** - Explore the main live-selling workflow safely with resettable sample data.
- [ ] **Phase 2: Real Product and Inventory Screen** - Deliver the first production screen using the versioned local data model.
- [ ] **Phase 3: Quick Mine and Orders** - Record real mines and stock changes atomically.
- [ ] **Phase 4: Collections and Financial View** - Track installments, cancellations, refunds, and reconciled totals.
- [ ] **Phase 5: Offline Recovery and Exports** - Operate offline and protect records with USB backup, restore, XLSX, and PDF.
- [ ] **Phase 6: Supabase Sync Hardening and Deployment** - Verify secure online sync and recovery, then deploy the accepted production build to Vercel.

## Phase Details

### Phase 1: Clickable UI Prototype

**Goal**: Let the admin/host explore the complete screen flow with believable sample data and no access to production records.
**Mode:** mvp
**UI hint:** yes
**Depends on**: Nothing (first phase)
**Requirements**: UI-01, UI-02
**Success Criteria** (what must be TRUE):
  1. The admin/host can navigate Dashboard, Quick Mine, Products, Orders/Payments, Reports, and Backup screens.
  2. Prototype interactions visibly update sample data and a reset returns the prototype to its initial sample state.
  3. The prototype clearly indicates that its data is sample-only and cannot read or write the production database.
  4. The owner can review the proposed screen flow before production behavior is connected.

**Plans**: TBD

### Phase 2: Real Product and Inventory Screen

**Goal**: Deliver the first production screen backed by versioned local data and establish safe screen-by-screen implementation patterns.
**Mode:** mvp
**Depends on**: Phase 1
**Requirements**: UI-03, DATA-01, DATA-02, DATA-03, DATA-04, INV-01, INV-02, SEC-01, SYNC-01
**Success Criteria** (what must be TRUE):
  1. The production Products screen creates and edits products with unique SKU, cost, retail price, and stock quantity.
  2. Stock-in changes inventory through a recorded movement and the Products screen shows the resulting quantity.
  3. Supported existing data is migrated without silent loss, synthetic demo orders are not introduced as real transactions, and failed writes are clearly reported.
  4. Product and customer-provided text is rendered as text rather than executable markup.
  5. The implementation pattern connects each later production screen to real data and behavior before moving on.
  6. Local writes enter a durable, idempotent outbox and sync to Supabase asynchronously; offline writes remain usable and sync failures are visible.
  7. Existing browser data is backed up and previewed before migration; all records are retained, with seeded prototype records marked as samples.

**Plans**: TBD

### Phase 3: Quick Mine and Orders

**Goal**: Let the admin/host record live mines against real products with reliable stock handling.
**Mode:** mvp
**Depends on**: Phase 2
**Requirements**: SALE-01, SALE-02, SALE-03
**Success Criteria** (what must be TRUE):
  1. The admin/host can find a product, enter a customer mine, and see the remaining stock immediately.
  2. Saving an order and decrementing inventory either both commit or neither is reported as complete.
  3. The app rejects quantities above available stock and supports a free-form item without changing managed product inventory.

**Plans**: TBD

### Phase 4: Collections and Financial View

**Goal**: Give the admin/host an auditable payment workflow and clear daily/weekly business totals.
**Mode:** mvp
**Depends on**: Phase 3
**Requirements**: PAY-01, PAY-02, CANC-01, REF-01, FIN-01, FIN-02, FIN-03
**Success Criteria** (what must be TRUE):
  1. The admin/host can record an initial downpayment and later timestamped payments with mode and reference; the balance updates and the order becomes paid at zero.
  2. Cancelling an order retains its timestamp/reason, restores stock, and removes its order value and profit from active totals.
  3. A refund is retained as a separate record and reduces collected cash without deleting the original payment history.
  4. Dashboard views separately show gross order value, cash collected net of refunds, pending receivables, and profit for daily and weekly periods.
  5. Reports make the date basis for orders, payments, and refunds clear.

**Plans**: TBD

### Phase 5: Offline Recovery and Exports

**Goal**: Keep core operations available offline and give the owner reliable local backup and reporting tools.
**Mode:** mvp
**Depends on**: Phase 4
**Requirements**: OFFL-01, BKP-01, BKP-02, EXP-01, EXP-02
**Success Criteria** (what must be TRUE):
  1. After initial load/install on the supported origin, the app opens and core POS screens work with the network disabled.
  2. The admin/host can export a complete versioned backup containing products, stock, orders, payments, cancellations, and refunds.
  3. Restore validates and previews a backup, preserves the current data first, and applies only after explicit confirmation.
  4. The owner can generate an Excel workbook with inventory, orders, payments, and financial summary data.
  5. The owner can generate readable daily and weekly PDF sales and balance reports.

**Plans**: TBD

### Phase 6: Supabase Sync Hardening and Deployment

**Goal**: Verify secure Supabase synchronization and recovery, then deploy the accepted production build to Vercel without making network access part of live selling.
**Mode:** mvp
**Depends on**: Phase 5
**Requirements**: BKP-03, SYNC-02, DEP-01
**Success Criteria** (what must be TRUE):
  1. Supabase accepts only authenticated, authorized requests under row-level security; no privileged key is shipped to the browser.
  2. Local outbox changes retry safely and idempotently after reconnect; sync state and last successful sync are visible.
  3. The owner can recover a replacement device from a verified remote copy without silently overwriting its local records.
  4. Vercel deployment uses configured public Supabase URL/anon key and production redirect/CORS settings; offline workflows still pass after a production build is cached.

**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Clickable UI Prototype | 0/TBD | Not started | - |
| 2. Real Product and Inventory Screen | 0/TBD | Not started | - |
| 3. Quick Mine and Orders | 0/TBD | Not started | - |
| 4. Collections and Financial View | 0/TBD | Not started | - |
| 5. Offline Recovery and Exports | 0/TBD | Not started | - |
| 6. Supabase Sync Hardening and Deployment | 0/TBD | Not started | - |

### Phase 7: Shared multi-admin workspace and password recovery

**Goal:** Let up to five individual admin accounts share one local-first store workspace across devices, with concurrent edit conflict protection and Supabase password recovery.
**Requirements**: AUTH-01, AUTH-02, SYNC-03
**Depends on:** Phase 6
**Plans:** 0 plans

**Success Criteria** (what must be TRUE):
  1. The first existing admin owns the shared workspace, and up to four additional admins can join only with a valid, email-bound, expiring invitation.
  2. The database enforces a maximum of five active workspace admins and gives every member full read/write access under RLS-checked RPCs.
  3. Existing workspace snapshots remain available after migration, and first-device data initializes the shared workspace without silent replacement.
  4. Clean devices refresh remote changes automatically; concurrent local edits trigger a conflict flow that preserves both copies before an explicit choice.
  5. Admins can request a Supabase password-reset email and complete password recovery in the POS app.
  6. Offline local writes remain available and sync after reconnection; the app uses each admin's own account per device.
  7. Tests cover invitation limits, workspace access, recovery screens, refresh, and conflict-safe snapshot selection.

**Implementation status:** Code and migration drafted; migration application, SMTP setup, and deployed multi-device verification remain pending.
