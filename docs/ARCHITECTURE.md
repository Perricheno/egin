# EGIN local architecture

## Repository and processes

The supplied workspace was empty; see [AUDIT.md](AUDIT.md). Existing legacy Docker containers and data were not modified. A new pnpm workspace uses Next.js 16 / React 19 / strict TypeScript in `apps/web`. `apps/api` is a single Python 3.12 FastAPI process. PostgreSQL 16 + PostGIS 3.4 is an isolated Docker service with a named persistent volume. No Redis, external auth, managed database, or paid AI service is required.

The browser calls same-origin `/api/*`. Next rewrites to the loopback API. The API exposes Swagger directly. All business logic and authorization live in FastAPI. psycopg's parameterized SQL is used intentionally instead of an ORM: this application is dominated by PostGIS operations and the schema is versioned as transactional SQL. Schema changes use an advisory migration lock. No DB credentials or provider response internals are exposed to browser code.

## Data and access

`users` stores Argon2id hashes; `profiles` stores RU/KK preference, name and onboarding state. Random session tokens are sent only in HttpOnly / SameSite=Lax cookies. Only an HMAC digest is stored in `sessions`. Local HTTP uses `COOKIE_SECURE=false`; HTTPS installations must set it true. Sessions expire in 14 days, logout revokes them. Unsafe cross-origin browser requests are rejected. Login, registration, writes and costly data endpoints have bounded per-process rate limits.

`organizations → organization_members → farms → fields` defines access. Owners, admins and agronomists may write field data. Workers and viewers have read access. Every field read, analysis, geometry version, radius result and assistant tool checks organization membership. Only listing authors may edit, archive or upload images. Conversations require explicit membership, including SSE and history. Admins cannot change owners or grant admin access; owners can add admins. Changes to one's own role are rejected.

## GIS

Fields are valid, nonempty MultiPolygons in EPSG:4326, accepting Polygon input. The API rejects invalid or outside-Kazakhstan polygons and limits coordinate count and area. PostGIS geography computes hectares. Triggers calculate centroid, pick the largest overlapping region/district using `ST_Intersection`, and write geometry snapshots atomically. Revision checks reject conflicting saves. Point lookup uses `ST_Contains`. Radius queries use indexed `ST_DWithin(...::geography)`; all large-area calculations stay on the server. Tests also validate transformations to EPSG:3857.

HDX UNHCR 2023 ADM0/ADM1/ADM2 is loaded from a checksum-recorded archive. Polygons are repaired on import only, never silently repaired on farmer save. Administrative GeoJSON is filtered by viewport/level and simplified according to viewport size. GIST indexes cover boundaries, fields and marketplace locations.

MapLibre is loaded only when a map is rendered. Terra Draw's official MapLibre adapter handles polygon drawing, selection, vertex/midpoint editing, movement and undo. OSM raster tiles require internet; saved polygons, areas, backend queries and the neutral map background do not depend on geocoding.

## Providers and analysis

Provider protocols separate Open-Meteo, SoilGrids, OpenLandMap COG range reads, NASA POWER and Nominatim from endpoints. PostgreSQL caches are independent of the API process: forecast 30 minutes; soil and climate 30 days; geocoder 7 days. Requests for the same normalized point are deduplicated. The UI displays fresh/cached/stale/unavailable, source and fetch timestamp. Failed calls use the last cached record, never invented measurements. Short negative caching limits repeat failures. SoilGrids is capped at 5 upstream calls/minute; Nominatim is serialized at <=1 request/second, only after explicit search submission.

A field analysis concurrently gathers actual forecast, topsoil and historical May–August climate features, then executes the saved ExtraTrees model only when all required features exist. The result and exact features are saved in `ml_runs` with field revision and model version. Missing data produces `insufficient_data`; no hidden feature imputation. Weather risks are transparent threshold rules, explicitly distinguished from ML. See [ML.md](ML.md).

The structured assistant dispatches to internal data tools: fields, weather, soil, field analysis, nearby marketplace and personalized news. Questions and tool-backed answers persist. It is not a free-form LLM. Optional LLM configuration is reserved, but no external model is silently called.

## Community and marketplace

Chat persists a message before publishing a wakeup. Client UUIDs make retries idempotent. PostgreSQL is the durable replay source; SSE resumes after message ID, rechecks authorization, and emits heartbeats. The local broker only accelerates delivery; after restart history remains. A multi-worker deployment must replace the wakeup broker with LISTEN/NOTIFY or Redis; this local setup runs one worker. Message-read watermarks support unread counts without a row for every recipient/message.

One listings table handles products, machinery rental, services and jobs. Images are validated by Pillow's decoder, bounded by size and resolution, stripped of metadata by re-encoding and resized to 1600px JPEG. Generated filenames prevent path traversal. A StorageAdapter hides local disk storage. Listings are archived, favorites are user-scoped. There is no payment integration.

RSS ingestion is optional and timeout-bounded. Known feed failures are explicit; labeled demonstration articles remain usable. Region/crop/topic intersections produce simple personalization scores. Dashboard aggregates only authorized database records.

## Local operation

`pnpm dev:all` generates private local secrets, chooses ports, downloads boundaries, builds Docker services, applies migrations and seed, trains a model if absent, starts Next and checks both HTTP services. `pnpm stop` preserves data. Frontend logs and PID metadata are in ignored `.runtime/`. Backend integration tests create and destroy a separate uniquely named database; they never reset the user's database. Browser tests exercise the running local instance and mark records with an E2E prefix.

## Verified integration details

MapLibre 6's module worker and sibling shared module are copied from the installed BSD-licensed package into ignored `public/vendor/` assets by `scripts/copy-map-worker.mjs`; the launcher, prebuild and predev hooks run this step. The map explicitly sets the worker URL. Drawing initializes on `style.load`, independently of remote base-tile completion. Container sizing overrides MapLibre's relative-position default. Imported Terra Draw features receive UUIDs compatible with its default ID strategy.

The local Next proxy allows 120 seconds for a bounded cold environmental request. Response compression is disabled so SSE bytes arrive immediately instead of accumulating in a gzip buffer. Browser fetches still have a 90-second limit; provider-specific deadlines are shorter.

Boundary import reads the source `.prj` and transforms HDX Web Mercator coordinates from EPSG:3857 into EPSG:4326. Migration 002 repairs the initial coordinate-labeling defect and refreshes administrative associations without rewriting field geometry history. Integration tests initialize a separate database and explicitly reject any connection pool pointing at the main database.
