---
phase: "1"
slug: "clickable-ui-prototype"
status: draft
shadcn_initialized: false
preset: none
created: "2026-10-10"
---

# Phase 1 — UI Design Contract

> UI and interaction contract for an isolated, clickable sample-data prototype. This phase does not access or mutate production records.

## Surface Purpose

The prototype lets the Clothes Mania Davao admin/host review the proposed POS workflow before production data is connected. It should feel immediately understandable during a live-selling session: the dashboard opens first, and **Record Mine** remains the clearest action. Preserve the existing Clothes Mania logo and amber/charcoal visual identity; improve hierarchy and touch usability rather than inventing a new brand.

## Design System

| Property | Value |
|----------|-------|
| Tool | none |
| Preset | not applicable |
| Component library | none; use semantic HTML and existing utility styling patterns |
| Icon library | Existing Font Awesome solid icons; do not add a new icon system |
| Font | Inter for body/UI; Outfit for display headings, matching the current page |

This prototype is a separate, in-memory experience. It must not initialize Dexie, IndexedDB, localStorage, or the production database. Use sample-only state and a reset action.

## Information Architecture and Layout

- Dashboard is the default screen, as confirmed by the owner.
- Provide clear navigation to Dashboard, Quick Mine, Products, Orders/Payments, Reports, and Backup.
- On laptop/desktop, retain a compact persistent side navigation and a clear top bar.
- On tablet widths, keep content readable and touch-friendly; navigation may collapse into a drawer, while **Record Mine** remains visible without horizontal scrolling.
- Dashboard hierarchy: page title/date range; four financial summary cards; prominent **Record Mine** action; recent orders; low-stock callouts.
- Financial cards are labeled **Gross Order Value**, **Cash Collected**, **Pending Receivables**, and **Net Profit**. Do not merge the first three into one sales figure.
- Quick Mine should be a focused screen or modal with customer, product search, quantity, item total, initial downpayment, payment mode, and optional reference. Keep advanced settlement/cancellation details in Orders/Payments.
- Products presents a compact inventory list with SKU, item, variant, available quantity, cost, and selling price; add-item interaction previews the generated SKU.
- Orders/Payments supports sample status filters and an order detail/payment-history view with demo Add Payment, Cancel, and Refund interactions.
- Reports allows switching between daily and weekly sample summaries.
- Backup explains that this is a prototype; simulated export/restore actions must not download or import real business data.

## Sample Data Contract

- Label the interface with a persistent **Prototype · Sample Data** badge.
- Use obviously fictional buyers such as **Sample Buyer 01**, never real customer information.
- Seed a small, internally consistent sample set. Example: one active ₱700 order with ₱350 collected and ₱350 balance; one paid ₱500 order; one cancelled order with a ₱200 payment and ₱200 refund.
- Dashboard sample totals: gross order value ₱1,200; cash collected net of refunds ₱850; pending receivables ₱350. Net profit is shown only as sample data and uses the product costs included in the seed set.
- Sample interactions may add a mine, add a payment, cancel an order, record a refund, and change filters; all updates remain in isolated in-memory state.
- **Reset Sample Data** restores the original sample set. Do not imply that the reset affects real business records.

## Interaction Contract

- The global **Record Mine** action opens the Quick Mine flow from every prototype screen.
- Selecting a product previews its price and remaining sample stock; saving a demo mine updates only the sample order list, sample stock, and sample dashboard totals.
- Payment actions add a visible row to the sample payment history and recompute the sample balance; they never alter real records.
- Cancel and refund actions require a clear confirmation in the prototype and visibly update only the sample state.
- Navigation, date-range controls, status filters, theme toggle, and reset are clickable and provide visible feedback.
- Avoid decorative motion that delays entry or hides content; transitions are brief, optional, and respect reduced-motion preferences.

## Spacing Scale

