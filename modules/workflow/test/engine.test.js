const assert = require('node:assert/strict');
const test = require('node:test');
const { InMemoryRepository } = require('../../../packages/persistence/repository');
const { WorkflowEngine } = require('../engine');

test('starts a pending task', async () => {
  const repository = new InMemoryRepository();
  await repository.save('task', 'task-1', { id: 'task-1', processId: 'process-1', name: 'First task', status: 'pending', type: 'task' });
  const engine = new WorkflowEngine({ repository });

  const task = await engine.startTask({ taskId: 'task-1', processId: 'process-1' });
  assert.equal(task.status, 'in_progress');
});

test('completes an in-progress task', async () => {
  const repository = new InMemoryRepository();
  await repository.save('task', 'task-1', { id: 'task-1', processId: 'process-1', name: 'First task', status: 'in_progress', type: 'task' });
  const engine = new WorkflowEngine({ repository });

  const task = await engine.completeTask({ taskId: 'task-1', processId: 'process-1' });
  assert.equal(task.status, 'completed');
});

test('rejects a task from another process', async () => {
  const repository = new InMemoryRepository();
  await repository.save('task', 'task-1', { id: 'task-1', processId: 'process-1', name: 'First task', status: 'pending', type: 'task' });
  const engine = new WorkflowEngine({ repository });

  await assert.rejects(
    engine.startTask({ taskId: 'task-1', processId: 'process-2' }),
    /PROCESS_BOUNDARY_VIOLATION/
  );
});

test('rejects completing an already completed task', async () => {
  const repository = new InMemoryRepository();
  await repository.save('task', 'task-1', { id: 'task-1', processId: 'process-1', name: 'First task', status: 'completed', type: 'task' });
  const engine = new WorkflowEngine({ repository });

  await assert.rejects(
    engine.completeTask({ taskId: 'task-1', processId: 'process-1' }),
    /TASK_ALREADY_COMPLETED/
  );
});
