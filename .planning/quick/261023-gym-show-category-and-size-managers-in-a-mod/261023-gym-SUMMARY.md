# Product choice modal — complete

Implemented in `bdb3784`. Both category and size/variant managers now open as centered overlays above Products & Inventory. The bounded, scrollable popup preserves all choice management and persistence behavior. Added dialog semantics, inert background content, body scroll locking, focus containment/restoration, and Close, Escape, and backdrop dismissal. The existing delete confirmation remains above the manager and Escape dismisses the top dialog first.

Validation: all 40 existing tests passed; production build passed; build checks verified both routes and 116 offline assets. Browser checks confirmed both popup variants, Tab wrapping, restored trigger focus, Close/Escape/backdrop dismissal, and opening/canceling the delete confirmation without deleting any choices. The previous cached runtime updated after the next reload. No client records were changed during verification.

Local preview is running at `http://127.0.0.1:8000/index.html` in server session 64592. Screenshot: `C:/Users/Admin/.codex/visualizations/2026/10/20/01a159ec-cb9d-7583-a131-63c17cdd1f53/product-choice-modal.png`. Committed locally; no push or deployment.
