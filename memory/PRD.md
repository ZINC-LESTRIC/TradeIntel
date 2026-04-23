# PRD - Trade Intelligence Dashboard

## Original Problem Statement
"Build me an app where I will arrange data like exporter name buyer name product name it's unit price location client email it's address both end company names. I have lot of data but want to arrange so that searching 'shirts' returns all info — who is buying more shirts, at which price, in which country, who is exporting from Pakistan to that buyer."

## User Personas
- **Primary**: Pakistani export business owner. Single private user. Will later open it as subscription.

## Architecture
- FastAPI + MongoDB backend (Motor async)
- React (CRA + Tailwind + Shadcn UI) frontend
- Gemini 3 Flash Preview vision for OCR+structured extraction (via emergentintegrations EMERGENT_LLM_KEY)
- Simple password gate (token in localStorage; tokens kept in process memory)

## Core Requirements (Static)
1. Image upload → AI extracts every trade field
2. Manual record entry as a backup
3. Search returns full per-segment breakdown (no averages) by country, buyer, exporter
4. Filterable records database
5. Detail view per record
6. Single user, password protected

## Implemented (2026-02 v1)
- POST /api/auth/login + Bearer token auth
- CRUD /api/records (with q/country/buyer/exporter/product filters)
- GET /api/stats — totals + top countries + top products + recent
- GET /api/search?q= — grouped by country, buyer, exporter (each with min/max price, count, total value)
- GET /api/filters — unique values for selects
- POST /api/extract — Gemini 3 Flash vision → structured JSON
- POST /api/seed — 29 sample records (Pakistan exporters → world buyers, shirts/trousers/sportswear/bedlinen/towels/leather/rice/mango/carpets)
- Frontend pages: Login, Dashboard, Search, Records (table + filters), Upload (drag-drop + edit + save), Add Manual, Record Detail
- Swiss high-contrast theme, Chivo + IBM Plex Sans
- All interactive elements have data-testid

## Backlog
- **P1**: bulk upload (multiple images at once), CSV/Excel import, export results, charts (recharts) on dashboard
- **P1**: edit-in-place from records detail page
- **P2**: persistent JWT auth (currently in-memory tokens), multi-user + subscription tier
- **P2**: re-extract / re-process button if AI extraction was off
- **P2**: saved searches, comparison view (e.g., "shirts in UK vs USA price ladder")
- **P2**: notification when new record added matching saved alert (e.g., "any buyer in Germany paying > $7 for shirts")

## Test Credentials
See `/app/memory/test_credentials.md` (password `trade2026`)

## Backend
- 100% test pass (11/11) on iteration 1
