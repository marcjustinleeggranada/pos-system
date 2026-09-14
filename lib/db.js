const { Pool } = require('pg');

function buildConnectionString() {
  const raw = process.env.DATABASE_URL;
  if (!raw) return raw;

  if (raw.includes('localhost') || raw.includes('sslmode=')) {
    return raw;
  }

  const separator = raw.includes('?') ? '&' : '?';
  return `${raw}${separator}sslmode=require`;
}

const connectionString = buildConnectionString();

const pool = new Pool({
  connectionString,
  ssl: connectionString?.includes('localhost')
    ? false
    : { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000,
  max: 10,
});

module.exports = pool;
