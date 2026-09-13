-- Replace demo/fake catalog with real vape + make-up inventory
-- Clears all sales history and products, then loads store catalog.
-- store_id 1 = Vape Shop | store_id 2 = Cosmetic Store

BEGIN;

DELETE FROM inventory_logs;
DELETE FROM transaction_items;
DELETE FROM transactions;
DELETE FROM products;

-- =============================================================================
-- VAPE SHOP (store_id = 1) — Black Elite @ 599 PHP
-- =============================================================================
INSERT INTO products (store_id, name, sku, category, subcategory, flavor, price, stock_quantity) VALUES
(1, 'Black Elite — Watermelon (Red Pulp)', 'BE-01', 'vape', 'black_elite', 'Watermelon (Red Pulp)', 599, 5),
(1, 'Black Elite — Mango (Yellow Summer)', 'BE-02', 'vape', 'black_elite', 'Mango (Yellow Summer)', 599, 5),
(1, 'Black Elite — Strawberry (Very Baguio)', 'BE-03', 'vape', 'black_elite', 'Strawberry (Very Baguio)', 599, 5),
(1, 'Black Elite — Mixed Berries (Very More)', 'BE-04', 'vape', 'black_elite', 'Mixed Berries (Very More)', 599, 5),
(1, 'Black Elite — Yakult (Bacteria Monster)', 'BE-05', 'vape', 'black_elite', 'Yakult (Bacteria Monster)', 599, 5),
(1, 'Black Elite — Bubblegum (Red Cannon)', 'BE-06', 'vape', 'black_elite', 'Bubblegum (Red Cannon)', 599, 5),
(1, 'Black Elite — Grapes (Trouble Purple)', 'BE-07', 'vape', 'black_elite', 'Grapes (Trouble Purple)', 599, 5),
(1, 'Black Elite — Black Currant (Black Wave)', 'BE-08', 'vape', 'black_elite', 'Black Currant (Black Wave)', 599, 5),
(1, 'Black Elite — Blueberry (Blue Freeze)', 'BE-09', 'vape', 'black_elite', 'Blueberry (Blue Freeze)', 599, 5),
(1, 'Black Elite — Strawberry Banana (Pink Sunset)', 'BE-10', 'vape', 'black_elite', 'Strawberry Banana (Pink Sunset)', 599, 5);

-- Black Empire @ 499 PHP
INSERT INTO products (store_id, name, sku, category, subcategory, flavor, price, stock_quantity) VALUES
(1, 'Black Empire — Watermelon', 'BEM-01', 'vape', 'black_empire', 'Watermelon', 499, 5),
(1, 'Black Empire — Bubblegum', 'BEM-02', 'vape', 'black_empire', 'Bubblegum', 499, 5),
(1, 'Black Empire — Grapes', 'BEM-03', 'vape', 'black_empire', 'Grapes', 499, 5),
(1, 'Black Empire — Black Currant', 'BEM-04', 'vape', 'black_empire', 'Black Currant', 499, 5),
(1, 'Black Empire — Gummy Bear', 'BEM-05', 'vape', 'black_empire', 'Gummy Bear', 499, 5),
(1, 'Black Empire — Yakult', 'BEM-06', 'vape', 'black_empire', 'Yakult', 499, 5),
(1, 'Black Empire — Mango', 'BEM-07', 'vape', 'black_empire', 'Mango', 499, 5),
(1, 'Black Empire — Banana', 'BEM-08', 'vape', 'black_empire', 'Banana', 499, 5),
(1, 'Black Empire — Cheesecake', 'BEM-09', 'vape', 'black_empire', 'Cheesecake', 499, 5),
(1, 'Black Empire — Lychee', 'BEM-10', 'vape', 'black_empire', 'Lychee', 499, 5),
(1, 'Black Empire — Ube', 'BEM-11', 'vape', 'black_empire', 'Ube', 499, 5),
(1, 'Black Empire — Avocado', 'BEM-12', 'vape', 'black_empire', 'Avocado', 499, 5);

