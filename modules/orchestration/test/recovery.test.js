const assert = require('node:assert/strict');
const test = require('node:test');
const { InMemoryRepository } = require('../../../packages/persistence/repository');
const { DurableOrchestrationState } = require('../durable_state');
const { DurableOrchestrationRecovery } = require('../recovery');

test('recovers an interrupted execution into resuming state', async () => {
  const state = new DurableOrchestrationState({ repository: new InMemoryRepository() });
  await state.create({ id: 'exec-1', status: 'running', attempts: 1 });
  const recovery = new DurableOrchestrationRecovery({ state });
  const result = await recovery.recover('exec-1');
  assert.equal(result.recovered, true);
  assert.equal(result.execution.status, 'resuming');
  assert.equal(result.execution.recoveryCount, 1);
});

test('does not recover terminal executions', async () => {
  const state = new DurableOrchestrationState({ repository: new InMemoryRepository() });
  await state.create({ id: 'exec-2', status: 'completed' });
  const recovery = new DurableOrchestrationRecovery({ state });
  const result = await recovery.recover('exec-2');
  assert.equal(result.recovered, false);
  assert.equal(result.execution.status, 'completed');
});

test('recovers all recoverable executions', async () => {
  const state = new DurableOrchestrationState({ repository: new InMemoryRepository() });
  await state.create({ id: 'exec-3', status: 'failed' });
  await state.create({ id: 'exec-4', status: 'completed' });
  const recovery = new DurableOrchestrationRecovery({ state });
  const results = await recovery.recoverAll();
  assert.equal(results.length, 2);
  assert.equal(results.filter((r) => r.recovered).length, 1);
});
