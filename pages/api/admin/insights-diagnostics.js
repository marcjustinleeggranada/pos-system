import requireAuth from '../../../middleware/requireAuth';

const { GEMINI_MODEL } = require('../../../lib/gemini');

function getValidationServiceUrl() {
  let baseUrl = (process.env.VALIDATION_SERVICE_URL || '').trim();
  if (!baseUrl) return null;
  baseUrl = baseUrl.replace(/\/$/, '');
  if (!/^https?:\/\//i.test(baseUrl)) {
    baseUrl = `https://${baseUrl}`;
  }
  return baseUrl;
}

async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (req.role !== 'owner') {
    return res.status(403).json({ error: 'Owner access required' });
  }

  const validationUrl = getValidationServiceUrl();
  let validation = {
    configured: Boolean(validationUrl),
    reachable: false,
    status: null,
    error: null,
  };

  if (validationUrl) {
    try {
      const response = await fetch(`${validationUrl}/health`, { signal: AbortSignal.timeout(30000) });
      validation.status = response.status;
      validation.reachable = response.ok;
      if (!response.ok) {
        validation.error = `Health check returned ${response.status}`;
      }
    } catch (err) {
      validation.error = err.message;
    }
  } else {
    validation.error = 'VALIDATION_SERVICE_URL is not configured';
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
