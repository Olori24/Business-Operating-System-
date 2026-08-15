const { Pool } = require('pg');

function createPostgresPool({ connectionString = process.env.DATABASE_URL, max = 10, idleTimeoutMillis = 30_000, connectionTimeoutMillis = 5_000 } = {}) {
  if (!connectionString) throw new TypeError('DATABASE_URL is required');
  if (!Number.isInteger(max) || max < 1) throw new TypeError('max must be a positive integer');
  return new Pool({ connectionString, max, idleTimeoutMillis, connectionTimeoutMillis });
}

module.exports = { createPostgresPool };
