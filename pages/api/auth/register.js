const bcrypt = require('bcrypt');
const pool = require('../../../lib/db');

const SALT_ROUNDS = 12;
const VALID_ROLES = ['owner', 'staff'];

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, password, storeId, role = 'staff' } = req.body || {};

  if (!email || !password || storeId === undefined || storeId === null) {
    return res.status(400).json({ error: 'email, password, and storeId are required' });
  }

  if (!VALID_ROLES.includes(role)) {
    return res.status(400).json({ error: "role must be 'owner' or 'staff'" });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const parsedStoreId = Number(storeId);

  if (!Number.isInteger(parsedStoreId) || parsedStoreId <= 0) {
    return res.status(400).json({ error: 'storeId must be a positive integer' });
  }

  try {
    const storeResult = await pool.query('SELECT id FROM stores WHERE id = $1', [parsedStoreId]);
    if (storeResult.rowCount === 0) {
      return res.status(400).json({ error: 'Invalid storeId' });
    }

    const passwordHash = await bcrypt.hash(String(password), SALT_ROUNDS);

    const result = await pool.query(
      `INSERT INTO users (store_id, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, store_id, email, role, created_at`,
      [parsedStoreId, normalizedEmail, passwordHash, role]
    );

    const user = result.rows[0];
    return res.status(201).json({
      user: {
        id: user.id,
        storeId: user.store_id,
        email: user.email,
        role: user.role,
        createdAt: user.created_at,
      },
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Email already registered' });
    }

    console.error('Register error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
