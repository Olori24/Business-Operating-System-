const assert = require('node:assert/strict');
const test = require('node:test');
const { InMemoryRepository } = require('../../../packages/persistence/repository');
const { DurableEventStore } = require('../durable_store');
const { EventBus } = require('../bus');

test('persists events with identity, correlation and version metadata', async () => {
  const repository = new InMemoryRepository();
  const store = new DurableEventStore({ repository, clock: () => new Date('2026-08-15T00:00:00.000Z') });
  const event = await store.append({ id: 'evt-1', type: 'task.completed', taskId: 'task-1', correlationId: 'corr-1' });
  assert.deepEqual(event, {
    id: 'evt-1',
    type: 'task.completed',
    taskId: 'task-1',
    correlationId: 'corr-1',
    createdAt: '2026-08-15T00:00:00.000Z',
    version: 1
  });
});

test('append is idempotent for an existing event id', async () => {
  const repository = new InMemoryRepository();
  const store = new DurableEventStore({ repository });
  const first = await store.append({ id: 'evt-1', type: 'task.completed' });
  const second = await store.append({ id: 'evt-1', type: 'task.completed', changed: true });
  assert.deepEqual(second, first);
  assert.equal((await repository.all('event')).length, 1);
});

test('replays persisted events in deterministic order', async () => {
  const repository = new InMemoryRepository();
  const store = new DurableEventStore({ repository, clock: () => new Date('2026-08-15T00:00:00.000Z') });
  await store.append({ id: 'evt-2', type: 'task.completed', createdAt: '2026-08-15T00:00:02.000Z' });
  await store.append({ id: 'evt-1', type: 'task.created', createdAt: '2026-08-15T00:00:01.000Z' });
  const received = [];
  const count = await store.replay({}, (event) => received.push(event.id));
  assert.equal(count, 2);
  assert.deepEqual(received, ['evt-1', 'evt-2']);
});

test('event bus persists before delivery when configured', async () => {
  const repository = new InMemoryRepository();
  const store = new DurableEventStore({ repository });
  const bus = new EventBus({ store });
  const received = [];
  bus.subscribe('task.completed', (event) => received.push(event));
  const published = await bus.publish({ id: 'evt-1', type: 'task.completed' });
  assert.equal(published.id, 'evt-1');
  assert.equal((await repository.all('event')).length, 1);
  assert.deepEqual(received, [published]);
});
