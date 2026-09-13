# Section 5 Notes — Deployment

## What Was Built and Why

Section 5 prepares the multi-tenant POS + AI pipeline for production hosting. The **Next.js** app (Pages Router API routes + UI) deploys to **Vercel** near the Supabase region. The **Python validation service** deploys separately on **Render** via Docker, because Flask/SciPy cannot run on Vercel serverless functions. Supabase Postgres is already live — deployment only requires pointing environment variables at the existing project.

---

## Files Created

| File | Purpose |
|------|---------|
| `vercel.json` | Vercel project config (Next.js, `sin1` region) |
| `render.yaml` | Render Blueprint for the validation Docker service |
| `validation-service/Dockerfile` | Production container for Flask + gunicorn |
| `sql/008_seed_test_sales.sql` | 25-day test sales for both stores (AI Insights testing) |
| `SECTION_5_NOTES.md` | This file |

### Files modified

| File | Change |
|------|--------|
| `validation-service/app.py` | Reads `PORT` and `FLASK_DEBUG` from environment |
| `validation-service/requirements.txt` | Added `gunicorn` for production |
| `.env.example` | Documented production `VALIDATION_SERVICE_URL` |

---

## Core Architectural Pattern

**Multi-tenancy preserved:** no deployment change affects `store_id` scoping — the JWT still carries `storeId`, and all API routes continue filtering by `req.storeId`.

**Split deployment pattern:**

```
Browser → Vercel (Next.js) → Supabase Postgres
                ↓
         Render (Python /validate)
                ↓
         Gemini API
```

The Next.js backend calls the validation service over HTTP using `VALIDATION_SERVICE_URL`. Both services must be reachable from the public internet for Insights to work in production.

---

## Assumptions

- **Vercel** hosts the Next.js app (free hobby tier is sufficient for capstone demo).
- **Render** free tier hosts the validation service; cold starts (~30s) are acceptable for demo.
- **Supabase** project `pos-system` (`rfkoerdkpgyzoyzrmbxa`, `ap-southeast-1`) remains the database — use the **pooler** connection string on Vercel.
- Migrations `001`–`008` have been applied remotely.
- Test accounts:
  - Vape: `owner@vape.com` / `password123` (store 1)
  - Cosmetics: `owner@cosmetic.com` / `password123` (store 2)

---

## Known Limitations / Unverified Items

- **Render free tier** spins down after inactivity — first `/validate` call after idle may timeout unless the service is warmed up.
- **Vercel serverless** has a 10s (Hobby) / 60s (Pro) function timeout — the 4-iteration Gemini loop may hit Hobby limits; test after deploy.
- **CORS** is not configured on the validation service — only server-to-server calls from Next.js are expected (no browser direct access).
- Actual Vercel + Render deploy was **not executed from this repo** — configs are ready; the owner must connect GitHub and trigger deploy (see steps below).
- `npm run build` must **not** run while `npm run dev` is active (corrupts `.next` cache).

---

## Deploy Steps (owner action required — uses GitHub)

### 1. Push repo to GitHub

Follow Section 12 in `PROJECT_CONTEXT.md` for commit identity and hygiene rules.

### 2. Deploy validation service (Render)

1. Go to [render.com](https://render.com) → **New** → **Blueprint** → connect the repo.
2. Render reads `render.yaml` and creates `pos-validation-service`.
3. After deploy, copy the service URL (e.g. `https://pos-validation-service.onrender.com`).
4. Verify: `GET https://<your-render-url>/health` → `{"status":"ok"}`.

### 3. Deploy Next.js (Vercel)

1. Go to [vercel.com](https://vercel.com) → **Import** the GitHub repo.
2. Root directory: `pos-system` (or repo root if monorepo).
3. Add environment variables:

| Variable | Value |
|---|---|
| `DATABASE_URL` | Supabase pooler URI (password URL-encoded) |
| `JWT_SECRET` | Long random string (same as local or new) |
| `GEMINI_API_KEY` | From Google AI Studio |
| `VALIDATION_SERVICE_URL` | Render service URL (no trailing slash) |

4. Deploy → open the Vercel URL → log in and test `/insights`.

### 4. Re-seed test sales (optional)

Run `sql/008_seed_test_sales.sql` against Supabase if the database is reset.

---

## What Section 5 Needs From Prior Sections

All prior sections (1–4) must be functional. Insights in production requires:

- `GET /api/analytics/summary` — populated DB with transactions
- `POST /api/recommendations/run` — `GEMINI_API_KEY` + reachable `VALIDATION_SERVICE_URL`
- Python `POST /validate` — accepts analytics payload from `lib/refinementLoop.js`

---

## Test Sales Patterns (sql/008)

Seeded ~25 days of history for AI validation signals:

| Store | Rising (promote/restock) | Declining (discontinue) | Co-purchase (bundle) |
|---|---|---|---|
| Vape (1) | Black Elite Mango (BE-02) | Black Empire Grapes (BEM-03) | BE-01 Watermelon + BEM-06 Yakult |
| Cosmetics (2) | BUNDLE-B3 | Green Therapy Blush Serum | BUNDLE-B1 + Sea Makeup Panna Cotta |
