---
last_mapped_commit: cfacc02aa0f9800754f6d573e59d04e5a8ba0cf7
last_mapped_at: 2026-10-10
---
# Codebase Structure

**Analysis Date:** 2026-10-10

## Directory Layout

```text
clothesmaniadavao/
├── index.html                 # Feature-rich standalone POS prototype
├── README.md                  # Root setup notes (currently describes a missing root npm script)
├── package-lock.json          # Root lockfile; root package.json is absent
├── images/                    # Images and brand assets for the standalone page
├── node_modules/              # Present in workspace; generated dependencies, not application source
├── client/
│   ├── index.html              # Vite document shell
│   ├── package.json            # React/Vite dependencies and scripts
│   ├── src/
│   │   ├── main.jsx            # React mount point
│   │   ├── App.jsx              # Minimal dashboard scaffold and Dexie state
│   │   └── index.css            # Tailwind directives and base styles
│   ├── public/                 # Client brand assets
│   ├── README.md               # Client-specific setup notes
│   ├── tailwind.config.cjs      # Tailwind scan paths and theme
│   └── postcss.config.cjs       # Tailwind and Autoprefixer plugins
└── .planning/codebase/         # GSD-generated codebase maps
```

## Directory Purposes

**Repository root:**
- Purpose: Houses the standalone prototype and primary README.
- Contains: `index.html`, `images/`, npm lockfile, and the separate `client/` project.
- Key files: `index.html`, `README.md`.

**`images/`:**
- Purpose: Brand and sample media for the root page.
- Contains: `profile.jpg`, `logo.svg`, `logo-full.svg`, `image.png`, `coverimage.jpg`.

**`client/`:**
- Purpose: Independent React/Vite scaffold.
- Contains: App source, public assets, package scripts, and styling/build configuration.
- Key files: `client/src/App.jsx`, `client/src/main.jsx`, `client/package.json`.

**`client/public/`:**
- Purpose: Static client brand assets.
- Contains: `logo.svg` and `logo-full.svg`.

**`client/src/`:**
- Purpose: React source and global CSS.
- Contains: one app component, entry point, and Tailwind CSS directives.

**`.planning/codebase/`:**
- Purpose: GSD architecture and maintenance reference documents.
- Contains: `STACK.md`, `INTEGRATIONS.md`, `ARCHITECTURE.md`, `STRUCTURE.md`, `CONVENTIONS.md`, `TESTING.md`, and `CONCERNS.md`.

## Key File Locations

**Entry Points:**
- `index.html`: Root standalone app, including all markup and inline application script.
- `client/index.html`: Vite HTML shell.
- `client/src/main.jsx`: Mounts React `App` at `#root`.

**Configuration:**
- `client/package.json`: Client scripts and dependencies.
- `client/tailwind.config.cjs`: Tailwind content paths and theme.
- `client/postcss.config.cjs`: PostCSS plugins.
- Root `package-lock.json`: npm lock data without a corresponding root manifest.

**Core Logic:**
- `index.html`: Standalone data model, storage helpers, calculations, renderers, and CRUD actions.
- `client/src/App.jsx`: React scaffold state, Dexie setup, demo action, and placeholder dashboard.

**Testing:**
- No test directory or test files are present.

## Naming Conventions

**Files:**
- Standalone app uses one lowercase HTML filename (`index.html`).
- React components use PascalCase component names in `.jsx` (`App.jsx`); utility/config files are lowercase.
- Configuration files use tool-specific names and `.cjs` extensions.

**Directories:**
- Frontend source is grouped under `client/src/`; static assets use `images/` and `client/public/`.
- GSD maps use uppercase document filenames in `.planning/codebase/`.

## Where to Add New Code

**Changes to the existing standalone prototype:**
- UI and event behavior: `index.html` (currently the only implementation file).
- Brand assets: `images/`.
- Add a browser-level test location only after choosing a test runner; none exists today.

**Changes to the React client:**
- Components and app behavior: `client/src/`.
- Global styles: `client/src/index.css`.
- Static assets: `client/public/`.
- Client package dependencies/scripts: `client/package.json`.

**Shared utilities:**
- No shared module directory exists. Avoid placing shared source in either frontend until the package boundary and storage contract are made explicit.

## Special Directories

**`node_modules/`:**
- Purpose: Installed npm packages visible in the working tree.
- Generated: Yes.
- Committed: Not tracked by Git in the current workspace state.

**`.planning/codebase/`:**
- Purpose: GSD-generated reference docs.
- Generated: Yes, by the mapping workflow.
- Committed: Git status should be reviewed before deciding to include generated docs.

---

*Structure analysis: 2026-10-10*
