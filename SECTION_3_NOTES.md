# Section 3 Notes — Core POS UI

## What Was Built and Why

Section 3 turns the Section 1–2 backend into a usable web Point-of-Sale interface for the capstone project. Store staff can log in, manage products (add, edit, deactivate, search), run sales with a live cart and checkout, and review transaction history with expandable line items. All UI calls go through a shared `authFetch` helper that attaches the JWT from `localStorage`, so tenant isolation still happens server-side via `req.storeId` — the browser never sends a store ID.

---

## Files Created

| File | Purpose |
|------|---------|
| `lib/api.js` | Client-side auth helpers (`getToken`, `setAuth`, `clearAuth`, `authFetch`, `formatCurrency`) |
| `lib/formatProduct.js` | Shared SQL row → JSON formatter for Section 3 product API routes |
| `pages/api/products/[id].js` | `PUT` update product, `PATCH` deactivate (`is_active: false`), scoped to `req.storeId` |
| `pages/api/transactions/index.js` | `GET` paginated transaction history with nested line items |
| `pages/_app.js` | Loads global CSS |
| `pages/login.js` | Login form calling `POST /api/auth/login` |
| `pages/sales/index.js` | Product grid, search, cart, checkout, receipt modal |
| `pages/products/index.js` | Product table, search, add/edit slide-over panel, deactivate |
| `pages/transactions/index.js` | Paginated history with expandable line items |
| `components/Layout.js` | Top nav (Sales, Products, History, Logout) |
| `components/AuthGuard.js` | Redirects to `/login` if no JWT in `localStorage` |
| `components/ProductForm.js` | Reusable add/edit product form |
| `styles/globals.css` | Shared POS styling |
| `SECTION_3_NOTES.md` | This file |

### Files modified (minimal)

| File | Change |
|------|--------|
| `pages/index.js` | Redirects to `/login` or `/sales` based on stored token |

Section 1 and Section 2 API files were **not modified**.

---

## Core Architectural Pattern

**Multi-tenancy unchanged:** the UI never sends `storeId`. Every protected API call includes `Authorization: Bearer <token>`. The server derives `req.storeId` from the JWT.

**Client auth pattern:**

1. Login stores `pos_token` and `pos_user` in `localStorage`
2. `authFetch()` attaches the Bearer token on every request
3. On `401`, auth is cleared and the user is sent to `/login`
4. `AuthGuard` wraps every protected page

**Section 3 API routes follow the same scoping:**

| Route | Scoping |
|-------|---------|
| `PUT /api/products/[id]` | `WHERE id = $id AND store_id = req.storeId` |
| `PATCH /api/products/[id]` | Same — deactivate only sets `is_active = FALSE` |
| `GET /api/transactions` | `WHERE store_id = req.storeId` on transactions and line items |

---

## Assumptions

- **Currency display:** PHP (`en-PH`) via `Intl.NumberFormat` — adjust if pilot stores use a different currency
- **Payment methods in UI:** cash, card, gcash — stored as free-text `payment_method` in DB
- **Product search:** client-side filter on already-loaded list (no server-side search yet)
- **Deactivate = soft delete:** sets `is_active = false`; product disappears from sales and product list (GET manage returns active only)
- **No product reactivation UI** in this section
- **JWT in localStorage:** acceptable for capstone; not HttpOnly-cookie secure
- **Pages Router only** — no App Router, no native mobile

---

## Known Limitations / Unverified Items

- **Not tested in browser in this session** — run `npm run dev` and walk through login → sales → products → history
- **No role-based UI** — owners and staff see the same screens
- **No receipt printing** — checkout shows an on-screen modal only
- **No real-time stock sync** — two browser tabs could show stale stock until refresh
- **Transaction history pagination** is server-side; product list is not paginated
- **Edit does not allow reactivating** deactivated products (no PATCH `is_active: true`)
- **Stock edits on Products page** do not write `inventory_logs` (only sales do, from Section 2)

---

## What Section 4 Needs From This Section

Section 4 (AI recommendations + statistical validation loop) will need:

### Data already in the database (via existing sales flow)

- `transactions`, `transaction_items`, `inventory_logs` — populated when staff use **Sales → Checkout**
- `products` — catalog with stock levels

### UI entry point (suggested for Section 4)

Add a new nav item (e.g. **Insights** or **Recommendations**) that:

1. Calls a new Section 4 API route to aggregate sales per store (product-level stats, daily trends)
2. Triggers the Gemini → Python validation loop (fixed **4 iterations**)
3. Displays only validated recommendations with supporting stats

### Auth

Reuse `lib/api.js` → `authFetch()` for all Section 4 frontend calls. JWT shape unchanged: `{ userId, storeId, role }`.

### Endpoints Section 4 will add (not built yet)

| Endpoint | Purpose |
|----------|---------|
| `GET /api/analytics/summary` (example) | Aggregate sales data per `req.storeId` for AI input |
| `POST /api/recommendations/run` (example) | Start the 4-iteration Gemini + Python loop |
| Python service URL (env var) | Statistical validation backtesting |

Section 4 should **not** change login, sales checkout, or product management unless a bug is found.

---

## How to use the UI

1. `npm run dev`
2. Open [http://localhost:3000](http://localhost:3000) — redirects to `/login`
3. Sign in (e.g. `owner@vape.com` / `password123`)
4. **Sales** — tap products, checkout
5. **Products** — add, edit, search, deactivate
6. **History** — click a row to expand line items
