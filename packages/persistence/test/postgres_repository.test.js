const assert = require('node:assert/strict');
const test = require('node:test');
const { PostgresRepository } = require('../postgres_repository');

function fakePool() {
  const calls = [];
  return {
    calls,
    async query(text, params) {
      calls.push({ text, params });
      if (text.includes('RETURNING value')) return { rows: [{ value: { ok: true } }] };
      if (text.includes('SELECT value')) return { rows: [{ value: { ok: true } }] };
      if (text.includes('DELETE')) return { rowCount: 1 };
      return { rows: [] };
    },
    async connect() {
      return {
        query: async (text) => calls.push({ text, params: [] }),
        release() {}
      };
    }
  };
}

test('PostgresRepository scopes records by tenant', async () => {
  const pool = fakePool();
  const repository = new PostgresRepository({ pool });
  await repository.save('tenant-a', 'workflow', 'w1', { status: 'ready' });
  await repository.find('tenant-a', 'workflow', 'w1');

  assert.deepEqual(pool.calls[0].params, ['tenant-a', 'workflow', 'w1', JSON.stringify({ status: 'ready' })]);
  assert.deepEqual(pool.calls[1].params, ['tenant-a', 'workflow', 'w1']);
});

test('PostgresRepository rejects missing tenant identity', async () => {
  const repository = new PostgresRepository({ pool: fakePool() });
  await assert.rejects(() => repository.find('', 'workflow', 'w1'), /tenantId/);
});

test('PostgresRepository rolls back failed transactions', async () => {
  const pool = fakePool();
  const repository = new PostgresRepository({ pool });

  await assert.rejects(() => repository.transaction(async () => {
    throw new Error('transaction failed');
  }), /transaction failed/);

  assert.equal(pool.calls[0].text, 'BEGIN');
  assert.equal(pool.calls[1].text, 'ROLLBACK');
});
