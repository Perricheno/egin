# MVP Execution Plan

## Stage 1: Foundation Cleanup

Goal:

- make the current repository safe for MVP development

Tasks:

- add shared frontend API config
- move API host to env
- stop adding new hardcoded URLs
- preserve existing user-modified files
- lock MVP scope in docs

Definition of done:

- frontend has shared API helper
- env examples exist for frontend and backend
- product blueprint exists in repo

## Stage 2: Backend Domain Alignment

Goal:

- align current NestJS modules to AGRO APP MVP

Tasks:

- add `dashboard` module
- add `weather` module
- add `competition` module
- add `chat` module
- extend `farm_plots` with `cropId`, competition, predicted income fields
- extend `marketplace_listings` with visibility status

Definition of done:

- API supports dashboard, competition, weather, and direct chat

## Stage 3: Frontend Mobile-First Reshape

Goal:

- turn the current web UI into a mobile-first shell ready for Capacitor

Tasks:

- simplify navigation to 4 tabs: home, map, market, profile
- move heavy desktop-only controls behind sheets or secondary actions
- add home dashboard cards
- keep map as primary action surface
- standardize crop colors

Definition of done:

- all key flows work on a narrow phone viewport first

## Stage 4: AI v1

Goal:

- ship explainable intelligence without fake precision

Tasks:

- competition score from PostGIS plus rule-based weights
- projected income estimate
- dashboard insight summary
- confidence score on all predictions

Definition of done:

- user sees useful recommendation with explanation and confidence

## Stage 5: Marketplace and Chat Hardening

Goal:

- support real farmer transactions inside the app

Tasks:

- direct chat creation from listing
- marketplace visibility rule from competition level
- listing cards with location, quantity, expiration
- deal-context chat messages

Definition of done:

- seller can publish, buyer can open chat, and app enforces visibility logic

## Stage 6: Capacitor and Xcode

Goal:

- wrap the stable MVP for iOS testing

Tasks:

- add Capacitor to frontend
- add iOS platform
- run in Xcode simulator
- validate auth persistence, map, network, and geolocation

Definition of done:

- working iOS simulator build

## Immediate Next Tasks

1. Replace remaining hardcoded frontend URLs in modified UI files once their current changes are reviewed.
2. Add dashboard, weather, competition, and chat backend modules.
3. Design the mobile-first home dashboard screen contract.
