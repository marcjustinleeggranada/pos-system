import requireAuth from '../../../middleware/requireAuth';
import pool from '../../../lib/db';

const { formatProduct } = require('../../../lib/formatProduct');
const { validateProductCategory, normalizeProductFlavor } = require('../../../lib/categories');
const { buildVapeProductName } = require('../../../lib/vapeCatalog');
const { vapeLineExistsForStore } = require('../../../lib/vapeLines');

const PRODUCT_COLUMNS = `id, store_id, name, sku, category, subcategory, vape_line, flavor, description, price, cost, stock_quantity, is_active, created_at, updated_at`;

async function handler(req, res) {
  const productId = Number(req.query.id);
  if (!Number.isInteger(productId) || productId <= 0) {
    return res.status(400).json({ error: 'Invalid product id' });
  }

  if (req.method === 'PUT') {
    const {
      name,
      price,
      sku,
      category,
      subcategory,
      vape_line,
      flavor,
      description,
      cost,
      stock_quantity,
    } = req.body || {};

    if (price === undefined || price === null) {
      return res.status(400).json({ error: 'price is required' });
    }

    const categoryCheck = validateProductCategory(category, subcategory, vape_line, req.storeId);
    if (!categoryCheck.ok) {
      return res.status(400).json({ error: categoryCheck.error });
    }

    const flavorCheck = normalizeProductFlavor(
      categoryCheck.subcategory,
      categoryCheck.category,
      flavor
    );
    if (!flavorCheck.ok) {
      return res.status(400).json({ error: flavorCheck.error });
    }

    if (
      categoryCheck.subcategory === 'vape' &&
      categoryCheck.vape_line &&
      !(await vapeLineExistsForStore(pool, req.storeId, categoryCheck.vape_line))
    ) {
      return res.status(400).json({ error: 'invalid product line' });
    }

    const parsedPrice = Number(price);
    if (Number.isNaN(parsedPrice) || parsedPrice < 0) {
      return res.status(400).json({ error: 'price must be a non-negative number' });
    }

    const parsedCost = cost === undefined || cost === null ? null : Number(cost);
    if (parsedCost !== null && (Number.isNaN(parsedCost) || parsedCost < 0)) {
      return res.status(400).json({ error: 'cost must be a non-negative number' });
    }

    const parsedStock =
      stock_quantity === undefined || stock_quantity === null ? 0 : Number(stock_quantity);
    if (!Number.isInteger(parsedStock) || parsedStock < 0) {
      return res.status(400).json({ error: 'stock_quantity must be a non-negative integer' });
    }

    let productName = name ? String(name).trim() : '';
    if (
      categoryCheck.subcategory === 'vape' &&
      categoryCheck.category === 'individual'
    ) {
      productName =
        buildVapeProductName(categoryCheck.vape_line, flavorCheck.flavor) || productName;
    }

    if (!productName) {
      return res.status(400).json({ error: 'name is required' });
    }

    const normalizedDescription =
      description === undefined || description === null
        ? null
        : String(description).trim() || null;

    try {
      if (
        categoryCheck.subcategory === 'vape' &&
        categoryCheck.vape_line &&
        flavorCheck.flavor
      ) {
        const dupe = await pool.query(
          `SELECT id FROM products
           WHERE store_id = $1 AND vape_line = $2 AND LOWER(flavor) = LOWER($3)
             AND is_active = TRUE AND id <> $4`,
          [req.storeId, categoryCheck.vape_line, flavorCheck.flavor, productId]
        );
        if (dupe.rows.length > 0) {
          return res.status(409).json({ error: 'This flavor already exists for that product line' });
        }
      }

      const result = await pool.query(
        `UPDATE products
         SET name = $1, sku = $2, category = $3, subcategory = $4, vape_line = $5, flavor = $6,
             description = $7, price = $8, cost = $9, stock_quantity = $10, updated_at = NOW()
         WHERE id = $11 AND store_id = $12 AND is_active = TRUE
         RETURNING ${PRODUCT_COLUMNS}`,
        [
          productName,
          sku ? String(sku).trim() : null,
          categoryCheck.category,
          categoryCheck.subcategory,
          categoryCheck.vape_line,
          flavorCheck.flavor,
          normalizedDescription,
          parsedPrice,
          parsedCost,
          parsedStock,
          productId,
          req.storeId,
        ]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'Product not found' });
      }

      return res.status(200).json({ product: formatProduct(result.rows[0]) });
    } catch (err) {
      if (err.code === '23505') {
        return res.status(409).json({ error: 'A product with this SKU already exists for this store' });
      }
      console.error('Product update error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  if (req.method === 'PATCH') {
    const { is_active } = req.body || {};
    if (is_active !== false) {
      return res.status(400).json({ error: 'Only deactivation (is_active: false) is supported' });
    }

    try {
      const result = await pool.query(
        `UPDATE products
         SET is_active = FALSE, updated_at = NOW()
         WHERE id = $1 AND store_id = $2 AND is_active = TRUE
         RETURNING ${PRODUCT_COLUMNS}`,
        [productId, req.storeId]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'Product not found' });
      }

      return res.status(200).json({ product: formatProduct(result.rows[0]) });
    } catch (err) {
      console.error('Product deactivate error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  res.setHeader('Allow', ['PUT', 'PATCH']);
  return res.status(405).json({ error: 'Method not allowed' });
}

export default requireAuth(handler);
