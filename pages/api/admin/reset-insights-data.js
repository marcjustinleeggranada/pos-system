import requireAuth from '../../../middleware/requireAuth';

const { resetInsightsData } = require('../../../lib/resetInsightsData');

async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (req.role !== 'owner') {
    return res.status(403).json({ error: 'Owner access required' });
  }

  try {
    const result = await resetInsightsData();
    return res.status(200).json({
      message:
        'Product costs updated, sales history cleared, and demo sales reloaded for both stores',
      ...result,
    });
  } catch (err) {
    console.error('Reset insights data error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}

export default requireAuth(handler);
