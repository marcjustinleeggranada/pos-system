-- Optional vape flavor (free text, shown when category = vape)
-- Run after 004_product_subcategory.sql

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS flavor VARCHAR(100);

COMMENT ON COLUMN products.flavor IS 'Optional flavor for vape products (e.g. Blue Razz, Mint)';
