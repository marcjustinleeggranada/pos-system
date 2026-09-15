import requireAuth from '../../../middleware/requireAuth';

const { seedInsightsSales } = require('../../../lib/seedInsightsSales');

async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (req.role !== 'owner') {
    return res.status(403).json({ error: 'Owner access required' });
  }

  const replace = req.body?.replace === true;

  try {
    const result = await seedInsightsSales(req.storeId, { replace });
    return res.status(200).json({
      message: replace
        ? 'Demo sales history replaced for your store'
        : 'Demo sales history added for your store',
      ...result,
    });
  } catch (err) {
    console.error('Seed insights sales error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}

export default requireAuth(handler);
