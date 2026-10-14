---
last_mapped_commit: cfacc02aa0f9800754f6d573e59d04e5a8ba0cf7
last_mapped_at: 2026-10-10
---
# Technology Stack

**Analysis Date:** 2026-10-10

## Languages

**Primary:**
- JavaScript (browser ES6+) embedded in the root `index.html`.
- JavaScript with JSX in `client/src/main.jsx` and `client/src/App.jsx`.
- HTML and CSS/Tailwind utility classes in both frontend entry points.

**Secondary:**
- JSON for npm manifests and lockfiles.
- CommonJS for `client/tailwind.config.cjs` and `client/postcss.config.cjs`.

## Runtime

**Environment:**
- Modern browser with JavaScript, DOM, IndexedDB, and localStorage support.
- Node.js and npm are needed for the Vite client and optional local static server.

**Package Manager:**
- npm.
- Root `package-lock.json` uses lockfile version 3, but the matching root `package.json` is absent.
- `client/package.json` declares the React app dependencies; no `client/package-lock.json` is present.

## Frameworks

**Core:**
- React 18.2 and React DOM 18.2 in the Vite client (`client/package.json`).
- Vite 5 for client development and production builds.
- Tailwind CSS 3.6.5 in the React client; the standalone page loads Tailwind from its CDN.

**Testing:**
- No test runner, test files, or test scripts detected.

**Build/Dev:**
- Vite dev server, build, and preview scripts are defined in `client/package.json`.
- Root `README.md` documents `npm run start`, but no root manifest defines that script.
- Root lockfile and checked-in `node_modules/` suggest an earlier http-server setup; verify before relying on it.

## Key Dependencies

**Critical:**
- `dexie` `^3.2.2` in the React client and Dexie 3.2.2 from unpkg in the standalone page provide IndexedDB access.
- React and React DOM render the scaffold at `client/src/main.jsx`.
- Tailwind CSS, PostCSS, and Autoprefixer build client styling.
- Vite provides client dev/build/preview commands.

**Browser CDN dependencies in `index.html`:**
- Tailwind CSS CDN, Chart.js, Dexie 3.2.2, Google Fonts, and Font Awesome 6.4.0.

## Configuration

**Environment:**
- No `.env` files or runtime environment variables detected.
- Standalone UI configures Tailwind inline in `index.html`.
- Client styling is configured by `client/tailwind.config.cjs`, `client/postcss.config.cjs`, and `client/src/index.css`.

**Build:**
- Vite defaults are used; no `vite.config.*` is present.
- No TypeScript, lint, formatter, or CI configuration detected.

## Platform Requirements

**Development:**
- A modern browser; internet access is required for the standalone page's CDN-hosted libraries and fonts.
- Node.js/npm for the React client (`cd client`, `npm install`, `npm run dev`).

**Production:**
- No deployment target or hosting configuration is present.
- The standalone page can be served as static files, but it has no server-side persistence or shared database.

---

*Stack analysis: 2026-10-10*
