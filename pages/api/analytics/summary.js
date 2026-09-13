import requireAuth from '../../../middleware/requireAuth';

const { getStoreAnalytics } = require('../../../lib/analytics');

async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const analytics = await getStoreAnalytics(req.storeId);
    return res.status(200).json({
      summary: {
        generatedAt: analytics.generatedAt,
        period: analytics.period,
        totals: analytics.totals,
        inventory: analytics.inventory,
        periodComparison: analytics.periodComparison,
        paymentMethods: analytics.paymentMethods,
        categoryStats: analytics.categoryStats,
        subcategoryStats: analytics.subcategoryStats,
        productStats: analytics.productStats,
        dailyTrend: analytics.dailyTrend,
        weeklyTrend: analytics.weeklyTrend,
        lowStockProducts: analytics.lowStockProducts,
        coPurchasePairs: analytics.coPurchasePairs,
      },
    });
  } catch (err) {
    console.error('Analytics summary error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export default requireAuth(handler);
