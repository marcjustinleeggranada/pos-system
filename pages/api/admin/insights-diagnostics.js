import requireAuth from '../../../middleware/requireAuth';

const { GEMINI_MODEL } = require('../../../lib/gemini');
const { getValidationServiceUrl } = require('../../../lib/validationServiceUrl');

async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (req.role !== 'owner') {
    return res.status(403).json({ error: 'Owner access required' });
  }

  let validation = {
    configured: Boolean(process.env.VALIDATION_SERVICE_URL),
    url: process.env.VALIDATION_SERVICE_URL || null,
    reachable: false,
    status: null,
    error: null,
  };

  try {
    const validationUrl = getValidationServiceUrl();
    validation.url = validationUrl;
    const response = await fetch(`${validationUrl}/health`, { signal: AbortSignal.timeout(30000) });
    validation.status = response.status;
    validation.reachable = response.ok;
    if (!response.ok) {
      validation.error = `Health check returned ${response.status}`;
    }
  } catch (err) {
    validation.error = err.message;
  }

  return res.status(200).json({
    gemini: {
      model: GEMINI_MODEL,
      apiKeyConfigured: Boolean(process.env.GEMINI_API_KEY),
    },
    validation,
  });
}

export default requireAuth(handler);
