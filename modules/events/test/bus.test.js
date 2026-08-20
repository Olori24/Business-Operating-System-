const assert = require('node:assert/strict');
const { describe, test } = require('node:test');
const { EventBus } = require('../bus');

describe('EventBus', () => {
  test('publishes events to subscribers', async () => {
    const bus = new EventBus();
    const received = [];
    bus.subscribe('task.completed', async (event) => received.push(event));
    await bus.publish({ type: 'task.completed', taskId: 'task-1' });
    assert.deepEqual(received, [{ type: 'task.completed', taskId: 'task-1' }]);
  });

  test('unsubscribe prevents future delivery', async () => {
    const bus = new EventBus();
    const received = [];
    const unsubscribe = bus.subscribe('task.completed', (event) => received.push(event));
    unsubscribe();
    await bus.publish({ type: 'task.completed', taskId: 'task-1' });
    assert.deepEqual(received, []);
  });

  test('rejects malformed events', async () => {
    const bus = new EventBus();
    await assert.rejects(() => bus.publish({}), /INVALID_EVENT/);
  });
});
