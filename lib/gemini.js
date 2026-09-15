const GEMINI_MODEL = 'gemini-3.6-flash';

const RECOMMENDATION_SCHEMA = {
  type: 'object',
  properties: {
    recommendations: {
      type: 'array',
      minItems: 3,
      maxItems: 6,
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          type: {
            type: 'string',
            enum: ['restock', 'discontinue', 'bundle', 'promote'],
          },
          productId: { type: 'integer' },
          productIds: {
            type: 'array',
            items: { type: 'integer' },
            minItems: 2,
            maxItems: 2,
          },
          title: { type: 'string' },
          rationale: { type: 'string' },
        },
        required: ['type', 'title', 'rationale'],
      },
    },
  },
  required: ['recommendations'],
};

function extractJson(text) {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1].trim() : trimmed;
  return JSON.parse(raw);
}

function extractResponseText(data) {
  const parts = data?.candidates?.[0]?.content?.parts || [];
  const answerParts = parts.filter((part) => part.text && part.thought !== true).map((part) => part.text);
  if (answerParts.length > 0) {
    return answerParts.join('\n');
  }

  const fallbackParts = parts.filter((part) => part.text).map((part) => part.text);
  return fallbackParts.length > 0 ? fallbackParts.join('\n') : null;
}

function compactAnalyticsForPrompt(analytics) {
  const productStats = [...analytics.productStats]
    .sort((a, b) => b.totalUnitsSold - a.totalUnitsSold)
    .slice(0, 20)
    .map((product) => ({
      productId: product.productId,
      name: product.name,
      sku: product.sku,
      price: product.price,
      cost: product.cost,
      stockQuantity: product.stockQuantity,
      totalUnitsSold: product.totalUnitsSold,
      totalRevenue: product.totalRevenue,
      grossProfit: product.grossProfit,
    }));

  return {
    totals: analytics.totals,
    categoryStats: analytics.categoryStats,
    productStats,
    dailyTrend: analytics.dailyTrend,
    paymentMethods: analytics.paymentMethods,
    inventory: analytics.inventory,
    coPurchasePairs: analytics.coPurchasePairs.slice(0, 10),
    lowStockProducts: analytics.lowStockProducts.slice(0, 10),
    periodComparison: analytics.periodComparison,
  };
}

function buildPrompt(analytics, iteration, validationFeedback) {
  const base = `You are an inventory analyst for a small retail POS system.
Analyze the store's sales data and produce actionable recommendations.

Allowed recommendation types (use exactly these strings):
- "restock" — product needs more inventory (requires productId)
- "discontinue" — product underperforms, consider removing (requires productId)
- "bundle" — two products sell well together (requires productIds array of exactly 2 ids)
- "promote" — product with rising demand worth highlighting (requires productId)

Rules:
- Produce 3 to 6 recommendations.
- Only reference product IDs that exist in the data.
- For "bundle", use productIds (array of two integers), not productId.
- Be specific and ground every rationale in the provided numbers.`;

  const dataBlock = `\n\nStore analytics JSON:\n${JSON.stringify(
    compactAnalyticsForPrompt(analytics),
    null,
    2
  )}`;

  if (!validationFeedback || iteration === 1) {
    return `${base}${dataBlock}`;
  }

  const feedbackBlock = `\n\nThis is refinement iteration ${iteration} of 4.
Previous recommendations failed statistical validation. Revise them using the feedback below.
Keep recommendations that passed validation unchanged. Replace or fix failed ones.

Previous recommendations:
${JSON.stringify(validationFeedback.recommendations, null, 2)}

Validation results:
${JSON.stringify(validationFeedback.validationResults, null, 2)}`;

  return `${base}${dataBlock}${feedbackBlock}`;
}

async function generateRecommendations(analytics, iteration, validationFeedback) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  const prompt = buildPrompt(analytics, iteration, validationFeedback);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.4,
        responseMimeType: 'application/json',
        responseSchema: RECOMMENDATION_SCHEMA,
        thinkingConfig: {
          thinkingLevel: 'minimal',
        },
      },
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    const message = data?.error?.message || `Gemini API error (${response.status})`;
    throw new Error(message);
  }

  const text = extractResponseText(data);
  if (!text) {
    const finishReason = data?.candidates?.[0]?.finishReason;
    throw new Error(
      finishReason
        ? `Gemini returned no answer text (finishReason: ${finishReason})`
        : 'Gemini returned an empty response'
    );
  }

  let parsed;
  try {
    parsed = extractJson(text);
  } catch (err) {
    throw new Error(`Gemini returned invalid JSON: ${err.message}`);
  }

  if (!Array.isArray(parsed.recommendations)) {
    throw new Error('Gemini response missing recommendations array');
  }

  if (parsed.recommendations.length === 0) {
    throw new Error('Gemini returned zero recommendations');
  }

  return parsed.recommendations.map((rec, index) => ({
    id: rec.id || `rec-${iteration}-${index + 1}`,
    type: rec.type,
    productId: rec.productId ?? null,
    productIds: rec.productIds ?? null,
    title: rec.title || 'Recommendation',
    rationale: rec.rationale || '',
  }));
}

module.exports = { generateRecommendations, GEMINI_MODEL };
