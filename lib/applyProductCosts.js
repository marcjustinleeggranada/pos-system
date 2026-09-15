const pool = require('./db');
const { costForProduct } = require('./productCosts');

async function applyAllProductCosts() {
  const { rows } = await pool.query(
    `SELECT id, store_id, sku, category, price
     FROM products
     WHERE is_active = TRUE
     ORDER BY store_id, id`
  );

  let updated = 0;

  for (const row of rows) {
    const cost = costForProduct({
      storeId: row.store_id,
      category: row.category,
      sku: row.sku,
      price: row.price,
    });

    await pool.query(
      `UPDATE products SET cost = $1, updated_at = NOW() WHERE id = $2`,
      [cost, row.id]
    );
    updated += 1;
  }

  return { productsUpdated: updated };
}

module.exports = { applyAllProductCosts };
