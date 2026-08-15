class UsageMeter {
  constructor() { this.usage = new Map(); }

  record({ tenantId, metric, quantity = 1 }) {
    if (!tenantId || !metric) throw new Error('tenantId and metric are required');
    if (!Number.isFinite(quantity) || quantity < 0) throw new Error('quantity must be a non-negative number');
    const key = `${tenantId}:${metric}`;
    const next = (this.usage.get(key) || 0) + quantity;
    this.usage.set(key, next);
    return { tenantId, metric, quantity: next };
  }

  get({ tenantId, metric }) {
    return this.usage.get(`${tenantId}:${metric}`) || 0;
  }

  snapshot(tenantId) {
    const result = {};
    for (const [key, value] of this.usage) {
      const prefix = `${tenantId}:`;
      if (key.startsWith(prefix)) result[key.slice(prefix.length)] = value;
    }
    return result;
  }
}
module.exports = { UsageMeter };
