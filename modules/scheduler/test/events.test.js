const assert = require('node:assert/strict');
const test = require('node:test');
const { InMemoryRepository } = require('../../../packages/persistence/repository');
const { EventBus } = require('../../events/bus');
const { SchedulerEngine } = require('../engine');

const task = { id: 'task-1', processId: 'process-1', status: 'pending', type: 'task' };

function setup() {
  const repository = new InMemoryRepository();
  const eventBus = new EventBus();
  const queueEngine = { enqueue: async (taskId, processId) => repository.save('queue', taskId, { id: taskId, processId, status: 'queued', attempts: 0 }) };
  return { repository, eventBus, queueEngine, scheduler: new SchedulerEngine({ repository, queueEngine, eventBus }) };
}

test('creates schedules from schedule request events', async () => {
  const { repository, eventBus } = setup();
  await repository.save('task', task.id, task);
  await eventBus.publish({ type: 'task.schedule_requested', scheduleId: 'schedule-1', taskId: task.id, processId: task.processId, runAt: '2030-01-01T10:00:00.000Z' });
  const saved = await repository.find('schedule', 'schedule-1');
  assert.equal(saved.status, 'scheduled');
});

test('publishes schedule.dispatched after enqueue', async () => {
  const { repository, eventBus, queueEngine, scheduler } = setup();
  const events = [];
  eventBus.subscribe('schedule.dispatched', (event) => events.push(event));
  await repository.save('task', task.id, task);
  await scheduler.schedule({ id: 'schedule-1', taskId: task.id, processId: task.processId, runAt: '2020-01-01T10:00:00.000Z' });
  await scheduler.dispatchDue({ now: new Date('2020-01-01T11:00:00.000Z') });
  const queueItem = await repository.find('queue', task.id);
  assert.equal(queueItem.status, 'queued');
  assert.deepEqual(events, [{ type: 'schedule.dispatched', scheduleId: 'schedule-1', taskId: task.id, processId: task.processId }]);
  assert.ok(queueEngine);
});
