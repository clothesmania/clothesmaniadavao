<!-- GSD:project-start source:PROJECT.md -->

## Project

**Clothes Mania Davao POS**

Clothes Mania Davao POS is a fast, offline-first point-of-sale and inventory app for a live-selling clothing business. It is designed for one admin/host working on one primary device, with local data storage, quick order entry, payment tracking, and removable-media backups; optional secure cloud backup may provide disaster recovery without making internet access a runtime dependency.

**Core Value:** The host can reliably record every mine, payment, and stock change at live-selling speed—even when the internet is unavailable—and recover the business records if the device is lost.

### Constraints

- **Offline operation**: Core workflows and required application assets must work without an internet connection — live-stream selling cannot depend on connectivity.
- **Local-first storage**: The primary working copy remains on the user's device; any cloud copy is optional backup and must not become a requirement to operate.
- **Single operator/device**: Optimize for one admin/host and a fast laptop/tablet workflow; no concurrent editing or conflict resolution in the initial scope.
- **Data safety**: Backups and restore must preserve products, inventory, orders, payment history, cancellations, refunds, and identifiers; restore must avoid silently replacing current data.
- **Sensitive records**: Customer and payment-reference data are stored locally and in any optional backup; access, encryption, and backup-key recovery need deliberate design.
- **Existing codebase**: Preserve useful behavior while resolving the competing root and React implementations and their incompatible shared storage schema.

<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->

## Technology Stack

## Languages

- JavaScript (browser ES6+) embedded in the root `index.html`.
- JavaScript with JSX in `client/src/main.jsx` and `client/src/App.jsx`.
- HTML and CSS/Tailwind utility classes in both frontend entry points.
- JSON for npm manifests and lockfiles.
- CommonJS for `client/tailwind.config.cjs` and `client/postcss.config.cjs`.

## Runtime

- Modern browser with JavaScript, DOM, IndexedDB, and localStorage support.
- Node.js and npm are needed for the Vite client and optional local static server.
- npm.
- Root `package-lock.json` uses lockfile version 3, but the matching root `package.json` is absent.
- `client/package.json` declares the React app dependencies; no `client/package-lock.json` is present.

## Frameworks

- React 18.2 and React DOM 18.2 in the Vite client (`client/package.json`).
- Vite 5 for client development and production builds.
- Tailwind CSS 3.6.5 in the React client; the standalone page loads Tailwind from its CDN.
- No test runner, test files, or test scripts detected.
- Vite dev server, build, and preview scripts are defined in `client/package.json`.
- Root `README.md` documents `npm run start`, but no root manifest defines that script.
- Root lockfile and checked-in `node_modules/` suggest an earlier http-server setup; verify before relying on it.

## Key Dependencies

- `dexie` `^3.2.2` in the React client and Dexie 3.2.2 from unpkg in the standalone page provide IndexedDB access.
- React and React DOM render the scaffold at `client/src/main.jsx`.
- Tailwind CSS, PostCSS, and Autoprefixer build client styling.
- Vite provides client dev/build/preview commands.
- Tailwind CSS CDN, Chart.js, Dexie 3.2.2, Google Fonts, and Font Awesome 6.4.0.

## Configuration

- No `.env` files or runtime environment variables detected.
- Standalone UI configures Tailwind inline in `index.html`.
- Client styling is configured by `client/tailwind.config.cjs`, `client/postcss.config.cjs`, and `client/src/index.css`.
- Vite defaults are used; no `vite.config.*` is present.
- No TypeScript, lint, formatter, or CI configuration detected.

## Platform Requirements

- A modern browser; internet access is required for the standalone page's CDN-hosted libraries and fonts.
- Node.js/npm for the React client (`cd client`, `npm install`, `npm run dev`).
- No deployment target or hosting configuration is present.
- The standalone page can be served as static files, but it has no server-side persistence or shared database.

<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->

## Conventions

## Naming Patterns

- Root page uses `index.html`; React source uses lowercase `main.jsx` and PascalCase `App.jsx`.
- Config files follow their tool's standard names (`tailwind.config.cjs`, `postcss.config.cjs`).
- Standalone helpers use camelCase verbs such as `saveToLocalStorage()`, `renderStockTable()`, and `openNewMineModal()`.
- React local callbacks use camelCase arrow functions.
- Local and state variables use camelCase; constants include lowercase nouns such as `defaultDB` and `dexie`.
- DOM access is performed by IDs via `document.getElementById()` in the standalone page.
- JavaScript is untyped; no TypeScript declarations or schemas are present.

## Code Style

