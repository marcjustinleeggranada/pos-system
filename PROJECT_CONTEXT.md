# Project Context — Full Handoff Document

This file is the **single source of truth** for the project's state, architecture, and build progress. When a new developer picks up the project or starts a fresh session, **read this file first** — chat history does not carry over between tools, but this document and the `SECTION_N_NOTES.md` files do.

---

## Current session state

**Last updated:** 2026-09-15

| Field | Value |
|---|---|
| **Branch** | `main` (synced to `030e15f`) |
| **Repo** | `marcjustinleeggranada/pos-system` |
| **Deployment** | Render: `pos-web` + `pos-validation` (free tier). Vercel abandoned. |
| **Database** | Supabase `rfkoerdkpgyzoyzrmbxa` (ap-southeast-1) |
| **Render redeploy** | Needed after this push (product UI change) |

**Recently completed:**
- Sections 1–5 code complete; GitHub repo live
- UI redesign: register theme, IBM Plex, sidebar + mobile bottom nav, till drawer
- Login copy: "Sign in to your store"
- Render DB fix: `lib/db.js` uses `ssl: { rejectUnauthorized: false }` — do not append `sslmode=require` to `DATABASE_URL`
- `/api/health` endpoint for Render DB connectivity checks
- Section 13 multi-session sync protocol added to handoff doc (`030e15f`)
- Deployment docs corrected to Render-only (`b9f82e4`)
- Removed redundant vape/cosmetics subcategory picker — department auto-set from store
- Cosmetic store hides product line and flavor columns (vape-only fields)
- Vape shop: product lines on sales grid with flavor picker; inventory is one row per flavor

**In progress / owner actions:**
- Confirm Render `pos-web` env vars set (`DATABASE_URL`, `JWT_SECRET`, `GEMINI_API_KEY`) and redeploy after each push if auto-deploy is off
- Test live site on phone via Render URL

**Known issues:**
- Free tier Render services sleep after ~15 min idle (first load slow)
- Insights requires validation service reachable (`VALIDATION_SERVICE_URL` wired in Render Blueprint)

**Next task:** Manual Deploy pos-web on Render after cosmetic UI cleanup push.

---

## 1. Project Overview

**Working title:** Integrating Analytical AI with Point-of-Sale Systems for Small Businesses
**Type:** BSIT capstone project

**Rationale:** Most small/micro retail businesses (clothing, cosmetics, vape shops, etc.) use basic POS systems that only record transactions and track inventory — no analytics on customer preference or why products sell. Owners rely on guesswork. Larger retailers already use AI-integrated POS for demand prediction and dynamic pricing, but these tools are out of reach for small businesses due to cost and technical overhead. General-purpose LLMs (Gemini, Claude) have lowered the technical barrier to AI-driven analysis, but raw LLM recommendations carry risk of being statistically baseless since LLMs don't perform rigorous testing. This project combines an LLM (pattern-finding) with a dedicated Python statistical validation layer (hypothesis testing) so recommendations are evidence-backed before reaching the owner.

**Target beneficiaries:** Sole proprietors and micro/small retail businesses (originally scoped to RTW/clothing stores, now piloting with a vape shop and cosmetic store as additional tenants) — plus their customers (better-matched products) and future researchers (replicable low-cost framework for AI + statistical validation in small business tools).

**Suggested solution, three parts:**
1. **POS core** — records transactions, adjusts prices, tracks customer preferences and item categories in a structured DB.
2. **AI analysis** — sales data is sent to an LLM (Gemini) via API, which identifies patterns (seasonal demand, effective promotions, underperforming products, bundling opportunities, restock priorities) and produces recommendations.
3. **Statistical validation** — a Python-based module runs each AI recommendation through statistical procedures against the store's actual sales data. Only recommendations that pass validation are surfaced to the owner. This keeps the final call with the human owner while giving them evidence, not an unfiltered AI guess.

## 2. Finalized Tech Stack

