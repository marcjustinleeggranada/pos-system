const { getStoreAnalytics } = require('./analytics');
const { generateRecommendations } = require('./gemini');
const { getValidationServiceUrl } = require('./validationServiceUrl');

const REFINEMENT_ITERATIONS = 4;
const VALIDATION_TIMEOUT_MS = 120000;

async function callValidationService(analytics, recommendations) {
  const baseUrl = getValidationServiceUrl();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), VALIDATION_TIMEOUT_MS);

  let response;
  try {
    response = await fetch(`${baseUrl}/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        storeId: analytics.storeId,
        recommendations,
        productDailySales: analytics.productDailySales,
        coPurchasePairs: analytics.coPurchasePairs,
        productStats: analytics.productStats,
      }),
      signal: controller.signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error(
        'Validation service timed out. On Render free tier, open the validation service URL once to wake it, then retry.'
      );
    }
    throw new Error(`Validation service unreachable at ${baseUrl}: ${err.message}`);
  } finally {
    clearTimeout(timeout);
  }

  let data = {};
  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    throw new Error(data.error || `Validation service error (${response.status})`);
  }

  if (!Array.isArray(data.results)) {
    throw new Error('Validation service returned invalid results');
  }

  return data;
}

async function runRefinementLoop(storeId) {
  const analytics = await getStoreAnalytics(storeId);
  const iterations = [];
  const validatedById = new Map();

  let lastRecommendations = [];
  let lastValidationResults = [];

  for (let iteration = 1; iteration <= REFINEMENT_ITERATIONS; iteration += 1) {
    const feedback =
      iteration === 1
        ? null
        : {
            recommendations: lastRecommendations,
            validationResults: lastValidationResults,
          };

    const recommendations = await generateRecommendations(analytics, iteration, feedback);
    const validation = await callValidationService(analytics, recommendations);

    lastRecommendations = recommendations;
    lastValidationResults = validation.results;

    for (const result of validation.results) {
      if (result.passed) {
        const rec = recommendations.find((r) => r.id === result.id);
        if (rec) {
          validatedById.set(rec.id, {
            ...rec,
            validation: {
              passed: result.passed,
              test: result.test,
              pValue: result.pValue,
              message: result.message,
              iterationValidated: iteration,
            },
          });
        }
      }
    }

    iterations.push({
      iteration,
      recommendations,
      validationResults: validation.results,
      allPassed: validation.results.every((r) => r.passed),
    });

    if (validation.results.length > 0 && validation.results.every((r) => r.passed)) {
      break;
    }
  }

  return {
    iterations,
    iterationCount: iterations.length,
    maxIterations: REFINEMENT_ITERATIONS,
    validatedRecommendations: Array.from(validatedById.values()),
    analyticsSummary: {
      generatedAt: analytics.generatedAt,
      totals: analytics.totals,
      productCount: analytics.productStats.length,
      dailyTrendDays: analytics.dailyTrend.length,
    },
  };
}

module.exports = { runRefinementLoop, REFINEMENT_ITERATIONS };
