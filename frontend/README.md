# Frontend

AgriPlan frontend on `Next.js 16 + React 19 + Tailwind 4` with a mobile web-first UI and Capacitor wrapper for iOS.

## Run

```bash
npm install
npm run dev
```

Default local URL:

```text
http://localhost:3001
```

API base URL is configured via `NEXT_PUBLIC_API_BASE_URL`. If it is not set, the app falls back to:

```text
http://localhost:3008
```

## Product Scope

Current product areas in the web shell:

- authentication by phone and password
- dashboard with weather, notifications and crop cards
- farm plot map with polygon save/edit flow
- marketplace with lead-based selling flow
- services catalog and provider-facing flows
- direct chat and regional channel groundwork
- info center
- profile and orders
- admin surface
- Capacitor iOS shell

## Build And Checks

```bash
npm run build
npm run lint
```

## Capacitor

```bash
npm run cap:sync
npm run cap:open:ios
```

`ios/` contains generated native wrapper artifacts and should be treated as build output unless native changes are intentional.
