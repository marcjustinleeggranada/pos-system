import requireAuth from '../../../middleware/requireAuth';
import pool from '../../../lib/db';

function formatTransaction(row, itemsByTx) {
  return {
    id: row.id,
    totalAmount: Number(row.total_amount),
    paymentMethod: row.payment_method,
    status: row.status,
    createdAt: row.created_at,
    userEmail: row.user_email,
    items: itemsByTx[row.id] || [],
  };
}

async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
  const offset = (page - 1) * limit;

  try {
    const countResult = await pool.query(
      'SELECT COUNT(*)::int AS total FROM transactions WHERE store_id = $1',
      [req.storeId]
    );
    const total = countResult.rows[0].total;

    const txResult = await pool.query(
      `SELECT t.id, t.total_amount, t.payment_method, t.status, t.created_at,
              u.email AS user_email
       FROM transactions t
       JOIN users u ON u.id = t.user_id
       WHERE t.store_id = $1
       ORDER BY t.created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.storeId, limit, offset]
    );

    const txIds = txResult.rows.map((row) => row.id);
    const itemsByTx = {};

    if (txIds.length > 0) {
      const itemsResult = await pool.query(
        `SELECT ti.transaction_id, ti.product_id, ti.quantity, ti.unit_price, ti.subtotal,
                p.name AS product_name
         FROM transaction_items ti
         JOIN products p ON p.id = ti.product_id
         WHERE ti.store_id = $1 AND ti.transaction_id = ANY($2::int[])
         ORDER BY ti.id ASC`,
        [req.storeId, txIds]
      );

      for (const item of itemsResult.rows) {
        if (!itemsByTx[item.transaction_id]) {
          itemsByTx[item.transaction_id] = [];
        }
        itemsByTx[item.transaction_id].push({
          productId: item.product_id,
          productName: item.product_name,
          quantity: item.quantity,
          unitPrice: Number(item.unit_price),
          subtotal: Number(item.subtotal),
        });
      }
    }

    return res.status(200).json({
      transactions: txResult.rows.map((row) => formatTransaction(row, itemsByTx)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (err) {
    console.error('Transactions list error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export default requireAuth(handler);
