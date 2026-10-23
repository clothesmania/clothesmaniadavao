# Editable product choices — complete

Implemented in commit `88e448a`.

- Added inline Manage categories and Manage sizes / variants panels below the inventory filters, with add, rename, cancel, and delete controls, usage counts, status messages, and keyboard focus handling.
- Added additive `productOptions.categories` / `productOptions.sizes` snapshot metadata. Legacy inventory seeds choices, including custom labels. Deleted defaults stay deleted, and unused choices survive snapshot reloads and backups.
- Renaming updates current inventory and its older product mirror while preserving stock, prices, payment records, and historical order text. Choices assigned to any active product, including zero-stock products, cannot be deleted.
- Connected category selection and size suggestions in the product form to the same lists. Newly typed product sizes are retained as choices. Existing local encryption, audit logging, online editing policy, and cloud save queue are used; no backend migration is needed.
- Preserved category metadata when normalizing older product-only snapshots and documented the additive storage format.

Validation: all 40 Node tests passed, including six focused choice-management tests. The server encryption round-trip also passed with choice metadata. `npm run build` passed; `npm run check:build` verified both routes, all 116 offline assets, update headers, and private-file protection. Local browser inspection confirmed both managers, rename/cancel state, usage counts, and disabled in-use delete actions. The existing app cache initially served the previous runtime; reloading after worker activation resolved it. No browser test mutations were submitted to the shared client workspace.

Local preview is running at `http://127.0.0.1:8000/index.html` (server session 21501). Screenshot: `C:/Users/Admin/.codex/visualizations/2026/10/20/01a159ec-cb9d-7583-a131-63c17cdd1f53/product-choice-manager.png`. Changes are committed locally; no push or Vercel deployment was performed.
