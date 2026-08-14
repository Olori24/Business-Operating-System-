const test = require('node:test');
const assert = require('node:assert/strict');
const { InMemoryRepository } = require('../../../packages/persistence/repository');
const { DurableOrchestrationState } = require('../durable_state');
const { DurableOrchestrationRecovery } = require('../recovery');
const { RecoveryAwareOrchestrator } = require('../recovery_executor');

test('recovery-aware execution resumes and completes a recoverable execution', async () => {
  const state = new DurableOrchestrationState({ repository: new InMemoryRepository() });
  const recovery = new DurableOrchestrationRecovery({ state });
  const orchestrator = new RecoveryAwareOrchestrator({ state, recovery });
  await state.create({ id: 'exec-1', status: 'failed', attempts: 1 });

  const result = await orchestrator.execute('exec-1', async () => 'done');

  assert.equal(result.result, 'done');
  assert.equal(result.reused, false);
  assert.equal(result.execution.status, 'completed');
  assert.equal(result.execution.recoveryCount, 1);
  assert.equal(result.execution.attempts, 2);
});

test('recovery-aware execution persists failure state', async () => {
  const state = new DurableOrchestrationState({ repository: new InMemoryRepository() });
  const recovery = new DurableOrchestrationRecovery({ state });
  const orchestrator = new RecoveryAwareOrchestrator({ state, recovery });
  await state.create({ id: 'exec-2', status: 'failed' });

  await assert.rejects(() => orchestrator.execute('exec-2', async () => {
    throw new Error('boom');
  }), /boom/);

  const execution = await state.get('exec-2');
  assert.equal(execution.status, 'failed');
  assert.equal(execution.error, 'boom');
  assert.equal(execution.recoveryCount, 1);
});

test('completed executions are not re-executed', async () => {
  const state = new DurableOrchestrationState({ repository: new InMemoryRepository() });
  const recovery = new DurableOrchestrationRecovery({ state });
  const orchestrator = new RecoveryAwareOrchestrator({ state, recovery });
  await state.create({ id: 'exec-3', status: 'completed', result: 'already-done' });

  let calls = 0;
  const result = await orchestrator.execute('exec-3', async () => {
    calls += 1;
    return 'unexpected';
  });

  assert.equal(calls, 0);
  assert.equal(result.reused, true);
  assert.equal(result.result, 'already-done');
  assert.equal(result.execution.status, 'completed');
});
