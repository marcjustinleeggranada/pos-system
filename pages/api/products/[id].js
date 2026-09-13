import requireAuth from '../../../middleware/requireAuth';
import pool from '../../../lib/db';

const { formatProduct } = require('../../../lib/formatProduct');
const { validateProductCategory, normalizeProductFlavor } = require('../../../lib/categories');

const PRODUCT_COLUMNS = `id, store_id, name, sku, category, subcategory, vape_line, flavor, price, cost, stock_quantity, is_active, created_at, updated_at`;

async function handler(req, res) {
  const productId = Number(req.query.id);
  if (!Number.isInteger(productId) || productId <= 0) {
    return res.status(400).json({ error: 'Invalid product id' });
  }

  if (req.method === 'PUT') {
    const { name, price, sku, category, subcategory, vape_line, flavor, cost, stock_quantity } =
      req.body || {};

    if (!name || price === undefined || price === null) {
      return res.status(400).json({ error: 'name and price are required' });
    }

    const categoryCheck = validateProductCategory(category, subcategory, vape_line);
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

    try {
      const result = await pool.query(
        `UPDATE products
         SET name = $1, sku = $2, category = $3, subcategory = $4, vape_line = $5, flavor = $6,
             price = $7, cost = $8, stock_quantity = $9, updated_at = NOW()
         WHERE id = $10 AND store_id = $11 AND is_active = TRUE
         RETURNING ${PRODUCT_COLUMNS}`,
        [
          String(name).trim(),
          sku ? String(sku).trim() : null,
          categoryCheck.category,
          categoryCheck.subcategory,
          categoryCheck.vape_line,
          flavorCheck.flavor,
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
