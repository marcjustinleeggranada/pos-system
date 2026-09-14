const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;
const isLocal = connectionString?.includes('localhost');

const pool = new Pool({
  connectionString,
  ssl: isLocal ? false : { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000,
  max: 10,
});

module.exports = pool;
