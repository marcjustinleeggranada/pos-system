# Section 4 Notes — AI Recommendation Module + Refinement Loop

## What Was Built and Why

Section 4 implements the capstone's core research contribution: AI-generated retail recommendations that are **statistically validated** before the store owner sees them. Sales data from the POS (transactions, line items, inventory logs) is aggregated per tenant, sent to **Gemini** for pattern-based suggestions (restock, discontinue, bundle, promote), then each suggestion is backtested by a separate **Python** service using hypothesis tests (Mann-Whitney U for sales trends, chi-square for bundle co-purchase). A fixed **4-iteration refinement loop** sends validation feedback back to Gemini to revise failed recommendations, stopping early only when every recommendation in an iteration passes. Only validated recommendations are shown on the Insights UI.

---

## Files Created

| File | Purpose |
|------|---------|
| `lib/analytics.js` | Aggregates product stats, 30-day daily trend, co-purchase pairs, per-product daily sales |
| `lib/gemini.js` | Calls Gemini API, builds prompts, parses JSON recommendations |
| `lib/refinementLoop.js` | Orchestrates 4-iteration Gemini → Python → feedback cycle |
| `pages/api/analytics/summary.js` | `GET` tenant-scoped sales snapshot for the UI |
| `pages/api/recommendations/run.js` | `POST` runs the full refinement loop for `req.storeId` |
| `validation-service/app.py` | Flask server exposing `GET /health` and `POST /validate` |
| `validation-service/validator.py` | Hypothesis testing logic (SciPy/statsmodels stack) |
| `validation-service/requirements.txt` | Python dependencies |
| `pages/insights/index.js` | Insights UI — load summary, trigger analysis, show validated recs + loop log |
| `SECTION_4_NOTES.md` | This file |

### Files modified (Section 4 integration only)

| File | Change |
|------|--------|
| `components/Layout.js` | Added **Insights** nav link |
| `styles/globals.css` | Insight card styles |
| `.env.example` | Added `GEMINI_API_KEY`, `VALIDATION_SERVICE_URL` |

Sections 1–3 API files were **not modified**.

---

## Core Architectural Pattern

**Multi-tenancy preserved:** analytics queries and the refinement loop always use `req.storeId` from the JWT. The client never sends a store ID. Gemini and Python receive data already filtered for the authenticated tenant.

**Refinement loop pattern (fixed 4 iterations):**

```
1. Aggregate store analytics (PostgreSQL, scoped by store_id)
2. FOR iteration 1..4:
     a. Gemini → JSON recommendations
     b. Python  → statistical validation per recommendation
     c. Track passed recommendations
     d. IF all passed → STOP
     e. ELSE → feed failures back to Gemini on next iteration
3. Return only validated recommendations to the UI
```

`REFINEMENT_ITERATIONS = 4` is hardcoded in `lib/refinementLoop.js` — not configurable (per project scope).

### Validation tests by recommendation type

| Type | Statistical test | Pass condition |
|------|------------------|----------------|
| `restock`, `promote` | Mann-Whitney U (one-sided) | Recent daily sales > earlier period, p < 0.05 |
| `discontinue` | Mann-Whitney U (one-sided) | Recent daily sales < earlier period, p < 0.05 |
| `bundle` | Chi-square / co-purchase threshold | Products co-purchased ≥ 2 times with significant association |

---

## Assumptions

- **Gemini model:** `gemini-1.5-flash` via REST API (`GEMINI_API_KEY` in `.env.local`)
- **Python service runs locally** on port 5000 during development
- **Minimum data:** trend tests need ≥ 4 daily data points; sparse stores may get zero validated recommendations (expected with little sales history)
- **Recommendation JSON:** Gemini asked to return structured JSON; `responseMimeType: application/json` used when supported
- **Only validated recs shown** to owner on Insights page; iteration log available for thesis/demo transparency
- **No recommendation persistence table** — results are ephemeral per run (fine for capstone)

---

## Known Limitations / Unverified Items

- **Requires two services running:** `npm run dev` + Python validation service
- **Gemini API key not included** — user must obtain from Google AI Studio
- **Not tested end-to-end in this session** against live Gemini + Python with real API key
- **Small datasets** (e.g. one product, few sales) may fail all statistical tests — expected behavior, not a bug
- **Bundle chi-square** uses a simplified contingency setup; sufficient for capstone demo, not production-grade market basket analysis
- **No rate limiting** on `/api/recommendations/run` — each run calls Gemini up to 4 times (cost/latency)
- **Owner/staff both** can run analysis — no role restriction

---

## What Section 5 Needs From This Section

Section 5 (Deployment) should deploy:

| Component | Notes |
|-----------|-------|
| Next.js app | Set `GEMINI_API_KEY`, `VALIDATION_SERVICE_URL`, `DATABASE_URL`, `JWT_SECRET` |
| Python validation service | Deploy Flask app (Railway, Render, Fly.io, etc.); point `VALIDATION_SERVICE_URL` to its public URL |
| Supabase PostgreSQL | Already live |

### API contracts for deployment testing

**`GET /api/analytics/summary`** — Bearer token required. Returns `{ summary: { productStats, dailyTrend, coPurchasePairs, lowStockProducts, totals } }`.

**`POST /api/recommendations/run`** — Bearer token required. No body. Returns:

```json
{
  "iterations": [
    {
      "iteration": 1,
      "recommendations": [...],
      "validationResults": [...],
      "allPassed": false
    }
  ],
  "iterationCount": 4,
  "maxIterations": 4,
  "validatedRecommendations": [
    {
      "id": "rec-1",
      "type": "restock",
      "productId": 1,
      "title": "...",
      "rationale": "...",
      "validation": {
        "passed": true,
        "test": "mannwhitneyu",
        "pValue": 0.012,
        "message": "...",
        "iterationValidated": 2
      }
    }
  ],
  "analyticsSummary": { ... }
}
```

**Python `POST /validate`** — called by Next.js backend only (not browser). Body includes `recommendations`, `productDailySales`, `coPurchasePairs`, `storeId`.

---

## Local setup

### 1. Add to `.env.local`

```env
GEMINI_API_KEY=your-key-from-aistudio.google.com
VALIDATION_SERVICE_URL=http://localhost:5000
```

### 2. Start Python validation service

```powershell
cd c:\Users\Justin\Desktop\pos-system\validation-service
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
python app.py
```

### 3. Start Next.js (separate terminal)

```powershell
cd c:\Users\Justin\Desktop\pos-system
npm run dev
```

### 4. Use the UI

Login → **Insights** → **Run AI analysis**
