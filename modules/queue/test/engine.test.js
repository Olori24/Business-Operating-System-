const assert = require('node:assert/strict');
const test = require('node:test');
const { InMemoryRepository } = require('../../../packages/persistence/repository');
const { WorkflowEngine } = require('../../workflow/engine');
const { createTask } = require('../../business/domain');
const { QueueWorkerEngine } = require('../engine');

test('enqueue and claim a task with a worker lease', async () => {
  const repository = new InMemoryRepository();
  const workflowEngine = new WorkflowEngine({ repository });
  const queue = new QueueWorkerEngine({ repository, workflowEngine });
  await repository.save('task', 'task-1', createTask({ id: 'task-1', processId: 'process-1', name: 'Do work' }));
  const queued = await queue.enqueue('task-1', 'process-1');
  assert.equal(queued.status, 'queued');
  const claimed = await queue.claim('task-1', 'worker-a');
  assert.equal(claimed.status, 'processing');
  assert.equal(claimed.attempts, 1);
  assert.equal(claimed.workerId, 'worker-a');
  assert.ok(claimed.leaseExpiresAt > Date.now());
});

test('rejects cross-process enqueue', async () => {
  const repository = new InMemoryRepository();
  const queue = new QueueWorkerEngine({ repository, workflowEngine: {} });
  await repository.save('task', 'task-1', createTask({ id: 'task-1', processId: 'process-1', name: 'Do work' }));
  await assert.rejects(() => queue.enqueue('task-1', 'process-2'), { message: 'TASK_NOT_FOUND' });
});

test('prevents a different worker from completing a leased task', async () => {
  const repository = new InMemoryRepository();
  const workflowEngine = new WorkflowEngine({ repository });
  const queue = new QueueWorkerEngine({ repository, workflowEngine });
  await repository.save('task', 'task-1', createTask({ id: 'task-1', processId: 'process-1', name: 'Do work' }));
  await queue.enqueue('task-1', 'process-1');
  await queue.claim('task-1', 'worker-a');
  await assert.rejects(() => queue.complete('task-1', 'worker-b'), { message: 'LEASE_NOT_OWNED' });
});

test('heartbeat renews an active worker lease', async () => {
  const repository = new InMemoryRepository();
  const queue = new QueueWorkerEngine({ repository, workflowEngine: {}, leaseMs: 100 });
  await repository.save('task', 'task-1', createTask({ id: 'task-1', processId: 'process-1', name: 'Do work' }));
  await queue.enqueue('task-1', 'process-1');
  const claimed = await queue.claim('task-1', 'worker-a');
  const renewed = await queue.heartbeat('task-1', 'worker-a', 5000);
  assert.ok(renewed.leaseExpiresAt > claimed.leaseExpiresAt);
});

test('reclaims expired worker leases', async () => {
  const repository = new InMemoryRepository();
  const queue = new QueueWorkerEngine({ repository, workflowEngine: {}, leaseMs: 1 });
  await repository.save('task', 'task-1', createTask({ id: 'task-1', processId: 'process-1', name: 'Do work' }));
  await queue.enqueue('task-1', 'process-1');
  await queue.claim('task-1', 'worker-a', 1);
  await new Promise((resolve) => setTimeout(resolve, 5));
  const reclaimed = await queue.reclaimExpired();
  assert.equal(reclaimed.length, 1);
  assert.equal(reclaimed[0].status, 'queued');
  assert.equal(reclaimed[0].workerId, null);
});

test('completes a claimed task and clears lease state', async () => {
  const repository = new InMemoryRepository();
  const workflowEngine = new WorkflowEngine({ repository });
  const queue = new QueueWorkerEngine({ repository, workflowEngine });
  await repository.save('task', 'task-1', createTask({ id: 'task-1', processId: 'process-1', name: 'Do work' }));
  await queue.enqueue('task-1', 'process-1');
  await queue.claim('task-1', 'worker-a');
  const completed = await queue.complete('task-1', 'worker-a');
  assert.equal(completed.status, 'completed');
  assert.equal(completed.workerId, null);
  assert.equal(completed.leaseExpiresAt, null);
  assert.equal((await repository.find('task', 'task-1')).status, 'completed');
});

test('requeues a processing task for retry and clears ownership', async () => {
  const repository = new InMemoryRepository();
  const queue = new QueueWorkerEngine({ repository, workflowEngine: {} });
  await repository.save('task', 'task-1', createTask({ id: 'task-1', processId: 'process-1', name: 'Do work' }));
  await queue.enqueue('task-1', 'process-1');
  await queue.claim('task-1', 'worker-a');
  const retried = await queue.retry('task-1', 'worker-a');
  assert.equal(retried.status, 'queued');
  assert.equal(retried.workerId, null);
  assert.equal(retried.leaseExpiresAt, null);
});
