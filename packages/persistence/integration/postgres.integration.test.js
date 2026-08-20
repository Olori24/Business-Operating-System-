const assert = require('node:assert/strict');
const test = require('node:test');
const { createPostgresPool } = require('../pool');
const { PostgresRepository } = require('../postgres_repository');

const connectionString = process.env.DATABASE_URL;

test('PostgresRepository persists and retrieves tenant-scoped records', async (t) => {
  assert.ok(connectionString, 'DATABASE_URL is required for integration tests');
  const pool = createPostgresPool({ connectionString, max: 2 });
  t.after(async () => pool.end());
  await pool.query(`CREATE TABLE IF NOT EXISTS bos_records (tenant_id TEXT NOT NULL, record_type TEXT NOT NULL, record_id TEXT NOT NULL, value JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY (tenant_id, record_type, record_id))`);
  const repository = new PostgresRepository({ pool });
  const tenant = `integration_${Date.now()}`;
  const value = { id: 'record-1', status: 'ok', nested: { verified: true } };
  assert.deepEqual(await repository.save(tenant, 'test', value.id, value), value);
  assert.deepEqual(await repository.find(tenant, 'test', value.id), value);
  assert.deepEqual(await repository.all(tenant, 'test'), [value]);
  assert.equal(await repository.delete(tenant, 'test', value.id), true);
  assert.equal(await repository.find(tenant, 'test', value.id), null);
});
