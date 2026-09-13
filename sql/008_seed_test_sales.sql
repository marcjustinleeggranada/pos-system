-- Test sales history for AI Insights (both tenants, last ~25 days)
-- Patterns baked in for statistical validation:
--   Store 1 (Vape): BE-02 Mango rising, BEM-03 Grapes declining, BE-01+BEM-06 co-purchase
--   Store 2 (Cosmetics): BUNDLE-B3 rising, MK-BL-CLOUD-GREEN declining, BUNDLE-B1+MK-PW-SEA co-purchase

BEGIN;

DELETE FROM inventory_logs;
DELETE FROM transaction_items;
DELETE FROM transactions;

-- =============================================================================
-- STORE 1 — Vape Shop
-- =============================================================================
DO $$
DECLARE
  v_user_id INTEGER;
  v_mango_id INTEGER;
  v_grapes_id INTEGER;
  v_elite_wm_id INTEGER;
  v_empire_yakult_id INTEGER;
  v_space_id INTEGER;
  v_tx_id INTEGER;
  v_day INTEGER;
  v_qty INTEGER;
  v_price NUMERIC(10,2);
  v_total NUMERIC(10,2);
  v_created TIMESTAMPTZ;
  v_methods TEXT[] := ARRAY['cash', 'gcash', 'card'];
  v_method TEXT;
BEGIN
  SELECT id INTO v_user_id FROM users WHERE store_id = 1 ORDER BY id LIMIT 1;
  SELECT id INTO v_mango_id FROM products WHERE store_id = 1 AND sku = 'BE-02';
  SELECT id INTO v_grapes_id FROM products WHERE store_id = 1 AND sku = 'BEM-03';
  SELECT id INTO v_elite_wm_id FROM products WHERE store_id = 1 AND sku = 'BE-01';
  SELECT id INTO v_empire_yakult_id FROM products WHERE store_id = 1 AND sku = 'BEM-06';
  SELECT id INTO v_space_id FROM products WHERE store_id = 1 AND sku = 'BS-05';

  IF v_user_id IS NULL OR v_mango_id IS NULL THEN
    RAISE EXCEPTION 'Missing vape store user or BE-02 product';
  END IF;

  v_price := 599.00;

  -- Mango (BE-02): slow early, strong recent → restock / promote signal
  FOR v_day IN REVERSE 25..1 LOOP
    v_created := NOW() - (v_day || ' days')::INTERVAL;
    v_method := v_methods[1 + (v_day % 3)];

    IF v_day >= 14 THEN
      IF v_day % 3 = 0 THEN
        v_qty := 1;
        v_total := v_price * v_qty;
        INSERT INTO transactions (store_id, user_id, total_amount, payment_method, created_at)
        VALUES (1, v_user_id, v_total, v_method, v_created) RETURNING id INTO v_tx_id;
        INSERT INTO transaction_items (store_id, transaction_id, product_id, quantity, unit_price, subtotal)
        VALUES (1, v_tx_id, v_mango_id, v_qty, v_price, v_total);
      END IF;
    ELSE
      v_qty := 2 + (v_day % 2);
      v_total := v_price * v_qty;
      INSERT INTO transactions (store_id, user_id, total_amount, payment_method, created_at)
      VALUES (1, v_user_id, v_total, v_method, v_created) RETURNING id INTO v_tx_id;
      INSERT INTO transaction_items (store_id, transaction_id, product_id, quantity, unit_price, subtotal)
      VALUES (1, v_tx_id, v_mango_id, v_qty, v_price, v_total);

      IF v_elite_wm_id IS NOT NULL AND v_empire_yakult_id IS NOT NULL AND v_day <= 10 THEN
        INSERT INTO transaction_items (store_id, transaction_id, product_id, quantity, unit_price, subtotal)
        VALUES (1, v_tx_id, v_elite_wm_id, 1, 599.00, 599.00);
        INSERT INTO transaction_items (store_id, transaction_id, product_id, quantity, unit_price, subtotal)
        VALUES (1, v_tx_id, v_empire_yakult_id, 1, 499.00, 499.00);
        v_total := v_total + 1098.00;
        UPDATE transactions SET total_amount = v_total WHERE id = v_tx_id;
      END IF;
    END IF;
  END LOOP;

  -- Grapes Empire (BEM-03): strong early, weak recent → discontinue signal
  IF v_grapes_id IS NOT NULL THEN
    v_price := 499.00;
    FOR v_day IN REVERSE 25..1 LOOP
      v_created := NOW() - (v_day || ' days')::INTERVAL;
      v_method := v_methods[1 + (v_day % 3)];

      IF v_day >= 14 THEN
        v_qty := 2 + (v_day % 2);
      ELSIF v_day % 5 = 0 THEN
        v_qty := 1;
      ELSE
        CONTINUE;
      END IF;

      v_total := v_price * v_qty;
      INSERT INTO transactions (store_id, user_id, total_amount, payment_method, created_at)
      VALUES (1, v_user_id, v_total, v_method, v_created) RETURNING id INTO v_tx_id;
      INSERT INTO transaction_items (store_id, transaction_id, product_id, quantity, unit_price, subtotal)
      VALUES (1, v_tx_id, v_grapes_id, v_qty, v_price, v_total);
    END LOOP;
  END IF;

  -- Black Space Yakult: steady background sales
  IF v_space_id IS NOT NULL THEN
    v_price := 499.00;
    FOR v_day IN REVERSE 24..1 BY 3 LOOP
      v_created := NOW() - (v_day || ' days')::INTERVAL;
      INSERT INTO transactions (store_id, user_id, total_amount, payment_method, created_at)
      VALUES (1, v_user_id, v_price, 'cash', v_created) RETURNING id INTO v_tx_id;
      INSERT INTO transaction_items (store_id, transaction_id, product_id, quantity, unit_price, subtotal)
      VALUES (1, v_tx_id, v_space_id, 1, v_price, v_price);
    END LOOP;
  END IF;
