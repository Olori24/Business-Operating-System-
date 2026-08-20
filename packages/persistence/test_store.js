class TestStore {
  constructor() {
    this.records = new Map();
    this.repository = this;
    this.pool = { query: async () => ({ rows: [], rowCount: 0 }) };
  }

  #key(tenantId, type, id) {
    if (!tenantId || !type || !id) throw new TypeError('Repository requires tenantId, type and id');
    return `${tenantId}:${type}:${id}`;
  }

  async save(tenantId, type, id, value) {
    this.records.set(this.#key(tenantId, type, id), structuredClone(value));
    return structuredClone(value);
  }

  async find(tenantId, type, id) {
    const value = this.records.get(this.#key(tenantId, type, id));
    return value === undefined ? null : structuredClone(value);
  }

  async all(tenantId, type) {
    if (!tenantId || !type) throw new TypeError('Repository requires tenantId and type');
    const prefix = `${tenantId}:${type}:`;
    return [...this.records.entries()]
      .filter(([key]) => key.startsWith(prefix))
      .map(([, value]) => structuredClone(value));
  }

  async delete(tenantId, type, id) {
    return this.records.delete(this.#key(tenantId, type, id));
  }

  async transaction(callback) {
    return callback(this.pool);
  }
}

function createTestStore() {
  return new TestStore();
}

module.exports = { TestStore, createTestStore };
