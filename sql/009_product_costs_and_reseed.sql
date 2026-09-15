-- Apply product costs (vape ₱195; cosmetic bundles = items × ₱133.33, capped at 72% of price),
-- clear all sales history, then reload demo sales for AI Insights.
-- Run on Supabase SQL editor, or use: npm run reset:insights-data

BEGIN;

-- Vape shop: flat unit cost
UPDATE products
SET cost = 195.00, updated_at = NOW()
WHERE store_id = 1;

-- Cosmetic bundles (2–3 items × ₱133.33; cap when raw cost exceeds retail)
UPDATE products SET cost = 236.88, updated_at = NOW() WHERE store_id = 2 AND sku = 'BUNDLE-B1';  -- 3 items, price 329
UPDATE products SET cost = 399.99, updated_at = NOW() WHERE store_id = 2 AND sku = 'BUNDLE-B2';  -- 3 items, price 429
UPDATE products SET cost = 143.28, updated_at = NOW() WHERE store_id = 2 AND sku = 'BUNDLE-B3';  -- 2 items, price 199
UPDATE products SET cost = 266.66, updated_at = NOW() WHERE store_id = 2 AND sku = 'BUNDLE-B4';  -- 2 items, price 269
UPDATE products SET cost = 266.66, updated_at = NOW() WHERE store_id = 2 AND sku = 'BUNDLE-B5';  -- 2 items, price 289
UPDATE products SET cost = 143.28, updated_at = NOW() WHERE store_id = 2 AND sku = 'BUNDLE-B6';  -- 2 items, price 199
UPDATE products SET cost = 157.68, updated_at = NOW() WHERE store_id = 2 AND sku = 'BUNDLE-B7';  -- 2 items, price 219
UPDATE products SET cost = 186.48, updated_at = NOW() WHERE store_id = 2 AND sku = 'BUNDLE-B8';  -- 2 items, price 259
UPDATE products SET cost = 236.88, updated_at = NOW() WHERE store_id = 2 AND sku = 'BUNDLE-B9';  -- 3 items, price 329
UPDATE products SET cost = 399.99, updated_at = NOW() WHERE store_id = 2 AND sku = 'BUNDLE-B10'; -- 3 items, price 429

-- Individual cosmetics (~45% of retail)
UPDATE products SET cost = 31.50, updated_at = NOW() WHERE store_id = 2 AND sku = 'MK-BL-SASSY-0201';
UPDATE products SET cost = 33.75, updated_at = NOW() WHERE store_id = 2 AND sku = 'MK-BL-CLOUD-MUTED';
UPDATE products SET cost = 33.75, updated_at = NOW() WHERE store_id = 2 AND sku = 'MK-BL-DETAIL-TUTU';
UPDATE products SET cost = 18.00, updated_at = NOW() WHERE store_id = 2 AND sku = 'MK-BL-MAANGE';
UPDATE products SET cost = 13.50, updated_at = NOW() WHERE store_id = 2 AND sku = 'MK-BL-CLOUD-GREEN';
UPDATE products SET cost = 67.50, updated_at = NOW() WHERE store_id = 2 AND sku = 'MK-PW-SEA-PANNA';
UPDATE products SET cost = 45.00, updated_at = NOW() WHERE store_id = 2 AND sku = 'MK-PW-NICH-IVORY';
UPDATE products SET cost = 45.00, updated_at = NOW() WHERE store_id = 2 AND sku = 'MK-PW-NICH-CREAM';
UPDATE products SET cost = 72.00, updated_at = NOW() WHERE store_id = 2 AND sku = 'MK-FN-MAYB-119';
UPDATE products SET cost = 72.00, updated_at = NOW() WHERE store_id = 2 AND sku = 'MK-FN-MAYB-123';

DELETE FROM inventory_logs;
DELETE FROM transaction_items;
DELETE FROM transactions;

COMMIT;

-- After COMMIT, run sql/008_seed_test_sales.sql to load demo transaction history.
