class AgentMemoryStore {
  constructor({ maxEntries = 100 } = {}) { this.maxEntries = maxEntries; this.data = new Map(); }
  put({ tenantId, agentId, key, value }) {
    if (!tenantId || !agentId || !key) throw new TypeError('tenantId, agentId and key are required');
    const bucket = this.data.get(`${tenantId}:${agentId}`) ?? new Map();
    bucket.set(key, value);
    while (bucket.size > this.maxEntries) bucket.delete(bucket.keys().next().value);
    this.data.set(`${tenantId}:${agentId}`, bucket);
  }
  get({ tenantId, agentId, key }) { return this.data.get(`${tenantId}:${agentId}`)?.get(key) ?? null; }
  clear({ tenantId, agentId }) { this.data.delete(`${tenantId}:${agentId}`); }
}
module.exports = { AgentMemoryStore };
