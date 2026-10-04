# Section 5 Notes — Deployment

## What Was Built and Why

Section 5 prepares the multi-tenant POS + AI pipeline for production hosting on **Render** (free tier). Both the **Next.js** app and the **Python validation service** deploy from one `render.yaml` Blueprint. Supabase Postgres is already live — deployment only requires pointing secret environment variables at the existing database and API keys.

---

## Files Created

| File | Purpose |
|------|---------|
| `render.yaml` | Render Blueprint — **pos-web** (Next.js) + **pos-validation** (Docker) |
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

**Split deployment pattern (both on Render):**

```
Browser → Render pos-web (Next.js) → Supabase Postgres
                ↓
         Render pos-validation (Python /validate)
                ↓
         Gemini API
```

`VALIDATION_SERVICE_URL` is wired automatically in `render.yaml` via `fromService` → `RENDER_EXTERNAL_URL` on the validation service.

---

## Assumptions

- **Render free tier** hosts both services; cold starts (~30–60s) after idle are acceptable for capstone demo.
- **Supabase** project `pos-system` (`rfkoerdkpgyzoyzrmbxa`, `ap-southeast-1`) remains the database — use the **pooler** connection string on Render.
- Migrations `001`–`010` have been applied remotely (`010_vape_lines_and_descriptions.sql` verified applied on 2026-10-04).
- Test accounts:
  - Vape: `owner@vape.com` / `password123` (store 1)
  - Cosmetics: `owner@cosmetic.com` / `password123` (store 2)

---

## Known Limitations / Unverified Items

- **Render free tier** spins down after inactivity — first `/validate` call after idle may timeout unless the service is warmed up.
- **CORS** is not configured on the validation service — only server-to-server calls from Next.js are expected (no browser direct access).
- First deploy/build on Render free tier can take several minutes.
- `npm run build` must **not** run while `npm run dev` is active (corrupts `.next` cache).

---

## Deploy Steps (owner action required — uses GitHub)

### 1. Push repo to GitHub

Follow Section 12 in `PROJECT_CONTEXT.md` for commit identity and hygiene rules.

### 2. Deploy on Render (one Blueprint, two services)

1. Go to [render.com](https://render.com) → sign up / log in → **New** → **Blueprint**.
2. Connect GitHub repo: `marcjustinleeggranada/pos-system`.
3. Render reads `render.yaml` and creates **pos-validation** + **pos-web**.
4. When prompted, set these **secret** env vars on **pos-web** (copy from your local `.env.local`):

| Variable | Value |
|---|---|
| `DATABASE_URL` | Supabase pooler URI (password URL-encoded) |
| `JWT_SECRET` | Long random string |
| `GEMINI_API_KEY` | From Google AI Studio |

`VALIDATION_SERVICE_URL` is set automatically from **pos-validation**'s public URL (`RENDER_EXTERNAL_URL`). It must look like `https://pos-validation-xxxx.onrender.com` — **not** just `pos-validation`.

If Insights shows `Validation service unreachable at https://pos-validation`:

1. Render dashboard → **pos-validation** → copy the public URL at the top (e.g. `https://pos-validation-frt6.onrender.com`).
2. Render dashboard → **pos-web** → **Environment** → set `VALIDATION_SERVICE_URL` to that full URL → Save.
3. **Manual Deploy** pos-web.
4. Open `https://<pos-validation-url>/health` in a browser once to wake the service (free tier cold start).

**"Validation service error (502)" on Insights:** pos-validation is asleep or still starting. Open `https://pos-validation.onrender.com/health`, wait for `{"status":"ok"}`, then run analysis again. pos-web now retries 502/503 automatically and pings `/health` first.

5. Click **Apply** and wait for both services to finish building (first build ~5–10 min).
6. Open the **pos-web** URL from the Render dashboard → log in → test `/insights`.
7. Verify web DB: `GET https://<pos-web-url>/api/health` → `{"status":"ok","db":"connected"}`.
8. Verify validation: `GET https://<pos-validation-url>/health` → `{"status":"ok"}`.

### Render troubleshooting — "Internal server error" on login

This almost always means **pos-web cannot reach Supabase**. The login page loads, but `POST /api/auth/login` returns 500.

1. Render dashboard → **pos-web** → **Environment** → confirm all three secrets are set (not blank, not placeholders):
   - `DATABASE_URL` — copy the **full pooler URI** from your working `.env.local` (password must use `%40` for `@`)
   - `JWT_SECRET`
   - `GEMINI_API_KEY`
2. After saving env vars, click **Manual Deploy** → **Deploy latest commit**.
3. Test `GET /api/health` on your pos-web URL. If you see `"db":"connection failed"`, the `DATABASE_URL` is still wrong.
4. **Free tier cold start:** services sleep after ~15 min idle. First phone visit can take **30–60 seconds** — wait and refresh once before assuming it's broken.

### 3. Product costs + demo sales reset

**Cost rules (applied by `sql/009` / reset script):**
- Vape (store 1): every SKU cost = **₱195**
- Cosmetic bundles: **₱133.33 × item count** (2–3 items per bundle); capped at **72% of retail** when raw cost exceeds price
- Individual cosmetics: ~**45% of retail**

**Reset options:**

1. **Insights page (owner):** `/insights` → **Reset costs & demo sales** (updates both stores, clears all sales, reloads demo history).
2. **CLI:** `npm run reset:insights-data` (needs `DATABASE_URL` in `.env.local`).
3. **SQL:** run `sql/009_product_costs_and_reseed.sql`, then `sql/008_seed_test_sales.sql` on Supabase.

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
