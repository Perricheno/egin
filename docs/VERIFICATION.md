# Local verification — 2026-10-03

Verified on this Linux workstation with Node 22, Docker, Python 3.12 in the API container, and system Chrome. Running URLs: web http://localhost:3000, API http://localhost:8000, Swagger http://localhost:8000/docs. PostgreSQL/PostGIS is loopback-only on 55432. The unrelated older containers were not modified.

- `pnpm lint`: passed without application warnings. Generated third-party MapLibre distribution assets are excluded.
- `pnpm typecheck`: passed with strict TypeScript.
- `pnpm build`: passed, production Next server running.
- `pnpm test:api`: 12 passed in an isolated disposable database; fresh migrations/import/seed, password sessions, origin checks, authorization, PostGIS area/location/radius, invalid polygon rejection, geometry history and revision conflicts, marketplace CRUD/images/favorites, durable idempotent chat, ML inference, cache outage behavior and soil-unit conversion. The fixture refuses a pool pointing outside its test database.
- `pnpm test:e2e`: 4 passed in Chrome: desktop core flow; mobile registration/onboarding/draw/save/reload; vertex drag/undo/revision/history; cross-session SSE delivery and reload persistence.
- Seven critical routes were checked at 390 px with no horizontal page overflow or JavaScript/worker errors. Desktop map and mobile field screenshots were visually inspected; the saved polygon is visible in the normal mobile viewport.
- A database and API restart preserved field, conversation and listing IDs, sent messages and saved ML results. The top-level production launcher was executed successfully again after restart.
- `/health`, `/login` and `/docs`: HTTP 200. PostGIS 3.4 active; 239 administrative boundaries; local model loaded.
- Real Open-Meteo, SoilGrids and NASA POWER payloads were fetched and cached. The northern demo field produced local model inference from those inputs. AgroInfo RSS imported 20 linked articles. OpenLandMap COG fallback hit its bounded timeout; a successful fallback sample is not claimed.

Nonblocking test-library notices: Starlette deprecates its current httpx TestClient adapter in favor of httpx2; Playwright reports inherited NO_COLOR/FORCE_COLOR overlap. Neither is a runtime application error.

Ignored `.runtime/` contains verification logs and screenshots. Browser tests create explicitly named E2E records; their marketplace listings are archived and vertex-edit fixtures are deleted. Environmental-source availability is not mocked in browser verification. DEMO_SYNTHETIC model scores do not establish agronomic accuracy.
