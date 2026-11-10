# roshan-rozgar-quadcore

Roshan Rozgar — voice-first, hyperlocal marketplace connecting households with nearby tradespeople.

## Structure

- `frontend/` — React (Vite + TypeScript). All web (1440×900) and mobile (390×844) design screens with click-through flows.
  - `src/screens/` — generated screen components (`npm run gen` regenerates from `raw/capture`)
  - `src/flows.ts` — which button leads to which screen
- `backend/` — Node.js (Express) API. Currently exposes `GET /api/health`.

## Run

```bash
npm --prefix frontend install && npm --prefix frontend run dev   # http://localhost:5173
npm --prefix backend install && npm --prefix backend run dev     # http://localhost:4000
```
