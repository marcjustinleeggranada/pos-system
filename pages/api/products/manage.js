import requireAuth from '../../../middleware/requireAuth';
import pool from '../../../lib/db';

const { formatProduct } = require('../../../lib/formatProduct');
const { validateProductCategory, normalizeProductFlavor } = require('../../../lib/categories');

const PRODUCT_COLUMNS = `id, store_id, name, sku, category, subcategory, vape_line, flavor, price, cost, stock_quantity, is_active, created_at, updated_at`;

async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const result = await pool.query(
        `SELECT ${PRODUCT_COLUMNS}
         FROM products
         WHERE store_id = $1 AND is_active = TRUE
         ORDER BY name ASC`,
        [req.storeId]
      );

      return res.status(200).json({
        products: result.rows.map(formatProduct),
      });
    } catch (err) {
      console.error('Products list error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  if (req.method === 'POST') {
    const {
      name,
      price,
      sku,
      category,
      subcategory,
      vape_line,
      flavor,
      cost,
      stock_quantity,
      is_active,
    } = req.body || {};

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

    const normalizedSku = sku ? String(sku).trim() : null;
    const activeFlag = is_active === undefined ? true : Boolean(is_active);

    try {
      const result = await pool.query(
        `INSERT INTO products (store_id, name, sku, category, subcategory, vape_line, flavor, price, cost, stock_quantity, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING ${PRODUCT_COLUMNS}`,
        [
          req.storeId,
          String(name).trim(),
          normalizedSku,
          categoryCheck.category,
          categoryCheck.subcategory,
          categoryCheck.vape_line,
          flavorCheck.flavor,
          parsedPrice,
          parsedCost,
          parsedStock,
          activeFlag,
        ]
      );

      return res.status(201).json({ product: formatProduct(result.rows[0]) });
    } catch (err) {
      if (err.code === '23505') {
        return res.status(409).json({ error: 'A product with this SKU already exists for this store' });
      }

      console.error('Product create error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).json({ error: 'Method not allowed' });
}

export default requireAuth(handler);
