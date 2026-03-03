const { Pool } = require('pg');

let pool;

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL?.includes('neon') || process.env.DATABASE_URL?.includes('amazonaws')
        ? { rejectUnauthorized: false }
        : false,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    pool.on('error', (err) => {
      console.error('[DB] Pool error:', err.message);
    });
  }
  return pool;
}

async function query(text, params) {
  const client = getPool();
  return client.query(text, params);
}

async function getClient() {
  return getPool().connect();
}

module.exports = { query, getClient, getPool };
