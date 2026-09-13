const GEMINI_MODEL = 'gemini-3.6-flash';

function extractJson(text) {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1].trim() : trimmed;
  return JSON.parse(raw);
}

function buildPrompt(analytics, iteration, validationFeedback) {
  const base = `You are an inventory analyst for a small retail POS system.
Analyze the store's sales data and produce actionable recommendations.

Allowed recommendation types (use exactly these strings):
- "restock" — product needs more inventory (requires productId)
- "discontinue" — product underperforms, consider removing (requires productId)
- "bundle" — two products sell well together (requires productIds array of exactly 2 ids)
- "promote" — product with rising demand worth highlighting (requires productId)

Return ONLY valid JSON in this shape:
{
  "recommendations": [
    {
      "id": "rec-1",
      "type": "restock",
      "productId": 1,
      "title": "Short title",
      "rationale": "One or two sentences citing the data"
    }
  ]
}

Rules:
- Produce 3 to 6 recommendations.
- Only reference product IDs that exist in the data.
- For "bundle", use productIds (array of two integers), not productId.
- Be specific and ground every rationale in the provided numbers.`;

  const dataBlock = `\n\nStore analytics JSON:\n${JSON.stringify(
    {
      totals: analytics.totals,
      categoryStats: analytics.categoryStats,
      productStats: analytics.productStats,
      dailyTrend: analytics.dailyTrend,
      paymentMethods: analytics.paymentMethods,
      inventory: analytics.inventory,
      coPurchasePairs: analytics.coPurchasePairs,
      lowStockProducts: analytics.lowStockProducts,
      periodComparison: analytics.periodComparison,
    },
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
      },
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    const message = data?.error?.message || `Gemini API error (${response.status})`;
    throw new Error(message);
  }

  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('Gemini returned an empty response');
  }

  const parsed = extractJson(text);
  if (!Array.isArray(parsed.recommendations)) {
    throw new Error('Gemini response missing recommendations array');
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

module.exports = { generateRecommendations };
