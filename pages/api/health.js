const pool = require('../../lib/db');

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!process.env.DATABASE_URL) {
    return res.status(503).json({
      status: 'error',
      db: 'missing DATABASE_URL',
    });
  }

  try {
    await pool.query('SELECT 1');
    return res.status(200).json({ status: 'ok', db: 'connected' });
  } catch (err) {
    console.error('Health check DB error:', err.message);
    return res.status(503).json({
      status: 'error',
      db: 'connection failed',
    });
  }
}
