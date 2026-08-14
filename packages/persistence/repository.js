class InMemoryRepository {
  constructor() {
    this.records = new Map();
  }

  async save(type, id, value) {
    if (!type || !id) throw new TypeError('Repository requires type and id');
    this.records.set(`${type}:${id}`, structuredClone(value));
    return structuredClone(value);
  }

  async find(type, id) {
    const value = this.records.get(`${type}:${id}`);
    return value === undefined ? null : structuredClone(value);
  }

  async all(type) {
    return [...this.records.entries()]
      .filter(([key]) => key.startsWith(`${type}:`))
      .map(([, value]) => structuredClone(value));
  }

  async delete(type, id) {
    return this.records.delete(`${type}:${id}`);
  }

  async clear() {
    this.records.clear();
  }
}

module.exports = { InMemoryRepository };
