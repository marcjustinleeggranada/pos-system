# Section 2 Notes — Database Schema & Core POS API Routes

## What Was Built and Why

Section 2 adds the core data model and API layer that turn the multi-tenant auth foundation from Section 1 into a working Point-of-Sale backend. Two retail clients (Vape Shop and Cosmetic Store) can now manage their own product catalogs and record sales, with every row tied to a `store_id` so tenant data stays isolated in a shared PostgreSQL database. The checkout flow is implemented as a single atomic database transaction so stock levels, sale records, and inventory audit logs always stay in sync — a sale either fully succeeds or fully rolls back.

---

## Files Created

| File | Purpose |
|------|---------|
| `sql/002_pos_schema.sql` | DDL for `products`, `transactions`, `transaction_items`, and `inventory_logs` with `store_id` FKs and indexes |
| `pages/api/products/manage.js` | Protected GET (list active products) and POST (create product) scoped to `req.storeId` |
| `pages/api/transactions/create.js` | Protected POST checkout endpoint — atomic sale with stock deduction and inventory logging |
| `SECTION_2_NOTES.md` | Handoff documentation for this section |

---

## Core Architectural Pattern

**Every table has `store_id`, and every query filters by `req.storeId` from the JWT — never a client-supplied store ID.**

Section 1 established this pattern; Section 2 applies it consistently:

| Route | Scoping |
|-------|---------|
| `GET /api/products/manage` | `WHERE store_id = $1 AND is_active = TRUE` |
| `POST /api/products/manage` | `INSERT ... store_id = req.storeId` |
| `POST /api/transactions/create` | Product locks, transaction insert, line items, stock updates, and inventory logs all use `req.storeId` |

Product lookups during checkout also require `is_active = TRUE`, so deactivated products cannot be sold.

### Why `transactions/create.js` must be atomic

A sale touches four concerns at once:

1. A `transactions` header row
2. One or more `transaction_items` rows
3. `products.stock_quantity` decrements
4. `inventory_logs` audit rows

If any step fails mid-way (e.g. second item is out of stock), partial updates would leave stock and sales records inconsistent. The route uses `pool.connect()` with `BEGIN` / `COMMIT` / `ROLLBACK` so all steps succeed together or none are persisted. Row-level locks (`SELECT ... FOR UPDATE`) prevent two concurrent checkouts from overselling the same product.

---

## Assumptions

- **Module style** — API routes in `pages/api/` use ES `import` / `export default`; `requireAuth` is imported as a default import (`import requireAuth from '../../../middleware/requireAuth'`) because the middleware is a CommonJS default export
- **Column naming** — SQL uses `snake_case`; JSON responses use `camelCase` for product fields
- **`inventory_logs.reference_id`** — stores the related `transactions.id` for `change_type = 'sale'` entries; reserved for future use with restock/adjustment workflows (e.g. linking to a restock batch ID)
- **Duplicate line items** — if the same `product_id` appears multiple times in the checkout `items` array, quantities are merged before processing
- **Pricing at checkout** — `unit_price` is read from the locked product row at sale time, not from the client
- **Section 1 files unchanged** — `pages/api/products/index.js` still exists as the Section 1 demo; Section 2 UI and tests should use `/api/products/manage` instead

---

## Known Limitations / Unverified Items

- **No restock or adjustment endpoints** — `inventory_logs` supports `'restock'` and `'adjustment'` change types, but only `'sale'` is written today
- **No product update or soft-delete API** — products can be created and listed; deactivation/editing endpoints are not built yet
- **No transaction history endpoint** — sales are recorded but there is no GET route to list past transactions
- **No pagination** on the product list — all active products are returned in one response
- **No role-based restrictions** — any authenticated user (owner or staff) can create products and process sales
- **Not tested end-to-end** against a live database in this session — run `002_pos_schema.sql` and test with curl (see below)
- **Register endpoint still open** from Section 1 — unchanged

---

## What Section 3 Needs From This Section

Section 3 is the POS UI (product list/edit, sales screen with cart, checkout, transaction history). It should call these endpoints:

### `GET /api/products/manage`

**Auth:** `Authorization: Bearer <token>`

**Response (200):**

```json
{
  "products": [
    {
      "id": 1,
      "storeId": 1,
      "name": "Blue Razz Pod",
      "sku": "BRP-001",
      "category": "Disposables",
      "price": 12.99,
      "cost": 6.50,
      "stockQuantity": 25,
      "isActive": true,
      "createdAt": "2026-09-12T00:00:00.000Z",
      "updatedAt": "2026-09-12T00:00:00.000Z"
    }
  ]
}
```

Use for: product list on the sales screen and inventory views.

---

### `POST /api/products/manage`

**Auth:** `Authorization: Bearer <token>`

**Body:**

```json
{
  "name": "Blue Razz Pod",
  "price": 12.99,
  "sku": "BRP-001",
  "category": "Disposables",
  "cost": 6.50,
  "stock_quantity": 25
}
```

Only `name` and `price` are required. Optional: `sku`, `category`, `cost`, `stock_quantity`, `is_active`.

**Response (201):**

```json
{
  "product": {
    "id": 1,
    "storeId": 1,
    "name": "Blue Razz Pod",
    "sku": "BRP-001",
    "category": "Disposables",
    "price": 12.99,
    "cost": 6.5,
    "stockQuantity": 25,
    "isActive": true,
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

**Errors:** 409 if SKU duplicates within the same store.

Use for: add-product form / inventory management screen.

---

### `POST /api/transactions/create`

**Auth:** `Authorization: Bearer <token>`

**Body:**

```json
{
  "payment_method": "cash",
  "items": [
    { "product_id": 1, "quantity": 2 },
    { "product_id": 3, "quantity": 1 }
  ]
}
```

`payment_method` defaults to `"cash"` if omitted.

**Response (201):**

```json
{
  "transaction_id": 42,
  "total_amount": 38.97
}
```

**Errors:**

| Status | When |
|--------|------|
| 400 | Missing/invalid `items` array |
| 404 | Product not found or inactive in this store |
| 409 | Insufficient stock for a product |

Use for: checkout button on the sales/cart screen. After success, clear the cart and optionally show a receipt summary using `transaction_id` and `total_amount`.

---

### Section 1 endpoints still required by Section 3

| Endpoint | Purpose |
|----------|---------|
| `POST /api/auth/login` | Login screen — returns `{ token, user }` |
| `POST /api/auth/register` | Optional seed/setup only |

Store the JWT (e.g. in memory or `localStorage`) and attach it as `Authorization: Bearer <token>` on all `/api/products/manage` and `/api/transactions/create` calls.

---

## Quick test sequence (after running `002_pos_schema.sql`)

```powershell
# 1. Login and save token
curl.exe -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d "{\"email\":\"owner@vape.com\",\"password\":\"password123\"}"

# 2. Create a product
curl.exe -X POST http://localhost:3000/api/products/manage -H "Content-Type: application/json" -H "Authorization: Bearer TOKEN" -d "{\"name\":\"Test Pod\",\"price\":9.99,\"sku\":\"TP-001\",\"stock_quantity\":10}"

# 3. List products
curl.exe http://localhost:3000/api/products/manage -H "Authorization: Bearer TOKEN"

# 4. Checkout
curl.exe -X POST http://localhost:3000/api/transactions/create -H "Content-Type: application/json" -H "Authorization: Bearer TOKEN" -d "{\"payment_method\":\"cash\",\"items\":[{\"product_id\":1,\"quantity\":2}]}"
```
