# Clothes Mania Davao — Local Development

Run the app locally with Node (uses `http-server` via `npx`):

```bash
npm run start
```

Then open: http://localhost:8000/index.html

Notes:
- This project is a single-file SPA (`index.html`).
- Uses CDN-hosted libs (Tailwind, Dexie, Chart.js). Online access required for CDNs.
- If you prefer a permanent dependency, run `npm i http-server --save-dev`.