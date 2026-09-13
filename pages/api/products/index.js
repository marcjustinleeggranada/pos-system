const requireAuth = require('../../../middleware/requireAuth');
const pool = require('../../../lib/db');

async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const result = await pool.query(
      `SELECT id, store_id, name, sku, price, stock_quantity, created_at
       FROM products
       WHERE store_id = $1
       ORDER BY name ASC`,
      [req.storeId]
    );

    return res.status(200).json({ products: result.rows });
  } catch (err) {
    console.error('Products list error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export default requireAuth(handler);
