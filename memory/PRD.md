# PRD - Trade Intelligence Dashboard

## Original Problem Statement
"Build me an app where I will arrange data like exporter name buyer name product name it's unit price location client email it's address both end company names. Search 'shirts' returns all info — who is buying more shirts, at which price, in which country, who is exporting from Pakistan to that buyer."

Update 2: "Make it multi-user. Anyone can register and view/search but only I (admin) can upload/edit/delete. I can ban users. Feedback contact: azulmax990@gmail.com / +923390112545."

## User Personas
- **Admin** (azulmax990@gmail.com): full CRUD, manage users, ban/unban viewers
- **Viewers** (anyone who self-registers): read-only — search & analyse, no writes

## Architecture
- FastAPI + MongoDB (Motor async)
- React (CRA + Tailwind + Shadcn UI), JWT in localStorage
- Gemini 3 Flash Preview vision (admin-only) via emergentintegrations + EMERGENT_LLM_KEY
- JWT HS256, 14-day expiry, bcrypt password hashing, admin auto-seeded from env

## Core Requirements (Static)
1. Image upload → AI extracts every trade field — admin only
2. Manual record entry — admin only
3. Multi-currency: per-record currency (USD/EUR/GBP/PKR/...)
4. Search returns full per-segment breakdown (no averages) by country, buyer, exporter — open to all logged-in users
5. Filterable records database — open to all logged-in users
6. Detail view per record — open to all logged-in users
7. User management: list, ban, unban, delete — admin only
8. Banned users blocked from login and any endpoint

## Trade Record Fields (current)
exporter_name, exporter_company, exporter_address, exporter_country, buyer_name, buyer_company, buyer_address, buyer_city, buyer_country, buyer_email, product_name, product_category, unit_price, currency, quantity, unit, total_value, gross_weight_kg, cartons, shipment_date, gd_number, invoice_number, notes

## Implemented
### v1 (2026-02)
- Password gate auth, full CRUD, AI extraction, search, stats, seed

### v2 (2026-02) ← current
- **Multi-role JWT auth** (admin + viewer), bcrypt, `/api/auth/register`, `/login`, `/me`
- **RBAC** on all endpoints (require_admin for writes; get_current_user for reads; banned users blocked)
- **Admin user management**: `/api/admin/users` GET, ban/unban, delete (admins protected)
- **Per-record currency** display (EUR/GBP/USD/...) across all UI
- **New fields**: gd_number, buyer_city, gross_weight_kg, cartons (matches user's actual GD format)
- **Italy/Naples embroidery sample** seeded matching user's screenshot
- **Sidebar**: shows signed-in user, role badge, feedback contact (email + phone), admin-only nav
- **Register page** with cargo factory background
- **Regex escape** in search to prevent 500s on special chars
- 25/25 backend tests pass

## Backlog
- **P1**: Per-row edit-in-place (admin) — currently records are immutable through UI
- **P1**: Multi-image / CSV bulk import for admin
- **P1**: Stats endpoint computes totals in Python — switch to Mongo aggregation when DB grows past ~10k records
- **P2**: Charts (recharts) on dashboard — line/bar of monthly volume per product
- **P2**: Saved searches, price-drop alerts via email
- **P2**: Multi-admin support (currently single env-seeded admin)
- **P2**: Password reset via email
- **P2**: Subscription tier (user mentioned future monetisation)

## Test Credentials
See `/app/memory/test_credentials.md`