Declared values (multiples of 4):

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Icon/text gaps |
| sm | 8px | Compact field and row spacing |
| md | 16px | Standard control and card spacing |
| lg | 24px | Section padding |
| xl | 32px | Major layout gaps |
| 2xl | 48px | Page-level section separation |
| 3xl | 64px | Reserved for large desktop-only breaks |

Exceptions: table cells may use 12px vertical padding where needed for density; preserve 44px minimum interactive target height on touch layouts.

## Typography

| Role | Size | Weight | Line Height |
|------|------|--------|-------------|
| Body | 14px | 400 | 1.5 |
| Label | 12px | 600 | 1.35 |
| Heading | 24px | 700 | 1.25 |
| Display | 32px | 800 | 1.1 |

Use tabular numerals for prices, quantities, and KPI values. Keep long names readable by wrapping in detail views and truncating only in dense table cells with an accessible full value.

## Color

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | Light `#F9FAFB`; dark `#0F1117` | Main page background |
| Secondary (30%) | Light `#FFFFFF`; dark `#161922` | Cards, navigation, dialogs |
| Accent (10%) | `#F59E0B` | Record Mine, active nav, selected chart/filter state |
| Destructive | `#E11D48` | Cancel/refund destructive confirmation only |

Accent reserved for: **Record Mine**, active navigation, selected range/filter, and restrained focus emphasis. Use semantic green/rose/amber status tones with text labels; never encode payment status by color alone.

## Copywriting Contract

| Element | Copy |
|---------|------|
| Primary CTA | Record Mine |
| Prototype badge | Prototype · Sample Data |
| Empty state heading | No orders yet |
| Empty state body | Record a sample mine to see it appear here. |
| Error state | This sample action could not be completed. Try again or reset sample data. |
| Destructive confirmation | Cancel order: Cancel this sample order? Its sample stock and totals will update. No real records are affected. |
| Refund confirmation | Record refund: Add this refund to the sample payment history? No real records are affected. |
| Reset confirmation | Reset sample data: Restore the original prototype data? Your real business records are not connected to this prototype. |

Use Philippine peso formatting (`₱`), familiar payment labels (Cash, GCash, Maya, Bank Transfer), and concise English labels. Avoid unexplained accounting jargon in the host flow.

## Accessibility and Responsive Behavior

- All actions work by keyboard and have visible focus; forms have persistent labels and validation text.
- Maintain readable contrast in light and dark modes; communicate statuses with both labels and color.
- Maintain at least 44px touch targets for primary tablet interactions.
- No essential action depends on hover; do not require horizontal page scrolling at supported laptop/tablet widths.
- Respect `prefers-reduced-motion`; no content may be hidden until an animation completes.
- Announce successful demo actions and validation errors through accessible status messaging.

## UI Considerations

Applicable state considerations resolved: pending post-checker pass.

| Category | Element(s) | Status | Resolution / Reason |
|----------|------------|--------|---------------------|
| empty | Dashboard metrics, Products list, Orders list, Reports | Pending | To be finalized after UI contract review. |
| loading | Prototype screen navigation and sample actions | Pending | To be finalized after UI contract review. |
| error | Quick Mine form, Add Payment, Cancel/Refund, prototype actions | Pending | To be finalized after UI contract review. |
| populated | Dashboard metrics, product/order/payment lists, reports | Pending | To be finalized after UI contract review. |
| partial | Quick Mine form and incomplete sample order/payment detail | Pending | To be finalized after UI contract review. |
| overflow | Sidebar/navigation, product/order tables, payment reference fields | Pending | To be finalized after UI contract review. |
| zero-one-many | Product, order, payment, and report collections | Pending | To be finalized after UI contract review. |
| long-text | Product names, buyer labels, references, notes | Pending | To be finalized after UI contract review. |

## Registry Safety

No component registry or third-party component library is used. Do not initialize shadcn or add a component registry for this prototype.

## Manual Checker Sign-Off

This session does not have GSD subagent dispatch enabled. The UI contract will receive an inline seven-dimension review; this is not a subagent verification.

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS
- [ ] Dimension 7 Inventory Provenance: PASS

**Approval:** pending
