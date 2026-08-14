const assert = require('node:assert/strict');
const test = require('node:test');
const { SchedulerEngine } = require('../engine');
const { InMemoryRepository } = require('../../../packages/persistence/repository');
const { QueueWorkerEngine } = require('../../queue/engine');

const task = { id: 'task-1', processId: 'process-1', status: 'pending' };

function setup() {
  const repository = new InMemoryRepository();
  const workflowEngine = { completeTask: async () => {} };
  const queueEngine = new QueueWorkerEngine({ repository, workflowEngine });
  return { repository, scheduler: new SchedulerEngine({ repository, queueEngine }) };
}

test('schedules a task and dispatches it when due', async () => {
  const { repository, scheduler } = setup();
  await repository.save('task', task.id, task);
  await scheduler.schedule({ id: 'schedule-1', taskId: task.id, processId: task.processId, runAt: '2026-08-14T10:00:00.000Z' });
  const dispatched = await scheduler.dispatchDue({ now: '2026-08-14T10:01:00.000Z' });
  assert.equal(dispatched.length, 1);
  assert.equal((await repository.find('queue', task.id)).status, 'queued');
  assert.equal((await repository.find('schedule', 'schedule-1')).status, 'dispatched');
});

test('does not dispatch future schedules', async () => {
  const { repository, scheduler } = setup();
  await repository.save('task', task.id, task);
  await scheduler.schedule({ id: 'schedule-2', taskId: task.id, processId: task.processId, runAt: '2026-08-14T12:00:00.000Z' });
  const dispatched = await scheduler.dispatchDue({ now: '2026-08-14T11:59:00.000Z' });
  assert.equal(dispatched.length, 0);
  assert.equal(await repository.find('queue', task.id), null);
});

test('rejects scheduling across process boundaries', async () => {
  const { repository, scheduler } = setup();
  await repository.save('task', task.id, task);
  await assert.rejects(
    scheduler.schedule({ id: 'schedule-3', taskId: task.id, processId: 'other-process', runAt: '2026-08-14T10:00:00.000Z' }),
    /TASK_NOT_FOUND/
  );
});