-- Black Space @ 499 PHP
INSERT INTO products (store_id, name, sku, category, subcategory, flavor, price, stock_quantity) VALUES
(1, 'Black Space — Taro (Mercury)', 'BS-01', 'vape', 'black_space', 'Taro (Mercury)', 499, 5),
(1, 'Black Space — Grapes (Venus)', 'BS-02', 'vape', 'black_space', 'Grapes (Venus)', 499, 5),
(1, 'Black Space — Double Apple (Mars)', 'BS-03', 'vape', 'black_space', 'Double Apple (Mars)', 499, 5),
(1, 'Black Space — Black Currant (Jupiter)', 'BS-04', 'vape', 'black_space', 'Black Currant (Jupiter)', 499, 5),
(1, 'Black Space — Yakult (Saturn)', 'BS-05', 'vape', 'black_space', 'Yakult (Saturn)', 499, 5),
(1, 'Black Space — Nerds (Neptune)', 'BS-06', 'vape', 'black_space', 'Nerds (Neptune)', 499, 5),
(1, 'Black Space — Koolaid (Uranus)', 'BS-07', 'vape', 'black_space', 'Koolaid (Uranus)', 499, 5),
(1, 'Black Space — Gummy Worms (Pluto)', 'BS-08', 'vape', 'black_space', 'Gummy Worms (Pluto)', 499, 5),
(1, 'Black Space — Watermelon (Galaxy)', 'BS-09', 'vape', 'black_space', 'Watermelon (Galaxy)', 499, 5),
(1, 'Black Space — Mixed Berries (Asteroid)', 'BS-10', 'vape', 'black_space', 'Mixed Berries (Asteroid)', 499, 5);

-- =============================================================================
-- COSMETIC STORE (store_id = 2) — Make-up
-- =============================================================================

-- Blush on
INSERT INTO products (store_id, name, sku, category, subcategory, price, stock_quantity) VALUES
(2, 'Sassy - Pigment Blush — Honeypeach (0201)', 'MK-BL-SASSY-0201', 'makeup', 'blush', 70, 1),
(2, 'Cloud Beauty - Blush — Muted', 'MK-BL-CLOUD-MUTED', 'makeup', 'blush', 75, 1),
(2, 'Detail - Melting Blush Touch — Tutu', 'MK-BL-DETAIL-TUTU', 'makeup', 'blush', 75, 1),
(2, 'Maange - Blush Stick', 'MK-BL-MAANGE', 'makeup', 'blush', 40, 1),
(2, 'Cloud Beauty - Green Therapy Blush Serum', 'MK-BL-CLOUD-GREEN', 'makeup', 'blush', 30, 1);

-- Powder
INSERT INTO products (store_id, name, sku, category, subcategory, price, stock_quantity) VALUES
(2, 'Sea Makeup — Panna Cotta', 'MK-PW-SEA-PANNA', 'makeup', 'powder', 150, 1),
(2, 'Nichido Powder — Ivory Glow', 'MK-PW-NICH-IVORY', 'makeup', 'powder', 100, 1),
(2, 'Nichido Powder — Creamy Glow', 'MK-PW-NICH-CREAM', 'makeup', 'powder', 100, 1);

-- Foundation
INSERT INTO products (store_id, name, sku, category, subcategory, price, stock_quantity) VALUES
(2, 'Maybelline - Superstay — 119', 'MK-FN-MAYB-119', 'makeup', 'foundation', 160, 1),
(2, 'Maybelline - Superstay — 123', 'MK-FN-MAYB-123', 'makeup', 'foundation', 160, 1);

-- Bundles
INSERT INTO products (store_id, name, sku, category, subcategory, price, stock_quantity) VALUES
(2, 'B1 — Eyeshadow (AFLAME), Lash Primer, Eyeliner', 'BUNDLE-B1', 'bundles', 'makeup_bundle', 329, 3),
(2, 'B2 — Concealer Pen (01), Foundation (150 Cool Fawn), Pressed Powder (Fresh Beige)', 'BUNDLE-B2', 'bundles', 'makeup_bundle', 429, 3),
(2, 'B3 — Matte Liquid Lipstick (0R02), Eyebrow Powder (02)', 'BUNDLE-B3', 'bundles', 'makeup_bundle', 199, 3),
(2, 'B4 — Matte Pressed Powder (04), Clay Blush (01 Joyous)', 'BUNDLE-B4', 'bundles', 'makeup_bundle', 269, 3),
(2, 'B5 — Primer, Waterproof Foundation (02)', 'BUNDLE-B5', 'bundles', 'makeup_bundle', 289, 3),
(2, 'B6 — Sunscreen, Cleanser', 'BUNDLE-B6', 'bundles', 'makeup_bundle', 199, 3),
(2, 'B7 — Duo Lippie (02), Lip & Cheek Stain (Splash Red)', 'BUNDLE-B7', 'bundles', 'makeup_bundle', 219, 3),
(2, 'B8 — Tinted Lip Gloss (Ethereal), Bounce Blush (03)', 'BUNDLE-B8', 'bundles', 'makeup_bundle', 259, 3),
(2, 'B9 — Owen James Lippie (02), Contour Stick (03), Lip Oil (001 Rosy Glow)', 'BUNDLE-B9', 'bundles', 'makeup_bundle', 329, 3),
(2, 'B10 — BB Cushion Powder (03 Beige), Lip & Cheek Cream (P06), Powder Blush (04 Coral)', 'BUNDLE-B10', 'bundles', 'makeup_bundle', 429, 3);

COMMIT;
