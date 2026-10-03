# Run EGIN locally

## Prerequisites

Linux/macOS with Node.js 20.9+ (verified on 22), npm, Python 3 (standard library for the HDX downloader), Docker Engine and Docker Compose. Allow roughly 3 GB disk space for dependencies, API image and boundary cache; 4 GB free RAM is more comfortable for building, but the verified machine used swap. Ports bind to loopback. The API runs Python 3.12 inside Docker, independently of host Python.

## Start from a clone

From the repository root:

```sh
npx --yes pnpm@10.32.1 dev:all
```

With pnpm already installed, use `pnpm dev:all`. No manual secret editing is required. First run needs internet for packages, the Docker base image and the 5.1 MB public Kazakhstan boundary archive. Later runs reuse installed packages, image layers and the boundary archive. Live weather, soil, climate, map tiles and geocoding still require provider availability; their existing caches remain usable offline.

The launcher:

1. Creates ignored `.env` with random local DB password and session secret, permissions 0600.
2. Finds free web/API/database ports, preferring 3000 / 8000 / 55432. Existing legacy EGIN containers on 5432 and 6379 are untouched.
3. Installs workspace dependencies if absent; downloads/verifies the HDX archive with resumable bounded range requests.
4. Runs `docker compose up -d` (builds the API image when absent) with an isolated `egin-local-mvp` project and `egin_data` volume.
5. Applies migrations, imports boundaries, runs idempotent seed and trains the demonstration model if no artifact exists.
6. Starts Next as a persistent local process, records PID/port in `.runtime/web.json` and logs to `.runtime/web.log`.
7. Checks HTTP responses and prints exact web/API/Swagger URLs.

Prefer the printed URLs if standard ports are occupied. API Swagger is at `http://localhost:<API_PORT>/docs`. The web proxy uses `/api/*` and same-origin cookies.

Demo sign-in:

```
email: demo@egin.local
password: EginDemo2026!
```

Additional seeded accounts: `aliya@egin.local` and `serik@egin.local`, same demo-only password. New registrations require no email confirmation. Onboarding creates an owned organization/farm; then draw the first field. A demo user's seeded polygons are illustrative field shapes, not cadastral property boundaries.

## Stop and restart

```sh
pnpm stop
pnpm dev:all
```

`stop` preserves the database volume, uploads, boundary archive and ML artifact. Do not run `docker compose down -v` unless you intentionally want to erase this MVP database. Do not modify the unrelated older `egin-postgres` volume.

To use an already built production frontend, stop only its recorded process, then run `node scripts/dev-all.mjs --production`. `pnpm build` must finish first. Never run `next build` and `next dev` in the same `.next` directory concurrently.

## Useful commands

```sh
pnpm db:migrate
pnpm db:seed
pnpm ml:train
pnpm lint
pnpm typecheck
pnpm build
pnpm test:api
pnpm test:e2e
docker compose logs --tail=100 api
docker compose exec -T api python -m app.news
```

After Python code changes, `docker compose restart api`. Source is bind mounted; dependencies change only on image rebuild (`node scripts/dev-all.mjs --rebuild`). After retraining, restart API to load the new trusted artifact. Seed is idempotent and does not overwrite accounts or cache invented external data.

Backend tests create a uniquely named isolated database, migrate/import/seed it, and drop only that test database afterward. They verify fresh migration, auth, access controls, real PostGIS calculations, history/concurrency, images, chat retry persistence, local inference and cache outage behavior. Browser tests target the running app, create E2E-prefixed users/fields/messages and archive the test marketplace listing. Chrome defaults to `/opt/google/chrome/chrome`; set `CHROME_PATH` for another Chromium executable. Set `EGIN_WEB_URL` if using a nonstandard web port.

## Data, credentials and backups

- PostgreSQL: named volume `egin-local-mvp_egin_data`.
- Uploads: `uploads/` on host, bound into API.
- Model: `artifacts/crop-suitability.joblib` and metadata.
- Provider caches: PostgreSQL tables, surviving API restarts.
- Local secrets: `.env`, never committed or included in frontend bundles.
- Source data provenance: `data/boundaries-source.json` and public STAC metadata.

Backup with `docker compose exec -T db pg_dump -U egin -d egin > egin-backup.sql` and archive `uploads/`. Treat backups as private farm/user data. For HTTPS deployment set `COOKIE_SECURE=true`, configure exact origins, change the demo credentials and review provider terms. This command is intended for localhost, not public deployment.

## Package network recovery

A development-only offline wheelhouse can be prepared with `python3 scripts/fetch_python_wheels.py` (requires the host Python `packaging` module). It resolves the locked package versions from official PyPI metadata, downloads compatible wheels with resumable ranges, and verifies SHA256. This was used because this machine's network intermittently returned empty package indexes. Normal clean Docker builds use `requirements.lock` online; local `.wheelhouse/*.whl` files, when present, permit offline installation. Neither path changes the application API.

## Known boundaries

- Administrative data version is UNHCR 2023; source vintage is displayed.
- The interface is Russian; Kazakh profile preference, font glyphs and available boundary/crop names are stored. Full KK translation is not complete.
- ML is a technically real, reproducible DEMO_SYNTHETIC model, not validated field suitability.
- The assistant is a structured tool interface, not a free-form language model.
- News RSS is optional; labeled demo material remains when feeds cannot be reached.
- Map tiles, fresh environmental data and geocoding need internet. If no real cache exists and all relevant providers fail, the UI shows unavailable and ML does not invent missing features.
- The SSE broker assumes one API process. There is no payment system, email delivery, production recovery service or satellite model.
