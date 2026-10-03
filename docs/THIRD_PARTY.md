# Third-party review

Checked against repository metadata and README on 2026-10-03. Full responses: `reference-audit.json`; npm and Python package audits are adjacent. `pushed_at` is activity evidence, not a guarantee of maintenance. Unknown licenses are never treated as permission to copy. No reference application was cloned into EGIN.

| Project | License reviewed | Last push | Decision / adaptation |
|---|---|---|---|
| [maplibre/maplibre-gl-js](https://github.com/maplibre/maplibre-gl-js) | BSD-3-Clause (LICENSE.txt; npm metadata) | 2026-10-02 | Used as installed library for map rendering. No copied application code. |
| [JamesLMilner/terra-draw](https://github.com/JamesLMilner/terra-draw) | MIT | 2026-10-03 | Used with official MapLibre adapter. Library modes handle drawing/selection, vertex editing, drag and undo. |
| [opengeos/maplibre-gl-geo-editor](https://github.com/opengeos/maplibre-gl-geo-editor) | MIT | 2026-09-16 | Evaluated; redundant editor layer not added because Terra Draw covers required operations. |
| [maplibre/maplibre-gl-geocoder](https://github.com/maplibre/maplibre-gl-geocoder) | ISC | 2026-10-03 | Provider separation pattern evaluated; small native search UI with backend Nominatim cache avoids extra plugin. |
| [supabase/supabase](https://github.com/supabase/supabase) | Apache-2.0 (repository) | 2026-10-02 | Slack-clone reference only: channel list, history, unread indicators. No runtime dependency or code copied. |
| [alexkuznecov16/webtalk](https://github.com/alexkuznecov16/webtalk) | No license declared in repository metadata | 2026-03-22 | Conceptual chat UI reference only. No source copied. |
| [Longhorn-Developers/UT-Marketplace](https://github.com/Longhorn-Developers/UT-Marketplace) | MIT | 2026-04-03 | Marketplace category/filter/detail patterns reviewed. EGIN CRUD, storage and auth written independently. |
| [itsnotvii/mercari-clone](https://github.com/itsnotvii/mercari-clone) | No machine-readable license declared | 2026-09-09 | Card/detail/seller UX evaluated only. No source copied. |
| [swapnil233/SixMarket](https://github.com/swapnil233/SixMarket) | MIT | 2026-01-19 | Older Next 12 stack, author states no active development; not adopted. |
| [vercel/chatbot](https://github.com/vercel/chatbot) | Custom/NOASSERTION in metadata | 2026-07-08 | Tool-result and conversation UX evaluated only; no source copied, SDK not required for structured assistant. |
| [supabase-community/vercel-ai-chatbot](https://github.com/supabase-community/vercel-ai-chatbot) | Custom/NOASSERTION in metadata | 2024-05-28 | Last push 2024; historical reference only, architecture not adopted. |
| [vercel/ai](https://github.com/vercel/ai) | Custom/NOASSERTION in repository metadata | 2026-10-03 | Tool-calling architecture evaluated; not installed because MVP does not require a remote LLM. |
| [shadcndashboard/next-shadcn-dashboard](https://github.com/shadcndashboard/next-shadcn-dashboard) | MIT | 2026-08-26 | Next 16, React 19, Tailwind 4 compatibility and UI composition reviewed; dashboard written independently with native accessible controls. |
| [open-meteo/open-meteo](https://github.com/open-meteo/open-meteo) | AGPL-3.0 server; hosted API data CC BY 4.0 | 2026-10-03 | Hosted non-commercial API consumed; no server code incorporated. Attribution shown in UI. |
| [openlandmap/soildb](https://github.com/openlandmap/soildb) | Dataset CC BY 4.0 per selected STAC collections; no general repository license inferred | 2025-11-27 | COG single-window sampling/scaling approach informed fallback. Uses selected 2020–2022 assets, not source copy. |
| [openlandmap/SoilSamples](https://github.com/openlandmap/SoilSamples) | Dataset-specific licenses / NOASSERTION | 2026-05-06 | Provenance and open observations compilation reviewed. Not used as crop-label training data. |
| [IBM/terramind](https://github.com/IBM/terramind) | Apache-2.0 | 2026-09-29 | Research note only; no weights or runtime installed. |
| [torchgeo/terratorch](https://github.com/torchgeo/terratorch) | Apache-2.0 | 2026-09-30 | Research note only; no runtime installed. |

## Runtime dependencies

Next.js / React / Tailwind / Terra Draw: MIT; MapLibre: BSD-3-Clause; Lucide: ISC; Inter: SIL OFL-1.1; Zod: MIT. Font files are served locally, including Kazakh Cyrillic extensions. TypeScript: Apache-2.0. ESLint 9 is selected for current Next lint-plugin peer compatibility despite the newer major; there are no ignored peer conflicts. Prettier is development-only, MIT.

FastAPI: MIT; Uvicorn: BSD-3-Clause; psycopg and pool: LGPL-3.0-only; argon2-cffi: MIT; httpx: BSD-3-Clause; scikit-learn, NumPy, SciPy and joblib: BSD-family; Pillow: HPND; python-multipart: Apache-2.0; pyshp: MIT; rasterio: BSD-3-Clause. Docker PostGIS combines PostgreSQL and GPL PostGIS components; use the upstream image and preserve upstream notices. MapLibre’s installed worker/shared distribution files and original LICENSE.txt are served unchanged as generated local assets. No library source is relicensed.

Python dependencies are locked. An optional locally downloaded wheelhouse verifies SHA256 against official PyPI JSON metadata; ordinary clean builds can use the same lock online. Rasterio is justified only by bounded OpenLandMap COG queries. No geopandas/shapely/Redis/large model SDK is installed.

Tests: pytest (MIT), Playwright (Apache-2.0). Optional formatting: Prettier (MIT). See [DATA_SOURCES.md](DATA_SOURCES.md) for attribution and terms of data, which differ from software licenses.
