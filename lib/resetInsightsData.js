const pool = require('./db');
const { applyAllProductCosts } = require('./applyProductCosts');
const { seedAllInsightsSales, clearStoreSales } = require('./seedInsightsSales');

async function clearAllSales() {
  await pool.query('DELETE FROM inventory_logs');
  await pool.query('DELETE FROM transaction_items');
  await pool.query('DELETE FROM transactions');
}

async function resetInsightsData() {
  const costs = await applyAllProductCosts();
  await clearAllSales();
  const seedResults = await seedAllInsightsSales({ replace: false });

  const transactionsCreated = seedResults.reduce(
    (sum, result) => sum + result.transactionsCreated,
    0
  );

  return {
    productsUpdated: costs.productsUpdated,
    transactionsCreated,
    stores: seedResults,
  };
}

module.exports = {
  resetInsightsData,
  clearAllSales,
  clearStoreSales,
};
