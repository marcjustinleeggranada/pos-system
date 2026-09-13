import requireAuth from '../../../middleware/requireAuth';
import pool from '../../../lib/db';

class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function mergeItems(items) {
  const merged = new Map();

  for (const item of items) {
    const productId = Number(item.product_id);
    const quantity = Number(item.quantity);

    if (!Number.isInteger(productId) || productId <= 0) {
      throw new ApiError(400, 'Each item must have a valid product_id');
    }
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new ApiError(400, 'Each item must have a positive quantity');
    }

    merged.set(productId, (merged.get(productId) || 0) + quantity);
  }

  return [...merged.entries()].map(([productId, quantity]) => ({
    product_id: productId,
    quantity,
  }));
}

async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { payment_method = 'cash', items } = req.body || {};

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'items must be a non-empty array' });
  }

  let normalizedItems;
  try {
    normalizedItems = mergeItems(items);
  } catch (err) {
    if (err instanceof ApiError) {
      return res.status(err.status).json({ error: err.message });
    }
    throw err;
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const lineItems = [];
    let totalAmount = 0;

    for (const item of normalizedItems) {
      const productResult = await client.query(
        `SELECT id, price, stock_quantity
         FROM products
         WHERE id = $1 AND store_id = $2 AND is_active = TRUE
         FOR UPDATE`,
        [item.product_id, req.storeId]
      );

      if (productResult.rowCount === 0) {
        throw new ApiError(404, `Product ${item.product_id} not found`);
      }

      const product = productResult.rows[0];
      const currentStock = Number(product.stock_quantity);

      if (currentStock < item.quantity) {
        throw new ApiError(409, `Insufficient stock for product ${item.product_id}`);
      }

      const unitPrice = Number(product.price);
      const subtotal = unitPrice * item.quantity;
      totalAmount += subtotal;

      lineItems.push({
        productId: item.product_id,
        quantity: item.quantity,
        unitPrice,
        subtotal,
        previousStock: currentStock,
        newStock: currentStock - item.quantity,
      });
    }

    const transactionResult = await client.query(
      `INSERT INTO transactions (store_id, user_id, total_amount, payment_method)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [req.storeId, req.userId, totalAmount.toFixed(2), String(payment_method).trim() || 'cash']
    );

    const transactionId = transactionResult.rows[0].id;

    for (const line of lineItems) {
      await client.query(
        `INSERT INTO transaction_items (store_id, transaction_id, product_id, quantity, unit_price, subtotal)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          req.storeId,
          transactionId,
          line.productId,
          line.quantity,
          line.unitPrice.toFixed(2),
          line.subtotal.toFixed(2),
        ]
      );

      await client.query(
        `UPDATE products
         SET stock_quantity = $1, updated_at = NOW()
         WHERE id = $2 AND store_id = $3`,
        [line.newStock, line.productId, req.storeId]
      );

      await client.query(
        `INSERT INTO inventory_logs (
           store_id, product_id, change_type, quantity_change,
           previous_stock, new_stock, reference_id
         )
         VALUES ($1, $2, 'sale', $3, $4, $5, $6)`,
        [
          req.storeId,
          line.productId,
          -line.quantity,
          line.previousStock,
          line.newStock,
          transactionId,
        ]
      );
    }

    await client.query('COMMIT');

    return res.status(201).json({
      transaction_id: transactionId,
      total_amount: Number(totalAmount.toFixed(2)),
    });
  } catch (err) {
    await client.query('ROLLBACK');

    if (err instanceof ApiError) {
      return res.status(err.status).json({ error: err.message });
    }

    console.error('Transaction create error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
}

export default requireAuth(handler);