END $$;

-- =============================================================================
-- STORE 2 — Cosmetic Store
-- =============================================================================
DO $$
DECLARE
  v_user_id INTEGER;
  v_bundle_b3_id INTEGER;
  v_green_serum_id INTEGER;
  v_bundle_b1_id INTEGER;
  v_sea_powder_id INTEGER;
  v_maybelline_id INTEGER;
  v_tx_id INTEGER;
  v_day INTEGER;
  v_qty INTEGER;
  v_price NUMERIC(10,2);
  v_total NUMERIC(10,2);
  v_created TIMESTAMPTZ;
  v_methods TEXT[] := ARRAY['cash', 'gcash', 'card'];
  v_method TEXT;
BEGIN
  SELECT id INTO v_user_id FROM users WHERE store_id = 2 ORDER BY id LIMIT 1;
  SELECT id INTO v_bundle_b3_id FROM products WHERE store_id = 2 AND sku = 'BUNDLE-B3';
  SELECT id INTO v_green_serum_id FROM products WHERE store_id = 2 AND sku = 'MK-BL-CLOUD-GREEN';
  SELECT id INTO v_bundle_b1_id FROM products WHERE store_id = 2 AND sku = 'BUNDLE-B1';
  SELECT id INTO v_sea_powder_id FROM products WHERE store_id = 2 AND sku = 'MK-PW-SEA-PANNA';
  SELECT id INTO v_maybelline_id FROM products WHERE store_id = 2 AND sku = 'MK-FN-MAYB-119';

  IF v_user_id IS NULL OR v_bundle_b3_id IS NULL THEN
    RAISE EXCEPTION 'Missing cosmetic store user or BUNDLE-B3 product';
  END IF;

  v_price := 199.00;

  -- BUNDLE-B3: rising sales
  FOR v_day IN REVERSE 25..1 LOOP
    v_created := NOW() - (v_day || ' days')::INTERVAL;
    v_method := v_methods[1 + (v_day % 3)];

    IF v_day >= 14 THEN
      IF v_day % 4 = 0 THEN
        v_qty := 1;
        v_total := v_price * v_qty;
        INSERT INTO transactions (store_id, user_id, total_amount, payment_method, created_at)
        VALUES (2, v_user_id, v_total, v_method, v_created) RETURNING id INTO v_tx_id;
        INSERT INTO transaction_items (store_id, transaction_id, product_id, quantity, unit_price, subtotal)
        VALUES (2, v_tx_id, v_bundle_b3_id, v_qty, v_price, v_total);
      END IF;
    ELSE
      v_qty := 1 + (v_day % 3);
      v_total := v_price * v_qty;
      INSERT INTO transactions (store_id, user_id, total_amount, payment_method, created_at)
      VALUES (2, v_user_id, v_total, v_method, v_created) RETURNING id INTO v_tx_id;
      INSERT INTO transaction_items (store_id, transaction_id, product_id, quantity, unit_price, subtotal)
      VALUES (2, v_tx_id, v_bundle_b3_id, v_qty, v_price, v_total);

      IF v_bundle_b1_id IS NOT NULL AND v_sea_powder_id IS NOT NULL AND v_day <= 12 THEN
        INSERT INTO transaction_items (store_id, transaction_id, product_id, quantity, unit_price, subtotal)
        VALUES (2, v_tx_id, v_bundle_b1_id, 1, 329.00, 329.00);
        INSERT INTO transaction_items (store_id, transaction_id, product_id, quantity, unit_price, subtotal)
        VALUES (2, v_tx_id, v_sea_powder_id, 1, 150.00, 150.00);
        v_total := v_total + 479.00;
        UPDATE transactions SET total_amount = v_total WHERE id = v_tx_id;
      END IF;
    END IF;
  END LOOP;

  -- Green Therapy Blush Serum: declining
  IF v_green_serum_id IS NOT NULL THEN
    v_price := 30.00;
    FOR v_day IN REVERSE 25..1 LOOP
      v_created := NOW() - (v_day || ' days')::INTERVAL;

      IF v_day >= 14 THEN
        v_qty := 2;
      ELSIF v_day % 6 = 0 THEN
        v_qty := 1;
      ELSE
        CONTINUE;
      END IF;

      v_total := v_price * v_qty;
      INSERT INTO transactions (store_id, user_id, total_amount, payment_method, created_at)
      VALUES (2, v_user_id, v_total, 'cash', v_created) RETURNING id INTO v_tx_id;
      INSERT INTO transaction_items (store_id, transaction_id, product_id, quantity, unit_price, subtotal)
      VALUES (2, v_tx_id, v_green_serum_id, v_qty, v_price, v_total);
    END LOOP;
  END IF;

  -- Maybelline foundation: occasional individual sales
  IF v_maybelline_id IS NOT NULL THEN
    v_price := 160.00;
    FOR v_day IN SELECT unnest(ARRAY[23, 18, 11, 6, 2]) LOOP
      v_created := NOW() - (v_day || ' days')::INTERVAL;
      INSERT INTO transactions (store_id, user_id, total_amount, payment_method, created_at)
      VALUES (2, v_user_id, v_price, 'gcash', v_created) RETURNING id INTO v_tx_id;
      INSERT INTO transaction_items (store_id, transaction_id, product_id, quantity, unit_price, subtotal)
      VALUES (2, v_tx_id, v_maybelline_id, 1, v_price, v_price);
    END LOOP;
  END IF;
END $$;

COMMIT;
