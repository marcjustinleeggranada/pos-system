import requireAuth from '../../../middleware/requireAuth';

const { runRefinementLoop } = require('../../../lib/refinementLoop');

async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const result = await runRefinementLoop(req.storeId);
    return res.status(200).json(result);
  } catch (err) {
    console.error('Recommendation loop error:', err);

    if (err.message.includes('GEMINI_API_KEY')) {
      return res.status(503).json({ error: err.message });
    }
    if (err.message.includes('Validation service') || err.message.includes('fetch failed')) {
      return res.status(503).json({
        error:
          'Statistical validation service is unavailable. Start it with: cd validation-service && python app.py',
      });
    }
    if (err.message.toLowerCase().includes('gemini')) {
      return res.status(502).json({ error: err.message });
    }

    return res.status(500).json({ error: 'Internal server error' });
  }
}

export default requireAuth(handler);