- No formatter configuration is present.
- The standalone script uses four-space indentation; React source uses compact two-space indentation and omits many statement semicolons.
- Preserve the local style within the file being changed until a formatter is adopted.
- No lint tool or lint script is configured.

## Import Organization

- None detected. Client imports use relative paths.

## Error Handling

- Standalone persistence wraps Dexie/localStorage operations in `try/catch`; some errors are logged, some swallowed.
- React `useEffect` and `persist` log Dexie errors through `console.error`.
- There is no shared error type, boundary, notification policy, or retry strategy.

## Logging

- Log browser persistence failures; do not log routine successful actions.
- Avoid silently swallowing failures for new persistence behavior; surface a clear user-visible recovery path.

## Comments

- Existing comments mark sections and a few implementation decisions in `index.html`.
- Comments are sparse in the React scaffold.
- None detected.

## Function Design

- Standalone functions range from focused formatting helpers to large CRUD/render handlers. Keep new behavior small and named by action.
- Functions pass IDs, field names, statuses, or DOM events as plain values.
- Mutating handlers often return no value; `quickMineSaveFromModal()` returns a boolean to indicate whether stock validation passed.

## Module Design

- React app exports `App` as the default export from `client/src/App.jsx`.
- The standalone page uses inline script-level functions rather than ES modules.
- None.

## Guidance for New Work

- Keep the standalone app and React scaffold behavior explicit; do not assume a feature exists in both.
- Preserve the browser storage schema (`ClothesManiaDB`, key `db`) deliberately and document schema changes because both frontends can touch it.
- Escape or avoid HTML string interpolation for data rendered with `innerHTML`.
- Keep currency formatting centralized in the standalone `formatCurrency()` helper if adding another view there.

<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->

## Architecture

## System Overview

```text

```

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

- The standalone page uses a shared mutable object (`db`) as its in-memory source of truth.
- HTML templates are embedded directly in `index.html`; UI updates replace `innerHTML` in selected containers.
- Persistence writes a full snapshot to browser storage, rather than using a server or normalized remote API.
- React state is local to `App`; it is not a port of the standalone screen or its business logic.

## Layers

- Purpose: Render screens and handle user actions.
- Location: `index.html`.
- Contains: Static markup, Tailwind classes, modal markup, event handlers, calculations, and DOM rendering.
- Depends on: Browser DOM and CDN-provided Dexie/Chart.js/Tailwind assets.
- Used by: The root browser entry point.
- Purpose: Keep inventory, orders, and ledger records in memory and persist them locally.
- Location: Inline script in `index.html`.
- Contains: `db`, seed functions, `loadFromLocalStorage()`, `saveToLocalStorage()`, and `persistDB()`.
- Depends on: IndexedDB through Dexie and localStorage.
- Used by: All standalone action and rendering functions.
- Purpose: Demonstrate a React/Vite route to a dashboard.
- Location: `client/src/`.
- Contains: One root component and a minimal entry point; no extracted domain modules.
- Depends on: React, React DOM, Dexie, Vite, and Tailwind tooling.
- Used by: `client/index.html` and Vite.

## Data Flow

### Standalone startup and persistence

### React scaffold

- Standalone: a global mutable `db` object, with re-rendering triggered explicitly after actions.
- React: component-local `useState`; persistence is a whole-object write to Dexie.
- There is no cross-tab synchronization, API, server state, or shared domain layer.

## Key Abstractions

- Purpose: Store the standalone prototype's business data in one browser-serializable object.
- Examples: `mines`, `shirts`, `dailyLedger`, and derived `products` in `index.html`.
- Pattern: mutate in place, serialize the whole object to browser storage, then refresh UI.
- Purpose: Persist a keyed object snapshot in IndexedDB.
- Examples: Dexie schema and persistence in `index.html` and `client/src/App.jsx`.
- Pattern: one `db` key in a `kv` table, rather than one row per entity.

## Entry Points

- Location: `index.html`.
- Triggers: Open the root page in a browser or serve it statically.
- Responsibilities: Load dependencies, render the complete prototype, bootstrap data, and attach inline actions.
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

### Two competing application implementations

## Error Handling

- `persistDB()` and load functions catch Dexie failures and try localStorage where available.
- `saveToLocalStorage()` ignores localStorage exceptions and runs the IndexedDB write asynchronously.
- No user-visible persistence failure state or recovery workflow is implemented.

## Cross-Cutting Concerns

<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->

## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->

## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `$gsd-fast` for a trivial task inline, with no subagents and no PLAN.md
- `$gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `$gsd-debug` for investigation and bug fixing
- `$gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->

## Developer Profile

> Profile not yet configured. Run `$gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
