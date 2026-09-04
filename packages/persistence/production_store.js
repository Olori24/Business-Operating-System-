const { createPostgresPool } = require('./pool');
const { PostgresRepository } = require('./postgres_repository');

const CORE_SCHEMA = `
CREATE TABLE IF NOT EXISTS bos_records (
  tenant_id TEXT NOT NULL,
  record_type TEXT NOT NULL,
  record_id TEXT NOT NULL,
  value JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (tenant_id, record_type, record_id)
);
CREATE INDEX IF NOT EXISTS bos_records_tenant_type_idx ON bos_records (tenant_id, record_type);
CREATE INDEX IF NOT EXISTS bos_records_updated_at_idx ON bos_records (updated_at);
`;

let storePromise;

async function getProductionStore() {
  if (!process.env.DATABASE_URL) return null;
  if (!storePromise) {
    storePromise = (async () => {
      const pool = createPostgresPool({ max: 10 });
      await pool.query(CORE_SCHEMA);
      const fs = require('node:fs');
      const path = require('node:path');
      const domainSchema = fs.readFileSync(path.join(__dirname, 'saas_schema.sql'), 'utf8');
      await pool.query(domainSchema);
      return { pool, repository: new PostgresRepository({ pool }) };
    })().catch((error) => {
      storePromise = undefined;
      throw error;
    });
  }
  return storePromise;
}

module.exports = { getProductionStore };
