---
last_mapped_commit: cfacc02aa0f9800754f6d573e59d04e5a8ba0cf7
last_mapped_at: 2026-10-10
---
# Coding Conventions

**Analysis Date:** 2026-10-10

## Naming Patterns

**Files:**
- Root page uses `index.html`; React source uses lowercase `main.jsx` and PascalCase `App.jsx`.
- Config files follow their tool's standard names (`tailwind.config.cjs`, `postcss.config.cjs`).

**Functions:**
- Standalone helpers use camelCase verbs such as `saveToLocalStorage()`, `renderStockTable()`, and `openNewMineModal()`.
- React local callbacks use camelCase arrow functions.

**Variables:**
- Local and state variables use camelCase; constants include lowercase nouns such as `defaultDB` and `dexie`.
- DOM access is performed by IDs via `document.getElementById()` in the standalone page.

**Types:**
- JavaScript is untyped; no TypeScript declarations or schemas are present.

## Code Style

**Formatting:**
- No formatter configuration is present.
- The standalone script uses four-space indentation; React source uses compact two-space indentation and omits many statement semicolons.
- Preserve the local style within the file being changed until a formatter is adopted.

**Linting:**
- No lint tool or lint script is configured.

## Import Organization

**Order:**
1. React and React DOM imports in `client/src/main.jsx`.
2. App component and CSS import in the entry point.
3. React/Dexie and local asset imports in `client/src/App.jsx`.

**Path Aliases:**
- None detected. Client imports use relative paths.

## Error Handling

**Patterns:**
- Standalone persistence wraps Dexie/localStorage operations in `try/catch`; some errors are logged, some swallowed.
- React `useEffect` and `persist` log Dexie errors through `console.error`.
- There is no shared error type, boundary, notification policy, or retry strategy.

## Logging

**Framework:** `console`.

**Patterns:**
- Log browser persistence failures; do not log routine successful actions.
- Avoid silently swallowing failures for new persistence behavior; surface a clear user-visible recovery path.

## Comments

**When to Comment:**
- Existing comments mark sections and a few implementation decisions in `index.html`.
- Comments are sparse in the React scaffold.

**JSDoc/TSDoc:**
- None detected.

## Function Design

**Size:**
- Standalone functions range from focused formatting helpers to large CRUD/render handlers. Keep new behavior small and named by action.

**Parameters:**
- Functions pass IDs, field names, statuses, or DOM events as plain values.

**Return Values:**
- Mutating handlers often return no value; `quickMineSaveFromModal()` returns a boolean to indicate whether stock validation passed.

## Module Design

**Exports:**
- React app exports `App` as the default export from `client/src/App.jsx`.
- The standalone page uses inline script-level functions rather than ES modules.

**Barrel Files:**
- None.

## Guidance for New Work

- Keep the standalone app and React scaffold behavior explicit; do not assume a feature exists in both.
- Preserve the browser storage schema (`ClothesManiaDB`, key `db`) deliberately and document schema changes because both frontends can touch it.
- Escape or avoid HTML string interpolation for data rendered with `innerHTML`.
- Keep currency formatting centralized in the standalone `formatCurrency()` helper if adding another view there.

---

*Convention analysis: 2026-10-10*