- **Frontend/Backend:** Next.js, **Pages Router**, web-only (no native/mobile — this is a firm constraint, not a preference)
- **Database:** PostgreSQL (Supabase or Neon free tier)
- **Auth:** custom JWT + bcrypt — explicitly **not** NextAuth.js or Firebase Auth
- **AI:** Gemini API (free tier)
- **Statistical validation:** separate Python module (pandas, SciPy/statsmodels)
- **Dev environment:** VS Code (or any editor), Node.js/npm, Python 3.x (venv), Git

## 3. Major Activities — Finalized 11-Point List (canonical scope)

This is the official project scope from the concept paper. Implementation is being built against this list, broken into code-sized "sections" (see the mapping below).

1. **Data Gathering and Requirements Analysis** – Interview/survey target RTW/clothing store owners on POS pain points, sales-recording habits, inventory data structure. Tools: Google/Microsoft Forms, Google Sheets/Excel.
2. **System Design and Architecture Planning** – Design the DB schema for transactions, inventory, customer preference data; define POS↔AI↔statistical module communication. Tools: draw.io/Lucidchart, MySQL Workbench/pgAdmin.
3. **Development Environment Setup** – Core dev stack for a web-based system. Tools: VS Code, Node.js/npm, Python 3.x (venv/Conda), Git.
4. **POS System Development** – Core POS functions as a website: transaction recording, inventory tracking, price adjustment, receipt generation, plus login/auth restricting DB access to authorized staff. Tools: Next.js/React frontend; Node.js(Express)/Flask/Django backend; PostgreSQL/MySQL; auth via NextAuth.js, Firebase Auth, or custom JWT + bcrypt.
5. **AI Recommendation Module Integration** – Connect POS sales data to the Gemini API for initial inventory/restocking recommendations. Tools: Google AI Studio/Gemini API (free tier), Python `requests`/`google-generativeai` SDK, JSON.
6. **Statistical Validation Module Development** – Python-based simulation/hypothesis-testing system that backtests each AI recommendation against historical sales data. Tools: pandas, NumPy/SciPy, statsmodels, Jupyter for prototyping.
7. **Iterative Refinement Loop Implementation** – Feedback cycle: Gemini recommends → Python module tests → results fed back to Gemini for revision → repeats for a **fixed 4 iterations** before finalizing. Tools: Python orchestration script, `logging` module to track each iteration.
8. **System Integration and Testing** – Combine POS, AI, and validation modules into one pipeline; unit + end-to-end testing. Tools: Postman, PyTest, Git/GitHub.
9. **Pilot Testing with Sample Store Data** – Run on real or simulated store data to check accuracy/usefulness of final recommendations. Tools: Excel/Sheets or synthetic data via Python's Faker library.
10. **Evaluation and Comparison** – Compare simulated outcomes with vs. without AI recommendations to measure impact. Tools: pandas, Matplotlib/Seaborn.
11. **Client Handover and Documentation** – Deliver the finalized system with documentation/user guide to the business owner. Tools: MS Word/Google Docs for the user manual, GitHub Wiki/Notion for technical docs.

### Mapping to implementation sections (how we're actually building it)

The 11 activities aren't built 1:1 as separate code sections — several are planning/testing/delivery activities that wrap around the actual build. Here's how they map to the section-by-section implementation:

| Code section | Covers Major Activities # | Status |
|---|---|---|
| **Section 1 — Auth & Multi-Tenancy** | Part of #3 (env setup) and #4 (the login/auth portion) | ✅ DONE |
| **Section 2 — Database Schema & Core POS API Routes** | #2 (schema/architecture) and the data-layer portion of #4 | ✅ DONE (schema applied to Supabase project `pos-system`) |
| **Section 3 — Core POS Functions (UI)** | Remainder of #4 (transaction recording, inventory tracking, price adjustment, receipts as actual UI) | ✅ DONE |
| **Section 4 — AI Recommendation Module + Refinement Loop** | #5, #6, #7 (Gemini integration, statistical validation, the fixed 4-iteration loop) | ✅ DONE |
| **Section 5 — Deployment** | Infrastructure portion of #8, plus setup for #9 | ✅ DONE (configs + docs; owner deploys via GitHub) |
| *(no dedicated code section)* | #1 (requirements gathering), #8's testing portion, #9 (pilot testing), #10 (evaluation/comparison), #11 (handover docs) | These are process/deliverable activities, not code sections — handle them as write-ups, test runs, and the final user manual once Sections 1–5 are functional. |

