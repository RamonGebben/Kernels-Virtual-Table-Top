# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# App (Next.js, port 3000)
npm run dev

# WebSocket server (port 8081) — must run alongside the app
cd server && npm install && npm run dev

# Lint, test, coverage
npm run lint
npm run test
npm run test:coverage

# Single test file
npx jest src/path/to/file.test.ts

# E2E (requires browsers installed first)
npx playwright install --with-deps
npm run e2e

# Docker (runs both services)
docker compose up -d --build
```

## Architecture

### Two-process setup
The app requires both processes running simultaneously:
- **Next.js app** (`src/`) — serves the UI at port 3000
- **WebSocket server** (`server/src/index.ts`) — runs at port 8081, holds session state in memory

The WS URL is resolved at runtime: `ws://<hostname>:<WS_PORT>` where port comes from `window.__KERNEL_ENV__.WS_PORT`, `NEXT_PUBLIC_WS_PORT`, or defaults to `8081`.

### Shared types (`types/`)
- `messages.ts` — all WebSocket message contracts (`ClientToServerMessage`, `ServerToClientMessage`)
- `session.ts` — `SessionState` shape, `DEFAULT_SESSION`, and all sub-types (`FogState`, `FogStroke`, `ImprovedInitiativeSettings`, etc.)

Both the server and client import from `types/`. The server uses `.js` extensions in imports (ESM); the client omits them.

### Session flow
1. Client connects → sends `client-connected` + `request-session`
2. Server responds with `session-state` (full snapshot)
3. DM sends mutations (e.g. `viewport-change`, `fog-update`, `map-change`) → server updates in-memory state and broadcasts to all other clients
4. All state changes are **optimistically applied locally** before the WS send, so the DM sees instant feedback

### `useSessionState` hook (`src/hooks/useSessionState.ts`)
The central hook used by both `/dm` and `/table` pages. It:
- Manages the WS connection with heartbeat/reconnect logic (ping every 5s, stale after 10s, reconnect after 500ms)
- Exposes the current `session: SessionState` and typed `send*` helpers
- Exposes `connectionLost: boolean` (debounced 300ms) for the toast banner

### `ViewportCanvas` (`src/components/canvas/ViewportCanvas.tsx`)
Pure canvas renderer — avoids React re-renders on every frame by keeping mutable state in refs and only syncing props via `useEffect`. Handles:
- Map image loading and fit-to-canvas centering on load
- Grid drawing
- Fog of war: maintains a `fogMaskRef` offscreen canvas, rebuilds it when `fogDirtyRef` is set, composites with `destination-out` for reveal strokes
- Calibration overlay (dashed rect + dots)
- Red lens rectangle (the DM's view of the Table viewport)
- Three pointer drag modes: `'dm'` (pan map), `'lens'` (drag the lens rect), `'fog'` (paint fog strokes)

### Fog of War
`applyFogUpdate` in `src/lib/fogState.ts` is a shared pure reducer used by both the server and client to apply `FogUpdate` variants: `toggle`, `stroke`, `reset`, `set-opacity`. Fog state resets whenever a map changes.

### DM panel system
`src/app/dm/page.tsx` renders a vertical rail of icon buttons; clicking one opens a sliding drawer. The active panel key (`'maps' | 'artwork' | 'fog' | 'initiative' | 'settings' | null`) is stored in a Jotai atom (`activePanelAtom`). The `Panel` component (`src/components/panels/index.tsx`) renders the correct sub-panel based on the key.

### Map metadata persistence
`src/lib/mapMetadata.ts` reads/writes `maps/metadata.json` to persist per-map grid settings across server restarts. The server calls `getGridForMap`/`setGridForMap` on map changes.

### Data directories
`maps/`, `artwork/`, and `maps/metadata.json` are gitignored. The API routes at `src/app/api/maps/` and `src/app/api/artwork/` serve files from these directories.
