# Section 1 Notes — Auth & Multi-Tenancy Foundation

## What Was Built and Why

This section establishes the security and tenant-isolation layer for a multi-tenant Point-of-Sale (POS) web system serving two retail clients: a **Vape Shop** and a **Cosmetic Store**. Before any products, sales, or inventory features can exist, the system needs:

1. **Identity** — users who belong to exactly one store
2. **Authentication** — custom JWT + bcrypt login (no third-party auth providers)
3. **Tenant scoping** — every authenticated request carries a `storeId` so data from one store never leaks to another

Without this foundation, later sections (products, transactions, inventory) would have no reliable way to enforce data isolation between tenants.

---

## Files Created

| File | Purpose |
|------|---------|
| `sql/001_auth_schema.sql` | PostgreSQL DDL for `stores` and `users` tables, index, and seed data for the two tenants |
| `lib/db.js` | Shared `pg` connection pool reading `DATABASE_URL` from environment |
| `lib/jwt.js` | `signToken()` and `verifyToken()` helpers using `JWT_SECRET` with 8-hour expiry |
| `pages/api/auth/register.js` | POST endpoint to create a user scoped to a specific store |
| `pages/api/auth/login.js` | POST endpoint to authenticate and receive a JWT |
| `middleware/requireAuth.js` | Higher-order function wrapping protected API routes; validates Bearer token |
| `pages/api/products/index.js` | Example protected GET route demonstrating tenant-scoped queries |
| `.env.example` | Template for required environment variables |
| `package.json` | Project dependencies: `next`, `react`, `bcrypt`, `jsonwebtoken`, `pg` |
| `pages/index.js` | Minimal landing page so `next dev` runs without errors |
| `.gitignore` | Excludes `node_modules`, `.next`, and secret env files |

---

## Core Architectural Pattern

**Every table and query involving store data must be scoped by `store_id`.**

Flow:

1. User logs in → JWT payload contains `{ userId, storeId, role }`
2. Protected routes use `requireAuth(handler)` → decodes JWT → sets `req.storeId`
3. All SQL queries include `WHERE store_id = $1` bound to `req.storeId`

Example from the products route:

```sql
SELECT ... FROM products WHERE store_id = $1
-- $1 = req.storeId from the JWT, never from client input
```

**Why this matters:** The Vape Shop (store_id = 1) and Cosmetic Store (store_id = 2) share the same database and application code, but each tenant only ever sees rows matching their `store_id`. The client never sends `storeId` on protected routes — it comes from the signed JWT, preventing cross-tenant access even if a user tampers with request bodies.

---

## Assumptions

- **Next.js Pages Router** — API routes live under `pages/api/`, not App Router
- **Module style** — `lib/` and `middleware/` use CommonJS (`require` / `module.exports`); API route handlers use ES `export default`
- **Column naming** — SQL uses `snake_case` (`store_id`, `password_hash`); JSON responses use `camelCase` where noted
- **Roles** — only `'owner'` and `'staff'` are valid; default is `'staff'`
- **Email uniqueness** — global across all stores (one email cannot register twice, even at different stores)
- **Store IDs** — seeded stores get auto-increment IDs; typically `1 = Vape Shop`, `2 = Cosmetic Store` on a fresh database
- **SSL** — `lib/db.js` enables SSL for non-localhost connections (required by Supabase/Neon)
- **Products table** — referenced by the example route but **not created in Section 1**; defined in Section 2

---

## Known Limitations / Unverified Items

- **No input validation library** — basic manual checks only (no Zod/Joi)
- **No rate limiting** on login/register endpoints
- **No refresh tokens** — JWT expires after 8 hours; user must log in again
- **No password strength rules** beyond bcrypt hashing
- **Global email uniqueness** — if the same person works at both stores, they need two different emails
- **Products route will fail** until Section 2 creates the `products` table (expected — it is a pattern demo)
- **Not tested end-to-end** in this session against a live database — follow setup steps below to verify
- **No frontend auth UI** — API-only in this section
- **Register endpoint is open** — any caller can create users; production would restrict this (e.g. owner-only invite)

---

## What Section 2 Needs From This Section

Section 2 (full database schema) should:

1. **Add tables** with `store_id INTEGER NOT NULL REFERENCES stores(id)` on every tenant-owned table:
   - `products` (id, store_id, name, sku, price, stock_quantity, created_at)
   - `transactions` (id, store_id, user_id, total, created_at)
   - `transaction_items` (id, transaction_id, product_id, quantity, unit_price)
   - `inventory_logs` (id, store_id, product_id, change_qty, reason, created_at)

2. **Follow the same scoping pattern** — all queries filter by `req.storeId` from `requireAuth`, never trust client-supplied store IDs

3. **Use existing auth** — new routes wrap handlers with `requireAuth` from `middleware/requireAuth.js`

4. **Reference seeded stores** — foreign keys point to `stores.id` (1 and 2 after seed)

5. **Optionally use `req.userId` and `req.role`** — e.g. only `owner` can delete products or view reports

The JWT payload and middleware from Section 1 require no changes for Section 2 to work.