**Key locked decisions from this list:** the refinement loop iteration count is fixed at 4 (#7) — not a variable, do not make it configurable "for flexibility." Auth is custom JWT + bcrypt, not NextAuth/Firebase (final choice within #4's listed options).

## 4. Core Architectural Pattern (must never be broken by any future section)

**Multi-tenancy via `store_id` scoping.** The system serves multiple tenants (currently: a clothing/RTW store, a vape shop, a cosmetic store) sharing one database and one codebase. Isolation is enforced entirely at the query level:

- Every tenant-owned table has a `store_id INTEGER NOT NULL REFERENCES stores(id)` column.
- Every SQL query touching tenant data filters `WHERE store_id = $1`, bound to `req.storeId` — **never** a client-supplied value.
- JWT payload shape: `{ userId, storeId, role }`.
- `middleware/requireAuth.js` is a **CommonJS module** (`module.exports = requireAuth`). It decodes the JWT and attaches `req.userId`, `req.storeId`, `req.role`. **Always import it as a default import** (`import requireAuth from '.../middleware/requireAuth'`), never as a named import — this caused a real bug earlier in the project.
- Naming convention: `snake_case` in SQL/Postgres, `camelCase` in JSON responses where noted.
- Roles: only `'owner'` and `'staff'` are valid; default is `'staff'`.

## 5. Section 1 — Auth & Multi-Tenancy (DONE)

Files that exist and should not be modified by future sections (only built on top of):

- `sql/001_auth_schema.sql` — `stores` and `users` tables, seeds two stores (Vape Shop, Cosmetic Store)
- `lib/db.js` — shared `pg` connection pool (reads `DATABASE_URL`; enables SSL for non-localhost)
- `lib/jwt.js` — `signToken()` / `verifyToken()`, 8-hour expiry
- `pages/api/auth/register.js` — creates a user under a given `store_id`, hashes password with bcrypt
- `pages/api/auth/login.js` — verifies credentials, returns JWT
- `middleware/requireAuth.js` — see Section 4 above for import behavior
- `pages/api/products/index.js` — example protected route (superseded by Section 2's `products/manage.js`)
- `.env.example`, `package.json`
- `SECTION_1_NOTES.md` — full documentation of what was built, assumptions, and limitations

Known limitations carried forward from Section 1: no input validation library (no Zod/Joi), no rate limiting on auth endpoints, no refresh tokens, no password strength rules, email uniqueness is global across all stores (same person can't use one email at two stores), register endpoint is currently open (no invite-only restriction — fine for capstone scope).

## 6. Section 2 — Database Schema & Core POS API Routes (DONE)

Build on top of Section 1. Do not modify Section 1 files.

**Supabase remote DB (live):**
- Project name: `pos-system`
- Project ref / id: `rfkoerdkpgyzoyzrmbxa`
- Region: `ap-southeast-1`
- Migrations applied: `001_auth_schema`, `002_pos_schema`
- Seeded stores: id 1 = Vape Shop, id 2 = Cosmetic Store
- Local env: `.env.local` created — user must paste database password into `DATABASE_URL`

**Files built:**
- `sql/002_pos_schema.sql`
- `pages/api/products/manage.js`
- `pages/api/transactions/create.js`
- `SECTION_2_NOTES.md`

### `sql/002_pos_schema.sql`

Four tables, all with `store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE` and an index on `store_id`:

- **`products`** — `id, store_id, name, sku, category, price NUMERIC(10,2), cost NUMERIC(10,2), stock_quantity INTEGER DEFAULT 0, is_active BOOLEAN DEFAULT TRUE, created_at, updated_at`. Unique `(store_id, sku)`.
- **`transactions`** — `id, store_id, user_id REFERENCES users(id), total_amount NUMERIC(10,2), payment_method VARCHAR(50) DEFAULT 'cash', status VARCHAR(20) DEFAULT 'completed', created_at`.
- **`transaction_items`** — `id, store_id, transaction_id REFERENCES transactions(id) ON DELETE CASCADE, product_id REFERENCES products(id), quantity INTEGER, unit_price NUMERIC(10,2), subtotal NUMERIC(10,2)`.
- **`inventory_logs`** — `id, store_id, product_id REFERENCES products(id), change_type VARCHAR(20)` ('restock' | 'sale' | 'adjustment'), `quantity_change INTEGER` (negative for sales, positive for restocks), `previous_stock INTEGER, new_stock INTEGER, reference_id INTEGER` (e.g. the transaction_id for a sale), `created_at`. This table is what the AI + statistical modules (Section 4) will read from later, so keep every stock-affecting action logged here.

### `pages/api/products/manage.js`

Wrapped with `requireAuth` (default import).
- `POST` — create a product scoped to `req.storeId`. Require `name` and `price`. Return 409 on duplicate SKU (Postgres error code `23505`).
- `GET` — list active products (`is_active = TRUE`) for `req.storeId`, ordered by name.

### `pages/api/transactions/create.js`

Wrapped with `requireAuth`. `POST` only. Body: `{ payment_method, items: [{ product_id, quantity }] }`.

Must be **atomic** — check out a single client from the pool (`pool.connect()`), wrap in `BEGIN`/`COMMIT`, `ROLLBACK` + release in `catch`/`finally`:

1. For each item, `SELECT ... FOR UPDATE` the product row (scoped by `store_id`) to lock it and read current price/stock.
2. If a product isn't found or stock is insufficient, throw and roll back (404 / 409 respectively).
3. Insert the `transactions` row (`user_id` from `req.userId`, computed `total_amount`).
4. For each item: insert its `transaction_items` row, `UPDATE products SET stock_quantity = ...`, and insert an `inventory_logs` row (`change_type = 'sale'`, `quantity_change` negative, `reference_id` = the transaction ID).
5. Commit, return `{ transaction_id, total_amount }`.

Why atomicity matters: stock counts and sales records must never drift out of sync — a failure partway through a checkout must leave the database exactly as if the sale never started.

## 7. Section 3 — Core POS UI (DONE)

Built on Sections 1–2 without modifying their API files.

**UI pages:**
- `/login` — staff login
- `/sales` — product grid, cart, checkout, receipt modal
- `/products` — search, add/edit slide-over, deactivate
- `/transactions` — paginated history, expandable line items
- `/` — redirects to `/login` or `/sales`

**Section 3-only API routes:**
- `pages/api/products/[id].js` — PUT update, PATCH deactivate
- `pages/api/transactions/index.js` — GET paginated history with line items

**Shared client auth:** `lib/api.js` (`authFetch`, JWT in `localStorage` keys `pos_token` / `pos_user`)

**Docs:** `SECTION_3_NOTES.md`

## 8. Section 4 — AI Recommendation Module + Refinement Loop (DONE)

**Analytics & orchestration (Next.js):**
- `lib/analytics.js` — product stats, 30-day trend, co-purchase pairs, daily sales per product
- `lib/gemini.js` — Gemini API integration (`gemini-1.5-flash`)
- `lib/refinementLoop.js` — fixed **4-iteration** loop (hardcoded, not configurable)
- `pages/api/analytics/summary.js` — GET sales snapshot
- `pages/api/recommendations/run.js` — POST runs full loop

**Python validation service (`validation-service/`):**
- Flask app on port 5000 — `POST /validate`
- Mann-Whitney U (trend: restock/promote/discontinue), chi-square (bundle co-purchase)
- p-value threshold 0.05

**UI:**
- `/insights` — trigger analysis, view validated recommendations + iteration log
- Nav link added to `components/Layout.js`

**Env vars:** `GEMINI_API_KEY`, `VALIDATION_SERVICE_URL` (see `.env.example`)

**Docs:** `SECTION_4_NOTES.md`

## 9. Section 5 — Deployment (DONE)

**Supabase Postgres** is already live (`pos-system`, ref `rfkoerdkpgyzoyzrmbxa`).

**Deployment configs added:**
- `render.yaml` — Blueprint for **pos-web** (Next.js) + **pos-validation** (Docker/gunicorn) on Render free tier
- `validation-service/Dockerfile` — Python validation container
- `sql/008_seed_test_sales.sql` — 25-day test sales for both stores (AI Insights)
- `SECTION_5_NOTES.md` — step-by-step Render deploy guide

**Test accounts:**
- Vape shop (store 1): `owner@vape.com` / `password123`
- Cosmetic store (store 2): `owner@cosmetic.com` / `password123`

**Owner action:** push to GitHub, then Render → **New Blueprint** → connect repo → set `DATABASE_URL`, `JWT_SECRET`, `GEMINI_API_KEY` on **pos-web**. See `SECTION_5_NOTES.md`.

## 10. Documentation Requirement — MANDATORY for every section, no exceptions

When resuming work in a new session or handing off to a different developer, **the only reliable handoff is code and documentation** — not chat history. For every section built, a `SECTION_N_NOTES.md` file must exist with exactly these headings:

- **What Was Built and Why** — one paragraph tying the section to the overall project goal
- **Files Created** — a table of file → purpose
- **Core Architectural Pattern** — restate the `store_id` scoping pattern (and any section-specific pattern, e.g. atomicity in Section 2) and confirm how this section follows it
- **Assumptions** — module style, naming conventions, anything you inferred that wasn't explicitly specified
- **Known Limitations / Unverified Items** — be honest here; this is what the next developer needs to know before trusting the code
- **What Section N+1 Needs From This Section** — concrete handoff notes: exact function signatures, endpoint contracts, table columns the next section will depend on

Also: after finishing each section, **update `PROJECT_CONTEXT.md`** (this file) — mark the section's status as DONE, append its file list to the relevant section above, and move the roadmap forward. Keep this file as the single source of truth for the whole project's state.

**Documentation tone (committed files only):** write `PROJECT_CONTEXT.md` and every `SECTION_N_NOTES.md` in neutral **developer** language. Do not mention Cursor, Claude, Copilot, Anysphere, or similar tooling in files that will be pushed to GitHub. Refer to future contributors as "developer" or "the next developer."

## 11. Working Instructions for Developers

1. **Read this file first** before making changes — it is the canonical project state.
2. **Read the latest `SECTION_N_NOTES.md`** for the section you are extending.
3. **Do not start a new section** until explicitly asked — build only the section marked "IN PROGRESS" or "CURRENT TASK" in this file.
4. **Never modify a completed section's files** unless a bug is reported in that section.
5. **Write real, working code** — no placeholders or unresolved TODOs.
6. **After finishing a section:** generate `SECTION_N_NOTES.md`, update this file (mark section DONE, append file list), and list exact file paths created.
7. **Preserve multi-tenancy:** every tenant query must filter by `req.storeId` from the JWT — never a client-supplied store ID.
8. **Follow Section 12** for all GitHub work, commit attribution, and repo hygiene — no exceptions.
9. **Follow Section 13** at the start and end of every session — local or remote — so all environments stay in sync.

## 13. Multi-session sync (local ↔ remote — MANDATORY)

Chat/conversation history **does not** sync between machines or tools. **Git + this file do.** Every session must follow this protocol automatically.

### Before any code changes

1. `git pull origin main`
2. Read this file — especially **Current session state** above
3. Read the relevant `SECTION_N_NOTES.md` for the area being changed

### After any code changes (before ending the session)

1. Update **Current session state** in this file:
   - `Last updated` date
   - Recently completed (bullet list)
   - In progress / owner actions
   - Known issues
   - **Next task** (one line — what the next session should pick up)
2. If architecture, endpoints, or env vars changed → update the matching section above and/or `SECTION_N_NOTES.md`
3. Review `git status` — no secrets, no tool watermark folders (Section 12)
4. Commit and **push to `main`** (unless the owner explicitly asked for a feature branch)
5. Note in **Current session state** whether Render **pos-web** needs a Manual Deploy

### Branch policy

- Default branch: **`main`**
- Do not leave completed work unpushed at session end
- After pulling on another machine: `git pull` then continue

### Render deploy reminder

Pushing to GitHub does not always redeploy Render. After pushes that affect production, check Render dashboard or trigger **Manual Deploy** on **pos-web**.

### Remote/cloud development

Remote agents clone from GitHub — they only see what is pushed. Secrets (`DATABASE_URL`, `JWT_SECRET`, `GEMINI_API_KEY`) live in Render dashboard and local `.env.local`, not in the repo.

---

## 12. GitHub, Attribution, and Repo Hygiene (MANDATORY)

These rules apply whenever you init a repo, commit, push, open a PR, use `gh`, or add GitHub Actions. **Tell the project owner immediately** before doing any GitHub-related work so they can approve or decide how to handle it.

### Commit identity (must look like the owner wrote everything)

Every commit pushed to GitHub must appear as the repository owner only:

| Field | Value |
|---|---|
| **Name** | Marc Justin Lee G. Granada |
| **Email** | granadam96@gmail.com |

Before the first commit in a session, set **local** repo config (do not change global git config unless the owner asks):

```bash
git config user.name "Marc Justin Lee G. Granada"
git config user.email "granadam96@gmail.com"
```

Verify with `git log -1 --format="%an <%ae>"` before pushing.

### What must never appear in Git history or on GitHub

- `Co-authored-by:` trailers (or any trailer) naming any AI assistant, coding agent, or editor vendor (Cursor, Anysphere, Claude, Anthropic, Copilot, Windsurf, Codeium, Aider, ChatGPT, etc.)
- Author or committer fields set to an AI tool or vendor identity
- Commit messages that say "AI-generated", "written by Cursor", "assisted by…", etc.
- Pushed files that reveal which AI/editor tool was used (hidden tool folders, tool-specific config files, vendor watermarks in settings)
- Secrets: `.env`, `.env.local`, API keys, database passwords, JWT secrets

Write commit messages like a normal developer would — short, factual, focused on what changed and why.

### Files and folders to keep out of the repo (no tool watermarks)

**Rule of thumb:** if a file or folder exists only because an AI coding assistant or vendor IDE plugin created it, it must **not** be committed. When you encounter a new tool during development, add its local artifacts to `.gitignore` before pushing.

**Hidden tool folders** (non-exhaustive — extend as needed):

| Pattern | Typical source |
|---|---|
| `.cursor/` | Cursor |
| `.claude/` | Claude Code |
| `.windsurf/` | Windsurf |
| `.aider*` | Aider |
| `.continue/` | Continue |
| `.codeium/` | Codeium |
| `.copilot/` | GitHub Copilot local state |

**Tool-specific root files** (also in `.gitignore`): `.cursorrules`, `.claudeignore`, `.windsurfrules`, `copilot-instructions.md`, and similar vendor-named instruction files.

**Other exclusions:**

- **`.env` / `.env.local`** — already ignored; never force-add them.
- **`.vscode/` / `.idea/`** — if committed, strip any settings referencing AI/editor vendors (`cursor`, `anysphere`, `claude`, `anthropic`, `copilot`, `windsurf`, `codeium`, `aider`, etc.) unless removal breaks legitimate shared project settings. When in doubt, add the whole folder to `.gitignore` instead of committing editor-specific files.

**Before every commit:** run `git status` and inspect anything unfamiliar (especially dot-folders and dot-files). If it looks tool-generated, ignore it — do not `-f` force-add.

### Documentation and handoff continuity

When you finish work and update handoff docs:

1. Keep `PROJECT_CONTEXT.md` and `SECTION_N_NOTES.md` tool-neutral (see Section 10).
2. **Copy forward Sections 12 and 13** — do not delete or shorten these rules. The next developer must inherit the same GitHub, hygiene, and session-sync requirements.
3. Do not add README badges, "built with X AI", or contributor notes that reveal automated tooling.

### Quick checklist before push

- [ ] Local `user.name` / `user.email` set to owner identity
- [ ] No AI/tool names in commit message or trailers
- [ ] All AI/tool folders and watermark files in `.gitignore` and not staged (`.cursor/`, `.claude/`, etc.)
- [ ] No secrets or `.env*` files staged
- [ ] `.vscode/` / `.idea/` cleaned of AI/editor vendor references (or not committed)
- [ ] `git status` reviewed — no unfamiliar dot-folders or tool config files staged
- [ ] Handoff docs updated without tool-specific branding
