const assert = require('node:assert/strict');
const test = require('node:test');
const { InMemoryRepository } = require('../../../packages/persistence/repository');
const { EventBus } = require('../../events/bus');
const { QueueWorkerEngine } = require('../engine');

test('queues downstream task from task.completed event', async () => {
  const repository = new InMemoryRepository();
  const eventBus = new EventBus();
  await repository.save('task', 'next-1', { id: 'next-1', processId: 'process-1', status: 'pending', type: 'task' });
  const workflowEngine = { completeTask: async () => {} };
  new QueueWorkerEngine({ repository, workflowEngine, eventBus });

  await eventBus.publish({ type: 'task.completed', taskId: 'current-1', processId: 'process-1', nextTaskId: 'next-1', status: 'completed' });

  const item = await repository.find('queue', 'next-1');
  assert.deepEqual(item, { id: 'next-1', processId: 'process-1', status: 'queued', attempts: 0 });
});

test('ignores completion events without downstream work', async () => {
  const repository = new InMemoryRepository();
  const eventBus = new EventBus();
  const workflowEngine = { completeTask: async () => {} };
  new QueueWorkerEngine({ repository, workflowEngine, eventBus });
  await eventBus.publish({ type: 'task.completed', taskId: 'current-1', processId: 'process-1', status: 'completed' });
  assert.equal((await repository.all('queue')).length, 0);
});
