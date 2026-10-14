---
last_mapped_commit: cfacc02aa0f9800754f6d573e59d04e5a8ba0cf7
last_mapped_at: 2026-10-10
---
<!-- refreshed: 2026-10-10 -->

# Architecture

**Analysis Date:** 2026-10-10

## System Overview

```text
Browser
├── Standalone application: `index.html`
│   ├── Inline HTML views and modal forms
│   ├── Inline JavaScript state, business actions, rendering, and chart setup
│   ├── Dexie → IndexedDB (`ClothesManiaDB`, key `db`)
│   └── localStorage fallback and theme preference
└── Separate React/Vite scaffold: `client/`
    ├── `client/src/main.jsx` mounts `App`
    ├── `client/src/App.jsx` owns a small React state snapshot
    └── Dexie → IndexedDB (`ClothesManiaDB`, key `db`)
```

The root and `client/` are two independent browser frontends. They share an IndexedDB database name and key, but their schemas and behavior are not kept in sync. The root page is the feature-rich prototype; the React app is a minimal shell.

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| Standalone UI and app bootstrap | Defines navigation, dashboard, products, stock, mine orders, ledger, forms, modals, and script entry point | `index.html` |
| Standalone state and persistence | Seeds demo data, loads/saves the `db` snapshot, applies localStorage fallback | `index.html` (`initApp`, `loadFromLocalStorage`, `saveToLocalStorage`, `persistDB`) |
| Standalone views/actions | Mutates the global state and redraws DOM fragments | `index.html` inline script |
| React entry point | Mounts the app inside React StrictMode | `client/src/main.jsx` |
| React scaffold | Holds a basic snapshot, loads/saves via Dexie, and renders placeholder dashboard panels | `client/src/App.jsx` |
| Client build/style configuration | Configures Tailwind/PostCSS and Vite package scripts | `client/tailwind.config.cjs`, `client/postcss.config.cjs`, `client/package.json` |

## Pattern Overview

**Overall:** Two client-only frontends: a single-file, imperative DOM application and an isolated React/Vite scaffold.

**Key Characteristics:**
- The standalone page uses a shared mutable object (`db`) as its in-memory source of truth.
- HTML templates are embedded directly in `index.html`; UI updates replace `innerHTML` in selected containers.
- Persistence writes a full snapshot to browser storage, rather than using a server or normalized remote API.
- React state is local to `App`; it is not a port of the standalone screen or its business logic.

## Layers

**Standalone presentation and behavior:**
- Purpose: Render screens and handle user actions.
- Location: `index.html`.
- Contains: Static markup, Tailwind classes, modal markup, event handlers, calculations, and DOM rendering.
- Depends on: Browser DOM and CDN-provided Dexie/Chart.js/Tailwind assets.
- Used by: The root browser entry point.

**Standalone state and storage:**
- Purpose: Keep inventory, orders, and ledger records in memory and persist them locally.
- Location: Inline script in `index.html`.
- Contains: `db`, seed functions, `loadFromLocalStorage()`, `saveToLocalStorage()`, and `persistDB()`.
- Depends on: IndexedDB through Dexie and localStorage.
- Used by: All standalone action and rendering functions.

**React scaffold:**
- Purpose: Demonstrate a React/Vite route to a dashboard.
- Location: `client/src/`.
- Contains: One root component and a minimal entry point; no extracted domain modules.
- Depends on: React, React DOM, Dexie, Vite, and Tailwind tooling.
- Used by: `client/index.html` and Vite.

## Data Flow

### Standalone startup and persistence

1. Browser loads `index.html` and its CDN scripts.
2. `window.onload` calls `initApp()` (`index.html:1911-1926`).
3. `initApp()` loads the saved snapshot from Dexie first, with localStorage fallback (`index.html:927-952`).
4. Seed helpers derive products and fill demo orders/ledger entries to target counts (`index.html:873-925`).
5. The page writes the resulting state to localStorage and IndexedDB, then calls `refreshAllUI()` and starts the clock (`index.html:1911-1924`).
6. User actions mutate `db`; `saveToLocalStorage()` persists the snapshot and redraws all views (`index.html:954-959`).

### React scaffold

1. Vite serves `client/index.html`, which loads `/src/main.jsx`.
2. `main.jsx` renders `App` in `React.StrictMode`.
3. `App` reads `ClothesManiaDB.kv['db']` once on mount and stores the result in React state.
4. Its demo button appends one sample order and `persist()` updates state and Dexie (`client/src/App.jsx`).
5. The dashboard cards and chart/table panels are currently static placeholders and do not derive values from `dbState`.

**State Management:**
- Standalone: a global mutable `db` object, with re-rendering triggered explicitly after actions.
- React: component-local `useState`; persistence is a whole-object write to Dexie.
- There is no cross-tab synchronization, API, server state, or shared domain layer.

## Key Abstractions

**`db` snapshot:**
- Purpose: Store the standalone prototype's business data in one browser-serializable object.
- Examples: `mines`, `shirts`, `dailyLedger`, and derived `products` in `index.html`.
- Pattern: mutate in place, serialize the whole object to browser storage, then refresh UI.

**`ClothesManiaDB.kv`:**
- Purpose: Persist a keyed object snapshot in IndexedDB.
- Examples: Dexie schema and persistence in `index.html` and `client/src/App.jsx`.
- Pattern: one `db` key in a `kv` table, rather than one row per entity.

## Entry Points

**Standalone page:**
- Location: `index.html`.
- Triggers: Open the root page in a browser or serve it statically.
- Responsibilities: Load dependencies, render the complete prototype, bootstrap data, and attach inline actions.

**React client:**
- Location: `client/index.html` → `client/src/main.jsx`.
- Triggers: `cd client && npm run dev` or the Vite build/preview scripts.
- Responsibilities: Mount the React scaffold.

## Architectural Constraints

- **Threading:** Browser main thread; no workers or server runtime.
- **Global state:** Standalone state and chart instance live in the inline script in `index.html`.
- **Storage coupling:** Both frontends use the same IndexedDB database/key, yet have incompatible completeness and may overwrite each other's whole-object snapshot.
- **Circular imports:** Not applicable; the React client has no module graph beyond `main.jsx` importing `App` and CSS.
- **Deployment:** No backend, authentication boundary, synchronization, or deployment configuration exists.

## Anti-Patterns

### Business logic embedded in a page

**What happens:** Markup, state, calculation, storage, and event handlers share the large `index.html`.
**Why it's wrong:** Changes are difficult to isolate and verify; inline code is not reusable or independently testable.
**Do this instead:** If expanding the app, move domain logic and UI into deliberate modules and test the behavior separately.

### Two competing application implementations

**What happens:** The standalone app and React scaffold independently read/write `ClothesManiaDB.kv['db']`.
**Why it's wrong:** They do not share a schema contract or feature set; a full snapshot write can drop fields unknown to one client.
**Do this instead:** Choose one production frontend or define and test one versioned storage contract before syncing data between them.

## Error Handling

**Strategy:** Local try/catch around IndexedDB and localStorage operations; errors are generally logged or silently ignored.

**Patterns:**
- `persistDB()` and load functions catch Dexie failures and try localStorage where available.
- `saveToLocalStorage()` ignores localStorage exceptions and runs the IndexedDB write asynchronously.
- No user-visible persistence failure state or recovery workflow is implemented.

## Cross-Cutting Concerns

**Logging:** Browser console only.
**Validation:** Primarily HTML form constraints and inline parsing; no shared validation module.
**Authentication:** No authentication; login has been removed from the standalone UI.

---

*Architecture analysis: 2026-10-10*
