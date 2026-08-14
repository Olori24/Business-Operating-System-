class EventBus {
  constructor() {
    this.handlers = new Map();
  }

  subscribe(eventType, handler) {
    if (!eventType || typeof handler !== 'function') throw new TypeError('INVALID_SUBSCRIPTION');
    const handlers = this.handlers.get(eventType) || new Set();
    handlers.add(handler);
    this.handlers.set(eventType, handlers);
    return () => handlers.delete(handler);
  }

  async publish(event) {
    if (!event || !event.type) throw new TypeError('INVALID_EVENT');
    const handlers = this.handlers.get(event.type) || new Set();
    for (const handler of handlers) await handler(event);
  }
}

module.exports = { EventBus };
