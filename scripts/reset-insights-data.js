#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function loadEnvLocal() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

async function main() {
  loadEnvLocal();

  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is required. Set it in .env.local or the environment.');
    process.exit(1);
  }

  const { resetInsightsData } = require('../lib/resetInsightsData');

  console.log('Applying product costs, clearing sales, and reseeding demo history...');
  const result = await resetInsightsData();

  console.log(`Updated costs on ${result.productsUpdated} product(s).`);
  console.log(`Created ${result.transactionsCreated} transaction(s) across both stores.`);
  for (const store of result.stores) {
    console.log(`  Store ${store.storeId}: ${store.transactionsCreated} transaction(s)`);
  }

  const pool = require('../lib/db');
  await pool.end();
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
