const assert = require('node:assert/strict');
const test = require('node:test');
const { MigrationRunner } = require('../migrator');

function fakePool() {
  const calls = [];
  const applied = [];
  return {
    calls,
    connect: async () => ({
      query: async (sql, params = []) => {
        calls.push({ sql, params });
        if (sql.includes('SELECT version')) return { rows: applied.map((version) => ({ version })) };
        if (sql.includes('INSERT INTO bos_schema_migrations')) applied.push(params[0]);
        return { rows: [], rowCount: 0 };
      },
      release() {}
    })
  };
}

test('migration runner applies pending migrations transactionally', async () => {
  const pool = fakePool();
  const runner = new MigrationRunner({ pool });
  const result = await runner.migrate();
  assert.deepEqual(result.applied, ['001_initial.sql']);
  assert.ok(pool.calls.some(({ sql }) => sql === 'BEGIN'));
  assert.ok(pool.calls.some(({ sql }) => sql === 'COMMIT'));
});

test('migration runner does not reapply recorded migrations', async () => {
  const pool = fakePool();
  const runner = new MigrationRunner({ pool });
  await runner.migrate();
  const result = await runner.migrate();
  assert.deepEqual(result.applied, []);
});
