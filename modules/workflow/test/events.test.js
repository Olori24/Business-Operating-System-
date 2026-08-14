const assert = require('node:assert/strict');
const test = require('node:test');
const { InMemoryRepository } = require('../../../packages/persistence/repository');
const { EventBus } = require('../../events/bus');
const { WorkflowEngine } = require('../engine');

test('publishes task.started after persistence', async () => {
  const repository = new InMemoryRepository();
  const eventBus = new EventBus();
  const events = [];
  eventBus.subscribe('task.started', (event) => events.push(event));
  await repository.save('task', 'task-1', { id: 'task-1', processId: 'process-1', status: 'pending', type: 'task' });

  const engine = new WorkflowEngine({ repository, eventBus });
  const task = await engine.startTask({ taskId: 'task-1', processId: 'process-1' });

  assert.equal(task.status, 'in_progress');
  assert.deepEqual(events, [{ type: 'task.started', taskId: 'task-1', processId: 'process-1', status: 'in_progress' }]);
});

test('publishes task.completed after persistence', async () => {
  const repository = new InMemoryRepository();
  const eventBus = new EventBus();
  const events = [];
  eventBus.subscribe('task.completed', (event) => events.push(event));
  await repository.save('task', 'task-1', { id: 'task-1', processId: 'process-1', status: 'in_progress', type: 'task' });

  const engine = new WorkflowEngine({ repository, eventBus });
  await engine.completeTask({ taskId: 'task-1', processId: 'process-1' });

  assert.deepEqual(events, [{ type: 'task.completed', taskId: 'task-1', processId: 'process-1', status: 'completed' }]);
});

test('preserves workflow behavior without an event bus', async () => {
  const repository = new InMemoryRepository();
  await repository.save('task', 'task-1', { id: 'task-1', processId: 'process-1', status: 'pending', type: 'task' });
  const engine = new WorkflowEngine({ repository });
  const task = await engine.startTask({ taskId: 'task-1', processId: 'process-1' });
  assert.equal(task.status, 'in_progress');
});
