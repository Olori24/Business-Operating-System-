const assert = require('node:assert/strict');
const test = require('node:test');
const { InMemoryRepository } = require('../../../packages/persistence/repository');
const { WorkflowEngine } = require('../../workflow/engine');
const { createTask } = require('../../business/domain');
const { QueueWorkerEngine } = require('../engine');

test('enqueue and claim a task', async () => {
  const repository = new InMemoryRepository();
  const workflowEngine = new WorkflowEngine({ repository });
  const queue = new QueueWorkerEngine({ repository, workflowEngine });
  await repository.save('task', 'task-1', createTask({ id: 'task-1', processId: 'process-1', name: 'Do work' }));

  const queued = await queue.enqueue('task-1', 'process-1');
  assert.equal(queued.status, 'queued');
  const claimed = await queue.claim('task-1');
  assert.equal(claimed.status, 'processing');
  assert.equal(claimed.attempts, 1);
});

test('rejects cross-process enqueue', async () => {
  const repository = new InMemoryRepository();
  const queue = new QueueWorkerEngine({ repository, workflowEngine: {} });
  await repository.save('task', 'task-1', createTask({ id: 'task-1', processId: 'process-1', name: 'Do work' }));
  await assert.rejects(() => queue.enqueue('task-1', 'process-2'), { message: 'TASK_NOT_FOUND' });
});

test('completes a claimed task and records queue state', async () => {
  const repository = new InMemoryRepository();
  const workflowEngine = new WorkflowEngine({ repository });
  const queue = new QueueWorkerEngine({ repository, workflowEngine });
  await repository.save('task', 'task-1', createTask({ id: 'task-1', processId: 'process-1', name: 'Do work' }));
  await queue.enqueue('task-1', 'process-1');
  await queue.claim('task-1');

  const completed = await queue.complete('task-1');
  assert.equal(completed.status, 'completed');
  assert.equal((await repository.find('task', 'task-1')).status, 'completed');
});

test('requeues a processing task for retry', async () => {
  const repository = new InMemoryRepository();
  const queue = new QueueWorkerEngine({ repository, workflowEngine: {} });
  await repository.save('task', 'task-1', createTask({ id: 'task-1', processId: 'process-1', name: 'Do work' }));
  await queue.enqueue('task-1', 'process-1');
  await queue.claim('task-1');

  const retried = await queue.retry('task-1');
  assert.equal(retried.status, 'queued');
});
