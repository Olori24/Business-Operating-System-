class EventBus {
  constructor({ store } = {}) {
    this.handlers = new Map();
    this.store = store;
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
    const persisted = this.store ? await this.store.append(event) : event;
    const handlers = this.handlers.get(persisted.type) || new Set();
    for (const handler of handlers) await handler(persisted);
    return persisted;
  }
}

module.exports = { EventBus };
