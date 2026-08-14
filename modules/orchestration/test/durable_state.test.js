const assert = require('node:assert/strict');
const test = require('node:test');
const { InMemoryRepository } = require('../../../packages/persistence/repository');
const { DurableOrchestrationState } = require('../durable_state');

test('persists and retrieves execution state', async () => {
  const repository = new InMemoryRepository();
  const state = new DurableOrchestrationState({ repository });
  await state.create({ id: 'exec-1', workflowId: 'workflow-1', status: 'pending' });
  const stored = await state.get('exec-1');
  assert.equal(stored.workflowId, 'workflow-1');
  assert.equal(stored.attempts, 0);
});

test('updates state without allowing id replacement', async () => {
  const repository = new InMemoryRepository();
  const state = new DurableOrchestrationState({ repository });
  await state.create({ id: 'exec-1', status: 'retrying' });
  const updated = await state.update('exec-1', { status: 'failed', id: 'evil' });
  assert.equal(updated.id, 'exec-1');
  assert.equal(updated.status, 'failed');
});

test('prevents duplicate execution creation', async () => {
  const repository = new InMemoryRepository();
  const state = new DurableOrchestrationState({ repository });
  await state.create({ id: 'exec-1' });
  await assert.rejects(() => state.create({ id: 'exec-1' }), /EXECUTION_ALREADY_EXISTS/);
});

test('resumes a retryable execution', async () => {
  const repository = new InMemoryRepository();
  const state = new DurableOrchestrationState({ repository });
  await state.create({ id: 'exec-1', status: 'retrying' });
  const resumed = await state.resume('exec-1');
  assert.equal(resumed.status, 'resuming');
});

test('rejects completed executions from resume', async () => {
  const repository = new InMemoryRepository();
  const state = new DurableOrchestrationState({ repository });
  await state.create({ id: 'exec-1', status: 'completed' });
  await assert.rejects(() => state.resume('exec-1'), /EXECUTION_NOT_RESUMABLE/);
});
