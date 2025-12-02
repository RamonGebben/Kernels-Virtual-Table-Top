## Kernel Virtual Tabletop

Free, lightweight VTT with two roles: DM and Table. Upload maps or artwork, calibrate grids in seconds, and drive the player view with a live lens—all synced over WebSocket.

## Quick start (Docker)
Run everything with Docker Compose:
```bash
docker compose up -d --build
```
- App: http://localhost:3000
- WebSocket server: ws://localhost:8081
- Data: `./maps`, `./artwork` (gitignored); grid metadata in `maps/metadata.json`

## Highlights
- DM and Table views (Next.js App Router)
- Grid size/color/background configuration with calibration overlay
- Map and artwork upload/list/delete via Next API routes
- Live viewport lens controlling the table view
- Auto-reconnect with connection banner when WebSocket drops
- Playwright E2E, Vitest unit/coverage suites

## Development setup (Node)
Prereqs: Node 20, npm.

Install deps:
```bash
npm ci
```

Start the WebSocket server (in a second terminal):
```bash
cd server
npm install
npm run dev   # WS server on 8081 by default
```

Run the app:
```bash
npm run dev   # http://localhost:3000
```

Optional env:
- `NEXT_PUBLIC_WS_URL` – override ws endpoint (defaults to ws(s)://<host>:8081)
- `NEXT_PUBLIC_WS_PORT` – override default WS port used when building the URL in the browser

## Scripts
- `npm run lint` – eslint
- `npm run test` / `test:watch` – Vitest
- `npm run test:coverage` – Vitest with V8 coverage
- `npm run e2e` / `e2e:headed` / `e2e:ui` – Playwright tests (install browsers first with `npx playwright install --with-deps`)
- `npm run build` / `start` – Next production build/start

## CI
GitHub Actions workflow (`.github/workflows/ci.yml`) runs lint, unit/coverage, then Playwright E2E against a built app on pushes/PRs to main/master.
