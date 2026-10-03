# EGIN.KZ

A locally running, mobile-first agricultural workspace for Kazakhstan. Next.js 16, React 19, TypeScript, FastAPI, PostgreSQL and PostGIS. Built in the supplied empty workspace; the older Docker database remains untouched. See [repository audit](docs/AUDIT.md).

Includes local accounts, farms and roles, MapLibre / Terra Draw field editing, PostGIS areas and geometry history, real weather and soil adapters, saved field analysis, a local demonstration ML model, a structured field-data assistant, persistent SSE chat, marketplace CRUD with photos, personalized news and authorized farm analytics.

```sh
npx --yes pnpm@10.32.1 dev:all
```

Requires Node >=20.9, Python 3 with standard library, and Docker Compose. The command installs missing JS dependencies, generates local secrets, downloads HDX boundaries, starts the isolated database and API, migrates/seeds/trains, starts the web process and checks HTTP readiness. Ports are discovered and printed. Existing applications are not stopped.

Demo account: **demo@egin.local / EginDemo2026!**. Demo people, farms, polygons, marketplace offers and educational articles are marked or documented as demonstration data. Weather/soil/climate values come from external providers. **Crop recommendations use DEMO_SYNTHETIC training data; they are not validated agronomic advice.**

- [Local setup and operations](README_LOCAL.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Data sources](docs/DATA_SOURCES.md)
- [Third-party review](docs/THIRD_PARTY.md)
- [ML model and limitations](docs/ML.md)

## Workspace

```
apps/web/       Next.js UI and browser E2E tests
apps/api/       FastAPI, providers, auth, GIS, chat, market, tests
packages/db/    transactional SQL migrations
scripts/        lifecycle, HDX download, ML training
artifacts/      generated model and metadata
data/           source metadata and ignored cached downloads
docs/           audit, architecture, provenance
```

All data-bearing Docker volumes and uploaded files survive a restart. `pnpm stop` stops services without deleting them. This is a local MVP; see the documented provider, language, administrative-boundary and model limitations before using it operationally.

Проверки и реальные ограничения: [docs/VERIFICATION.md](docs/VERIFICATION.md).
