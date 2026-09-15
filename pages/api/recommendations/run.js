import requireAuth from '../../../middleware/requireAuth';

const { runRefinementLoop } = require('../../../lib/refinementLoop');

function mapRecommendationError(err) {
  const message = err.message || 'Internal server error';

  if (message.includes('GEMINI_API_KEY')) {
    return { status: 503, error: message };
  }

  if (
    message.includes('Validation service') ||
    message.includes('fetch failed') ||
    message.includes('unreachable') ||
    message.includes('timed out')
  ) {
    return {
      status: 503,
      error: message,
    };
  }

  if (
    message.toLowerCase().includes('gemini') ||
    message.includes('API key not valid') ||
    message.includes('INVALID_ARGUMENT') ||
    message.includes('invalid JSON')
  ) {
    return { status: 502, error: message };
  }

  return { status: 500, error: message };
}

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
    const mapped = mapRecommendationError(err);
    return res.status(mapped.status).json({ error: mapped.error });
  }
}

export default requireAuth(handler);
