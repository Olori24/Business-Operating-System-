class DurableEventStore {
  constructor({ repository, clock = () => new Date() } = {}) {
    if (!repository || typeof repository.save !== 'function' || typeof repository.all !== 'function') {
      throw new TypeError('INVALID_EVENT_STORE');
    }
    this.repository = repository;
    this.clock = clock;
  }

  async append(event) {
    const record = normalizeEvent(event, this.clock);
    const existing = await this.repository.find('event', record.id);
    if (existing) return existing;
    return this.repository.save('event', record.id, record);
  }

  async get(id) {
    return this.repository.find('event', id);
  }

  async replay({ type, after } = {}, handler) {
    if (typeof handler !== 'function') throw new TypeError('INVALID_REPLAY_HANDLER');
    const events = await this.repository.all('event');
    const filtered = events
      .filter((event) => !type || event.type === type)
      .filter((event) => !after || event.createdAt > after)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
    for (const event of filtered) await handler(event);
    return filtered.length;
  }
}

function normalizeEvent(event, clock) {
  if (!event || typeof event !== 'object' || !event.type) throw new TypeError('INVALID_EVENT');
  const id = event.id || `evt_${crypto.randomUUID()}`;
  return {
    ...structuredClone(event),
    id,
    correlationId: event.correlationId || id,
    createdAt: event.createdAt || clock().toISOString(),
    version: event.version || 1
  };
}

module.exports = { DurableEventStore };
