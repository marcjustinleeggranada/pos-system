function getValidationServiceUrl() {
  const raw = (process.env.VALIDATION_SERVICE_URL || 'http://localhost:5000').trim();
  if (!raw) {
    throw new Error(
      'VALIDATION_SERVICE_URL is not configured. On Render, set it to the full pos-validation URL (e.g. https://pos-validation-xxxx.onrender.com).'
    );
  }

  let baseUrl = raw.replace(/\/$/, '');
  if (!/^https?:\/\//i.test(baseUrl)) {
    baseUrl = `https://${baseUrl}`;
  }

  let hostname;
  try {
    hostname = new URL(baseUrl).hostname;
  } catch {
    throw new Error(`VALIDATION_SERVICE_URL is not a valid URL: ${raw}`);
  }

  // Render "property: host" wiring can produce the internal service name only (e.g. "pos-validation").
  if (!hostname.includes('.')) {
    throw new Error(
      `VALIDATION_SERVICE_URL is set to internal host "${hostname}". In Render → pos-web → Environment, set VALIDATION_SERVICE_URL to the full public URL from the pos-validation service (e.g. https://pos-validation-xxxx.onrender.com).`
    );
  }

  return baseUrl;
}

module.exports = { getValidationServiceUrl };
