-- Store-scoped vape product lines (editable labels/specs) + optional product description
-- Run after 009_product_costs_and_reseed.sql

CREATE TABLE IF NOT EXISTS vape_product_lines (
  store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  line_key VARCHAR(100) NOT NULL,
  label VARCHAR(255) NOT NULL,
  specs JSONB NOT NULL DEFAULT '[]'::jsonb,
  default_price NUMERIC(10, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (store_id, line_key)
);

CREATE INDEX IF NOT EXISTS idx_vape_product_lines_store_id ON vape_product_lines(store_id);

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS description TEXT;

-- Seed built-in vape lines for store 1 (Vape Shop)
INSERT INTO vape_product_lines (store_id, line_key, label, specs, default_price)
VALUES
  (
    1,
    'black_elite',
    'Black Elite (~50k puffs)',
    '["Approx 50k puffs","Transparent case","30 MG/ML freebase","Mesh coil"]'::jsonb,
    599
  ),
  (
    1,
    'black_empire',
    'Black Empire (~30k puffs)',
    '["Approx 30k puffs","Transparent case","18 MG/ML liquid","Leak-proof"]'::jsonb,
    499
  ),
  (
    1,
    'black_space',
    'Black Space (~30k puffs)',
    '["Approx 30k puffs","2x mesh coil"]'::jsonb,
    499
  )
ON CONFLICT (store_id, line_key) DO NOTHING;
