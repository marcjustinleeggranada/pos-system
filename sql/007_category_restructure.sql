-- Restructure categories: individual|bundle → vape|cosmetics (+ vape_line for vape SKUs)
-- Run after 006_real_catalog.sql

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS vape_line VARCHAR(100);

-- Vape flavors: old category='vape', subcategory=product line
UPDATE products
SET vape_line = subcategory,
    category = 'individual',
    subcategory = 'vape'
WHERE category = 'vape';

-- Individual cosmetics (old makeup category)
UPDATE products
SET category = 'individual',
    subcategory = 'cosmetics',
    vape_line = NULL,
    flavor = NULL
WHERE category = 'makeup';

-- Bundles (old bundles category)
UPDATE products
SET category = 'bundle',
    subcategory = 'cosmetics',
    vape_line = NULL,
    flavor = NULL
WHERE category = 'bundles';

-- Cosmetic store owner (password: password123)
INSERT INTO users (store_id, email, password_hash, role)
SELECT 2, 'owner@cosmetic.com', '$2b$12$mZ.E2gFTOPAR/dJg1MqDFOS4bzo6W47KXvlBYdPXaulLIPgsNTJYq', 'owner'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'owner@cosmetic.com');
