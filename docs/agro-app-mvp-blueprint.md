# AGRO APP MVP Blueprint

## Product Goal

Build a mobile-first agriculture platform for Kazakhstan that helps farmers:

- plan crops using map intelligence
- avoid oversupply and nearby competition
- sell directly through a marketplace
- communicate inside the app instead of WhatsApp or Telegram
- receive explainable AI recommendations with confidence scores

## MVP Decision

For this repository, the fastest path to pilot is:

- `NestJS` backend
- `PostgreSQL + PostGIS`
- current `Next.js` frontend optimized for mobile UX
- `Capacitor` packaging for iOS and Android after MVP flows are stable

This keeps the current codebase usable and avoids a premature rewrite to React Native. If the pilot succeeds and mobile complexity grows, the mobile client can later be reimplemented in React Native while keeping the same backend contracts.

## MVP Scope

Included in first production-ready MVP:

- phone auth
- home dashboard
- map with field polygons
- crop assignment per polygon
- competition scoring within configurable radius
- weather widget and alerts
- basic marketplace listings
- direct chat
- AI insight card with confidence score

Deferred after MVP:

- regional/global chat
- export intelligence
- services marketplace
- subscriptions billing
- advanced trust/reputation
- full ML forecasting stack

## System Architecture

```text
[ Mobile App Shell ]
  - Next.js mobile UI
  - Capacitor wrapper for iOS/Android
  - local storage and offline queue
        |
        v
[ API Gateway / BFF - NestJS ]
  - auth/session
  - mobile response shaping
  - subscription gating
  - rate limiting
        |
        +--> [ Auth Module ]
        +--> [ Users Module ]
        +--> [ Farm Plots Module ]
        +--> [ Crops Module ]
        +--> [ Competition Module ]
        +--> [ Weather Module ]
        +--> [ Marketplace Module ]
        +--> [ Chat Module ]
        +--> [ Analytics Module ]
        +--> [ Notifications Module ]
        |
        +--> [ AI Service Gateway ]
                |
                +--> [ Python: Competition Engine ]
                +--> [ Python: Yield/Income Forecast Engine ]
                +--> [ Python: Recommendation Engine ]

[ PostgreSQL + PostGIS ]
[ Redis ]
[ S3/GCS object storage ]
[ Queue: SQS/RabbitMQ ]
[ Observability: Sentry + Prometheus + Grafana ]
```

## Database Schema

### Core tables

`users`
- id
- phone
- full_name
- password_hash
- role
- region
- district
- village
- preferred_language
- verified_status
- trust_score
- subscription_plan
- created_at
- updated_at

`farms`
- id
- user_id
- name
- region
- district
- village
- total_area_ha

`farm_plots`
- id
- farm_id
- user_id
- title
- region
- district
- village
- area_size_hectares
- geometry polygon
- centroid point
- crop_id nullable
- fill_color
- season_year
- planting_status
- competition_score nullable
- competition_level nullable
- predicted_income nullable
- created_at
- updated_at

`crops`
- id
- code
- name_ru
- name_kk
- name_en
- color_hex
- growth_days
- base_cost_per_ha
- avg_yield_per_ha
- shelf_life_days

`crop_stages`
- id
- crop_id
- stage_name
- day_from
- day_to
- tips_text
- risk_notes

`competition_snapshots`
- id
- plot_id
- crop_id
- radius_km
- nearby_same_crop_area_ha
- nearby_same_crop_farm_count
- regional_listing_volume
- harvest_overlap_index
- score
- level
- confidence
- calculated_at

`weather_snapshots`
- id
- geo_hash
- date
- temp_min
- temp_max
- precipitation_mm
- wind_speed
- humidity
- source

`weather_alerts`
- id
- region
- district
- alert_type
- severity
- start_at
- end_at
- message

`marketplace_listings`
- id
- seller_user_id
- plot_id nullable
- crop_id nullable
- listing_type
- title
- description
- price
- quantity
- unit
- expires_at
- region
- district
- village
- location_label
- image_url
- visibility_status
- status
- created_at
- updated_at

`chats`
- id
- type
- listing_id nullable
- region nullable
- district nullable
- created_by
- created_at

`chat_participants`
- id
- chat_id
- user_id
- last_read_at

`messages`
- id
- chat_id
- sender_id
- type
- body
- attachment_url
- metadata_json
- created_at

`reviews`
- id
- from_user_id
- to_user_id
- listing_id nullable
- rating
- comment
- created_at

`news_items`
- id
- type
- title
- summary
- body
- region nullable
- source_url
- published_at

## Key relations

- users -> farms -> farm_plots
- crops -> crop_stages
- farm_plots + crops -> competition_snapshots
- users -> marketplace_listings
- chats -> messages
- users -> reviews

## API Structure

### Auth

- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/health`

### User

- `GET /users/me`
- `PATCH /users/me`

### Farm plots

- `GET /farm-plots`
- `POST /farm-plots`
- `GET /farm-plots/:id`
- `PATCH /farm-plots/:id`
- `DELETE /farm-plots/:id`
- `POST /farm-plots/:id/assign-crop`
- `GET /farm-plots/:id/competition`

### Crops

- `GET /crops`
- `GET /crops/:id`
- `GET /crops/:id/lifecycle`

### Weather

- `GET /weather/current`
- `GET /weather/forecast`
- `GET /weather/alerts`

### Marketplace

- `GET /marketplace/listings`
- `POST /marketplace/listings`
- `GET /marketplace/listings/:id`
- `PATCH /marketplace/listings/:id`
- `POST /marketplace/listings/:id/publish`

### Chat

- `POST /chats/direct`
- `GET /chats`
- `GET /chats/:id/messages`
- `POST /chats/:id/messages`

### Dashboard

- `GET /dashboard/home`
- `GET /dashboard/notifications`
- `GET /dashboard/insights`

## AI Logic

### Competition score

```text
competition_score =
  w1 * normalized(nearby same-crop area within radius) +
  w2 * normalized(nearby same-crop farmer count) +
  w3 * normalized(regional listing volume for same crop) +
  w4 * normalized(harvest overlap in same time window)
```

Default thresholds:

- `0.00 - 0.33`: low
- `0.34 - 0.66`: medium
- `0.67 - 1.00`: high

Marketplace visibility rule:

- `low competition -> hidden`
- `medium or high competition -> visible`

This rule should remain configurable at the service level, not hardcoded into the UI.

### Yield prediction

Inputs:

- crop
- region
- planting date
- irrigation
- soil type
- historical weather
- historical yield
- area

MVP implementation:

- rule-based baseline
- optional Python model later using `XGBoost` or `LightGBM`

### Income prediction

```text
predicted_profit =
  (predicted_yield_tons * expected_market_price)
  - estimated_input_costs
  - logistics_cost
  - storage_loss_risk
```

### Recommendation engine

Every recommendation must include:

- recommendation text
- why it is recommended
- top factors
- confidence score

Example:

```text
Recommend: sunflower
Why:
- low nearby competition
- favorable 10-day weather window
- strong district demand
Confidence: 0.76
```

## UI and UX Breakdown

### Core screens

`Auth`
- phone login and registration
- large buttons
- role picker with icons

`Home`
- weather summary
- field count
- average competition badge
- projected income summary
- AI insight card
- quick actions

`Map`
- full-screen map
- colored crop polygons
- large draw button
- save flow in bottom sheet

`Field sheet`
- plot area
- selected crop
- competition badge
- visibility decision
- projected income

`Marketplace`
- large cards
- photo, price, quantity, expiration, location
- city, region, village filters
- write/buy CTA

`Chat`
- direct chat first
- image message support later
- transaction context for marketplace deals

`Profile`
- account info
- user plots
- orders/deals
- settings

### UX principles

- one-thumb operation
- minimum text
- maximum iconography and color cues
- large touch targets
- offline-safe drafts where possible

## MVP Roadmap

### Week 1

- freeze MVP scope
- create architecture and domain contracts
- remove frontend hardcoded API URLs
- define env strategy
- clean backend modules

### Week 2

- complete auth and profile flow
- stabilize plot creation and editing
- add crop assignment flow
- add dashboard summary endpoint

### Week 3

- implement competition scoring v1
- implement marketplace visibility rule
- add marketplace CRUD
- add weather integration

### Week 4

- add direct chat
- add AI insight card
- optimize mobile layout
- integrate Capacitor and validate in Xcode

## Monetization

`Free`
- map
- basic competition view
- chat
- limited listings

`Pro`
- AI insights
- weather risk alerts
- income prediction
- crop recommendations

`Business`
- export signals
- promoted listings
- advanced analytics
- multi-user account access

Additional revenue:

- promoted listings
- logistics referrals
- agronomist leads
- supplier partnerships

## Scaling Strategy

Phase 1:

- NestJS modular monolith
- single Postgres instance with PostGIS
- Redis for cache and sessions
- queue for asynchronous analytics

Phase 2:

- split chat and marketplace services
- add read replicas
- move AI workloads fully to Python workers
- media storage via CDN-backed object storage

Phase 3:

- country-aware content and crop catalogs
- provider abstraction for weather and pricing feeds
- multi-region deployment

## Current Repository Priorities

1. Introduce shared frontend API config and environment variables.
2. Remove remaining hardcoded backend URLs.
3. Reshape frontend around mobile-first screen flow.
4. Expand backend around dashboard, competition, weather, and chat.
5. Add Capacitor only after the above flows are stable.
