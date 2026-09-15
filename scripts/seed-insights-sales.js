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

  const replace = process.argv.includes('--replace');
  const { seedAllInsightsSales } = require('../lib/seedInsightsSales');

  console.log(
    replace
      ? 'Replacing demo sales history for stores 1 and 2...'
      : 'Appending demo sales history for stores 1 and 2...'
  );

  const results = await seedAllInsightsSales({ replace });

  for (const result of results) {
    console.log(
      `Store ${result.storeId}: ${result.transactionsCreated} transaction(s) created`
    );
  }

  const pool = require('../lib/db');
  await pool.end();
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
