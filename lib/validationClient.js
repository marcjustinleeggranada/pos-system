const { getValidationServiceUrl } = require('./validationServiceUrl');

const VALIDATION_TIMEOUT_MS = 120000;
const VALIDATION_RETRY_ATTEMPTS = 3;
const VALIDATION_RETRY_BASE_MS = 4000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableStatus(status) {
  return status === 502 || status === 503 || status === 504;
}

async function wakeValidationService(baseUrl) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/health`, {
        signal: AbortSignal.timeout(60000),
      });
      if (response.ok) {
        return;
      }
    } catch {
      // Render free tier may still be spinning up.
    }
    await sleep(VALIDATION_RETRY_BASE_MS * attempt);
  }

  throw new Error(
    `Validation service is still waking up. Open ${baseUrl}/health in a browser, wait for {"status":"ok"}, then run analysis again.`
  );
}

async function callValidationService(analytics, recommendations) {
  const baseUrl = getValidationServiceUrl();
  await wakeValidationService(baseUrl);

  const payload = {
    storeId: analytics.storeId,
    recommendations,
    productDailySales: analytics.productDailySales,
    coPurchasePairs: analytics.coPurchasePairs,
  };

  let lastError = null;

  for (let attempt = 1; attempt <= VALIDATION_RETRY_ATTEMPTS; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), VALIDATION_TIMEOUT_MS);

    try {
      const response = await fetch(`${baseUrl}/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      let data = {};
      try {
        data = await response.json();
      } catch {
        data = {};
      }

      if (!response.ok) {
        const message = data.error || `Validation service error (${response.status})`;
        if (isRetryableStatus(response.status) && attempt < VALIDATION_RETRY_ATTEMPTS) {
          await sleep(VALIDATION_RETRY_BASE_MS * attempt);
          continue;
        }
        if (response.status === 502 || response.status === 503) {
          throw new Error(
            `${message} The validation service may be cold on Render free tier — open ${baseUrl}/health, wait 30–60 seconds, then retry.`
          );
        }
        throw new Error(message);
      }

      if (!Array.isArray(data.results)) {
        throw new Error('Validation service returned invalid results');
      }

      return data;
    } catch (err) {
      lastError = err;
      if (err.name === 'AbortError') {
        throw new Error(
          'Validation service timed out. On Render free tier, open the validation service /health URL once to wake it, then retry.'
        );
      }
      if (attempt < VALIDATION_RETRY_ATTEMPTS && /fetch failed|ECONNRESET|socket/i.test(err.message)) {
        await sleep(VALIDATION_RETRY_BASE_MS * attempt);
        continue;
      }
      if (err.message.includes('Validation service')) {
        throw err;
      }
      throw new Error(`Validation service unreachable at ${baseUrl}: ${err.message}`);
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError || new Error('Validation service request failed');
}

module.exports = { callValidationService, wakeValidationService };
