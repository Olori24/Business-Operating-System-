const test = require('node:test');
const assert = require('node:assert/strict');
const { PostgresOrchestrationState } = require('../postgres_state');

test('postgres orchestration state uses tenant-scoped persistence', async () => {
  const calls = [];
  const repository = {
    async save(...args) { calls.push(['save', ...args]); return args[3]; },
    async find(...args) { calls.push(['find', ...args]); return null; },
    async all(...args) { calls.push(['all', ...args]); return []; }
  };
  const state = new PostgresOrchestrationState({ repository, tenantId: 'tenant-a' });

  await state.create({ id: 'exec-1', status: 'pending' });

  assert.deepEqual(calls[0], ['find', 'tenant-a', 'orchestration_execution', 'exec-1']);
  assert.equal(calls[1][0], 'save');
  assert.equal(calls[1][1], 'tenant-a');
  assert.equal(calls[1][2], 'orchestration_execution');
  assert.equal(calls[1][3], 'exec-1');
  assert.equal(calls[1][4].status, 'pending');
  assert.equal(calls[1][4].attempts, 0);
  assert.equal(calls[1][4].recoveryCount, 0);
  assert.equal(typeof calls[1][4].updatedAt, 'string');
});
