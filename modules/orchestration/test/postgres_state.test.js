const test = require('node:test');
const assert = require('node:assert/strict');
const { PostgresOrchestrationState } = require('../postgres_state');

test('postgres orchestration state requires a tenant and uses tenant-scoped persistence', async () => {
  const calls = [];
  const repository = {
    async save(...args) { calls.push(['save', ...args]); return args[3]; },
    async find(...args) { calls.push(['find', ...args]); return null; },
    async all(...args) { calls.push(['all', ...args]); return []; }
  };
  const state = new PostgresOrchestrationState({ repository, tenantId: 'tenant-a' });

  await assert.rejects(() => state.get('missing'), /EXECUTION_NOT_FOUND|/);
  await state.create({ id: 'exec-1', status: 'pending' });

  assert.deepEqual(calls[0], ['find', 'tenant-a', 'orchestration_execution', 'exec-1']);
  assert.deepEqual(calls[1], ['save', 'tenant-a', 'orchestration_execution', 'exec-1', {
    id: 'exec-1', status: 'pending', attempts: 0, recoveryCount: 0,
    updatedAt: assert.any
  }]);
});
