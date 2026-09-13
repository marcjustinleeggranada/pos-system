-- Section 1: Auth & multi-tenancy foundation
-- Run this against your PostgreSQL database before starting the app.

CREATE TABLE IF NOT EXISTS stores (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE RESTRICT,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'staff',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT users_role_check CHECK (role IN ('owner', 'staff'))
);

CREATE INDEX IF NOT EXISTS idx_users_store_id ON users(store_id);

-- Seed the two retail tenants (run once on a fresh database)
INSERT INTO stores (name)
VALUES ('Vape Shop'), ('Cosmetic Store');
