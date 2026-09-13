const pool = require('./db');
const {
  getCategoryLabel,
  getSubcategoryLabel,
  formatCategoryDisplay,
} = require('./categories');

const PERIOD_DAYS = 30;

function round2(value) {
  return Math.round(Number(value) * 100) / 100;
}

function marginPct(revenue, cogs) {
  if (revenue <= 0 || cogs == null) return null;
  return round2(((revenue - cogs) / revenue) * 100);
}

function weekKey(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  return monday.toISOString().slice(0, 10);
}

async function getStoreAnalytics(storeId) {
  const periodStart = `NOW() - INTERVAL '${PERIOD_DAYS} days'`;

  const [
    productsResult,
    dailyResult,
    pairsResult,
    dailyByProductResult,
    paymentResult,
    lineItemsResult,
    dailyProfitResult,
    inventoryResult,
  ] = await Promise.all([
    pool.query(
      `SELECT p.id, p.name, p.sku, p.category, p.subcategory, p.vape_line, p.flavor, p.price, p.cost, p.stock_quantity,
              COALESCE(SUM(ti.quantity), 0)::int AS total_units_sold,
              COALESCE(SUM(ti.subtotal), 0)::numeric AS total_revenue,
              COALESCE(SUM(ti.quantity * COALESCE(p.cost, 0)), 0)::numeric AS total_cogs
       FROM products p
       LEFT JOIN transaction_items ti ON ti.product_id = p.id AND ti.store_id = p.store_id
       LEFT JOIN transactions t ON t.id = ti.transaction_id
         AND t.store_id = p.store_id
         AND t.created_at >= ${periodStart}
       WHERE p.store_id = $1 AND p.is_active = TRUE
       GROUP BY p.id
       ORDER BY total_units_sold DESC, p.name ASC`,
      [storeId]
    ),
    pool.query(
      `SELECT DATE(t.created_at) AS sale_date,
              COUNT(DISTINCT t.id)::int AS transaction_count,
              COALESCE(SUM(t.total_amount), 0)::numeric AS total_revenue,
              COALESCE(SUM(ti.quantity), 0)::int AS units_sold
       FROM transactions t
       LEFT JOIN transaction_items ti ON ti.transaction_id = t.id AND ti.store_id = t.store_id
       WHERE t.store_id = $1 AND t.created_at >= ${periodStart}
       GROUP BY DATE(t.created_at)
       ORDER BY sale_date ASC`,
      [storeId]
    ),
    pool.query(
      `SELECT ti1.product_id AS product_a_id,
              pa.name AS product_a_name,
              ti2.product_id AS product_b_id,
              pb.name AS product_b_name,
              COUNT(*)::int AS pair_count
       FROM transaction_items ti1
       JOIN transaction_items ti2
         ON ti1.transaction_id = ti2.transaction_id
        AND ti1.product_id < ti2.product_id
       JOIN products pa ON pa.id = ti1.product_id
       JOIN products pb ON pb.id = ti2.product_id
       WHERE ti1.store_id = $1
       GROUP BY ti1.product_id, pa.name, ti2.product_id, pb.name
       HAVING COUNT(*) >= 1
       ORDER BY pair_count DESC
       LIMIT 15`,
      [storeId]
    ),
    pool.query(
      `SELECT ti.product_id,
              DATE(t.created_at) AS sale_date,
              SUM(ti.quantity)::int AS units
       FROM transaction_items ti
       JOIN transactions t ON t.id = ti.transaction_id
       WHERE ti.store_id = $1 AND t.created_at >= ${periodStart}
       GROUP BY ti.product_id, DATE(t.created_at)
       ORDER BY ti.product_id, sale_date ASC`,
      [storeId]
    ),
    pool.query(
      `SELECT payment_method,
              COUNT(*)::int AS transaction_count,
              COALESCE(SUM(total_amount), 0)::numeric AS total_collected
       FROM transactions
       WHERE store_id = $1 AND created_at >= ${periodStart}
       GROUP BY payment_method
       ORDER BY total_collected DESC`,
      [storeId]
    ),
    pool.query(
      `SELECT ti.product_id,
              p.name,
              p.category,
              p.subcategory,
              p.cost,
              SUM(ti.quantity)::int AS units_sold,
              COALESCE(SUM(ti.subtotal), 0)::numeric AS revenue,
              COALESCE(SUM(ti.quantity * COALESCE(p.cost, 0)), 0)::numeric AS cogs
       FROM transaction_items ti
       JOIN transactions t ON t.id = ti.transaction_id
       JOIN products p ON p.id = ti.product_id
       WHERE ti.store_id = $1
         AND t.created_at >= ${periodStart}
       GROUP BY ti.product_id, p.name, p.category, p.subcategory, p.cost
       ORDER BY revenue DESC`,
      [storeId]
    ),
    pool.query(
      `SELECT DATE(t.created_at) AS sale_date,
              COALESCE(SUM(ti.subtotal), 0)::numeric AS revenue,
              COALESCE(SUM(ti.quantity * COALESCE(p.cost, 0)), 0)::numeric AS cogs,
              SUM(ti.quantity)::int AS units_sold
       FROM transaction_items ti
       JOIN transactions t ON t.id = ti.transaction_id
       JOIN products p ON p.id = ti.product_id
       WHERE ti.store_id = $1 AND t.created_at >= ${periodStart}
       GROUP BY DATE(t.created_at)
       ORDER BY sale_date ASC`,
      [storeId]
    ),
    pool.query(
      `SELECT COALESCE(SUM(stock_quantity * price), 0)::numeric AS retail_value,
              COALESCE(SUM(stock_quantity * COALESCE(cost, 0)), 0)::numeric AS cost_value,
              COALESCE(SUM(stock_quantity), 0)::int AS total_units_on_hand,
              COUNT(*) FILTER (WHERE cost IS NOT NULL)::int AS products_with_cost,
              COUNT(*)::int AS active_product_count
       FROM products
       WHERE store_id = $1 AND is_active = TRUE`,
      [storeId]
    ),
  ]);

  const productDailySales = {};
  for (const row of dailyByProductResult.rows) {
    const key = String(row.product_id);
    if (!productDailySales[key]) productDailySales[key] = [];
    productDailySales[key].push({
      date: row.sale_date.toISOString().slice(0, 10),
      units: row.units,
    });
  }

  const productStats = productsResult.rows.map((row) => {
    const revenue = Number(row.total_revenue);
    const cogs = Number(row.total_cogs);
    const cost = row.cost != null ? Number(row.cost) : null;
    const hasCost = cost != null;
    const grossProfit = hasCost ? round2(revenue - cogs) : null;

    const category = row.category || null;
    const subcategory = row.subcategory || null;
    const vapeLine = row.vape_line || null;
    const flavor = row.flavor || null;

    return {
      productId: row.id,
      name: row.name,
      sku: row.sku,
      category,
      subcategory,
      vapeLine,
      flavor,
      categoryLabel: getCategoryLabel(category) || category || 'Uncategorized',
      subcategoryLabel: getSubcategoryLabel(category, subcategory) || subcategory,
      categoryDisplay: formatCategoryDisplay(category, subcategory, vapeLine, flavor),
      price: Number(row.price),
      cost,
      stockQuantity: row.stock_quantity,
      totalUnitsSold: row.total_units_sold,
      totalRevenue: round2(revenue),
      totalCogs: hasCost ? round2(cogs) : null,
      grossProfit,
      profitMarginPct: hasCost ? marginPct(revenue, cogs) : null,
      inventoryRetailValue: round2(row.stock_quantity * Number(row.price)),
      inventoryCostValue: hasCost ? round2(row.stock_quantity * cost) : null,
    };
  });

  const txByDate = new Map(
    dailyResult.rows.map((row) => [row.sale_date.toISOString().slice(0, 10), row.transaction_count])
  );

  const dailyTrend = dailyProfitResult.rows.map((row) => {
    const date = row.sale_date.toISOString().slice(0, 10);
    const revenue = Number(row.revenue);
    const cogs = Number(row.cogs);
    return {
      date,
      transactionCount: txByDate.get(date) || 0,
      totalRevenue: round2(revenue),
      totalCogs: round2(cogs),
      grossProfit: round2(revenue - cogs),
      profitMarginPct: marginPct(revenue, cogs),
      unitsSold: row.units_sold,
    };
  });

  const weeklyMap = new Map();
  for (const day of dailyTrend) {
    const key = weekKey(day.date);
    if (!weeklyMap.has(key)) {
      weeklyMap.set(key, {
        weekStarting: key,
        transactionCount: 0,
        totalRevenue: 0,
        totalCogs: 0,
        grossProfit: 0,
        unitsSold: 0,
      });
    }
    const w = weeklyMap.get(key);
    w.transactionCount += day.transactionCount;
    w.totalRevenue += day.totalRevenue;
    w.totalCogs += day.totalCogs;
    w.grossProfit += day.grossProfit;
    w.unitsSold += day.unitsSold;
  }

  const weeklyTrend = [...weeklyMap.values()].map((w) => ({
    weekStarting: w.weekStarting,
    transactionCount: w.transactionCount,
    totalRevenue: round2(w.totalRevenue),
    totalCogs: round2(w.totalCogs),
    grossProfit: round2(w.grossProfit),
    profitMarginPct: marginPct(w.totalRevenue, w.totalCogs),
    unitsSold: w.unitsSold,
  }));

  const categoryMap = new Map();
  const subcategoryMap = new Map();

  for (const p of productStats) {
    const catKey = p.category || 'uncategorized';
    if (!categoryMap.has(catKey)) {
      categoryMap.set(catKey, {
        category: p.category,
        categoryLabel: p.categoryLabel,
        unitsSold: 0,
        revenue: 0,
        cogs: 0,
        productCount: 0,
        productsWithCost: 0,
      });
    }
    const c = categoryMap.get(catKey);
    c.unitsSold += p.totalUnitsSold;
    c.revenue += p.totalRevenue;
    c.productCount += 1;
    if (p.cost != null) {
      c.cogs += p.totalCogs || 0;
      c.productsWithCost += 1;
    }

    const subKey = `${catKey}::${p.subcategory || ''}`;
    if (!subcategoryMap.has(subKey)) {
      subcategoryMap.set(subKey, {
        category: p.category,
        subcategory: p.subcategory,
        categoryLabel: p.categoryLabel,
        subcategoryLabel: p.subcategoryLabel,
        categoryDisplay: p.categoryDisplay,
        unitsSold: 0,
        revenue: 0,
        cogs: 0,
        productCount: 0,
        productsWithCost: 0,
      });
    }
    const s = subcategoryMap.get(subKey);
    s.unitsSold += p.totalUnitsSold;
    s.revenue += p.totalRevenue;
    s.productCount += 1;
    if (p.cost != null) {
      s.cogs += p.totalCogs || 0;
      s.productsWithCost += 1;
    }
  }

  const categoryStats = [...categoryMap.values()]
    .map((c) => ({
      category: c.category,
      categoryLabel: c.categoryLabel,
      productCount: c.productCount,
      unitsSold: c.unitsSold,
      revenue: round2(c.revenue),
      cogs: c.productsWithCost > 0 ? round2(c.cogs) : null,
      grossProfit: c.productsWithCost > 0 ? round2(c.revenue - c.cogs) : null,
      profitMarginPct: c.productsWithCost > 0 ? marginPct(c.revenue, c.cogs) : null,
      costCoveragePct:
        c.productCount > 0 ? round2((c.productsWithCost / c.productCount) * 100) : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  const subcategoryStats = [...subcategoryMap.values()]
    .map((s) => ({
      category: s.category,
      subcategory: s.subcategory,
      categoryLabel: s.categoryLabel,
      subcategoryLabel: s.subcategoryLabel,
      categoryDisplay: s.categoryDisplay,
      productCount: s.productCount,
      unitsSold: s.unitsSold,
      revenue: round2(s.revenue),
      cogs: s.productsWithCost > 0 ? round2(s.cogs) : null,
      grossProfit: s.productsWithCost > 0 ? round2(s.revenue - s.cogs) : null,
      profitMarginPct: s.productsWithCost > 0 ? marginPct(s.revenue, s.cogs) : null,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  const paymentMethods = paymentResult.rows.map((row) => ({
    method: row.payment_method,
    transactionCount: row.transaction_count,
    totalCollected: round2(Number(row.total_collected)),
    sharePct: 0,
  }));

  const totalCollected = paymentMethods.reduce((s, p) => s + p.totalCollected, 0);
  for (const p of paymentMethods) {
    p.sharePct = totalCollected > 0 ? round2((p.totalCollected / totalCollected) * 100) : 0;
  }

  const inv = inventoryResult.rows[0];
  const inventoryRetailValue = round2(Number(inv.retail_value));
  const inventoryCostValue = round2(Number(inv.cost_value));
  const totalRevenue30d = dailyTrend.reduce((s, d) => s + d.totalRevenue, 0);
  const totalCogs30d = dailyTrend.reduce((s, d) => s + d.totalCogs, 0);
  const totalUnitsSold30d = dailyTrend.reduce((s, d) => s + d.unitsSold, 0);
  const totalTransactions30d = dailyTrend.reduce((s, d) => s + d.transactionCount, 0);
  const grossProfit30d = round2(totalRevenue30d - totalCogs30d);
  const productsWithCost = productStats.filter((p) => p.cost != null).length;
  const productsMissingCost = productStats.length - productsWithCost;

  const coPurchasePairs = pairsResult.rows.map((row) => ({
    productAId: row.product_a_id,
    productAName: row.product_a_name,
    productBId: row.product_b_id,
    productBName: row.product_b_name,
    pairCount: row.pair_count,
  }));

  const lowStockProducts = productStats.filter((p) => p.stockQuantity <= 5 && p.totalUnitsSold > 0);

  const last7 = dailyTrend.slice(-7);
  const prev7 = dailyTrend.slice(-14, -7);
  const sumField = (arr, field) => arr.reduce((s, d) => s + d[field], 0);

  const periodComparison = {
    last7Days: {
      revenue: round2(sumField(last7, 'totalRevenue')),
      grossProfit: round2(sumField(last7, 'grossProfit')),
      transactions: sumField(last7, 'transactionCount'),
      unitsSold: sumField(last7, 'unitsSold'),
    },
    previous7Days: {
      revenue: round2(sumField(prev7, 'totalRevenue')),
      grossProfit: round2(sumField(prev7, 'grossProfit')),
      transactions: sumField(prev7, 'transactionCount'),
      unitsSold: sumField(prev7, 'unitsSold'),
    },
  };

  return {
    storeId,
    generatedAt: new Date().toISOString(),
    productStats,
    dailyTrend,
    weeklyTrend,
    categoryStats,
    subcategoryStats,
    paymentMethods,
    coPurchasePairs,
    lowStockProducts,
    productDailySales,
    period: {
      days: PERIOD_DAYS,
      label: `Last ${PERIOD_DAYS} days`,
    },
    totals: {
      activeProducts: productStats.length,
      totalTransactions: totalTransactions30d,
      totalRevenue30d: round2(totalRevenue30d),
      totalCogs30d: round2(totalCogs30d),
      grossProfit30d,
      grossMarginPct: marginPct(totalRevenue30d, totalCogs30d),
      totalUnitsSold30d,
      avgOrderValue: totalTransactions30d > 0 ? round2(totalRevenue30d / totalTransactions30d) : 0,
      avgUnitsPerOrder:
        totalTransactions30d > 0 ? round2(totalUnitsSold30d / totalTransactions30d) : 0,
      productsWithCost,
      productsMissingCost,
    },
    inventory: {
      totalUnitsOnHand: inv.total_units_on_hand,
      retailValue: inventoryRetailValue,
      costValue: inventoryCostValue,
      potentialGrossProfit: round2(inventoryRetailValue - inventoryCostValue),
      lowStockCount: lowStockProducts.length,
      productsWithCost: inv.products_with_cost,
      activeProductCount: inv.active_product_count,
    },
    periodComparison,
    lineItemCount: lineItemsResult.rowCount,
  };
}

module.exports = { getStoreAnalytics };
