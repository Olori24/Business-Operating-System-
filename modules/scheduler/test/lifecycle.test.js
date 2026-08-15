const assert = require('node:assert/strict');
const test = require('node:test');
const { InMemoryRepository } = require('../../../packages/persistence/repository');
const { SchedulerEngine } = require('../engine');

test('cancels a scheduled task before dispatch', async () => {
  const repository = new InMemoryRepository();
  await repository.save('task', 'task-1', { id: 'task-1', processId: 'process-1', status: 'pending' });
  const engine = new SchedulerEngine({ repository, queueEngine: { enqueue: async () => {} } });
  await engine.schedule({ id: 'schedule-1', taskId: 'task-1', processId: 'process-1', runAt: '2026-01-01T00:00:00.000Z' });
  assert.equal((await engine.cancel('schedule-1')).status, 'cancelled');
  assert.deepEqual(await engine.dispatchDue({ now: new Date('2026-01-02T00:00:00.000Z') }), []);
});

test('returns failed dispatches to scheduled state', async () => {
  const repository = new InMemoryRepository();
  await repository.save('task', 'task-1', { id: 'task-1', processId: 'process-1', status: 'pending' });
  const engine = new SchedulerEngine({ repository, queueEngine: { enqueue: async () => { throw new Error('QUEUE_DOWN'); } } });
  await engine.schedule({ id: 'schedule-1', taskId: 'task-1', processId: 'process-1', runAt: '2026-01-01T00:00:00.000Z' });
  await assert.rejects(() => engine.dispatchDue({ now: new Date('2026-01-02T00:00:00.000Z') }), /QUEUE_DOWN/);
  assert.equal((await repository.find('schedule', 'schedule-1')).status, 'scheduled');
});
