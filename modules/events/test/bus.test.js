const { EventBus } = require('../bus');

describe('EventBus', () => {
  test('publishes events to subscribers', async () => {
    const bus = new EventBus();
    const received = [];
    bus.subscribe('task.completed', async (event) => received.push(event));
    await bus.publish({ type: 'task.completed', taskId: 'task-1' });
    expect(received).toEqual([{ type: 'task.completed', taskId: 'task-1' }]);
  });

  test('unsubscribe prevents future delivery', async () => {
    const bus = new EventBus();
    const received = [];
    const unsubscribe = bus.subscribe('task.completed', (event) => received.push(event));
    unsubscribe();
    await bus.publish({ type: 'task.completed', taskId: 'task-1' });
    expect(received).toEqual([]);
  });

  test('rejects malformed events', async () => {
    const bus = new EventBus();
    await expect(bus.publish({})).rejects.toThrow('INVALID_EVENT');
  });
});
