-- Add subcategory for dependent category dropdowns (vape type, clothing size, etc.)
-- Run after 002_pos_schema.sql

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS subcategory VARCHAR(100);

CREATE INDEX IF NOT EXISTS idx_products_category_subcategory
  ON products (store_id, category, subcategory);

COMMENT ON COLUMN products.category IS 'Main retail category key (e.g. vape, clothing, cosmetics)';
COMMENT ON COLUMN products.subcategory IS 'Dependent subcategory key (e.g. disposable, m, skincare)';
