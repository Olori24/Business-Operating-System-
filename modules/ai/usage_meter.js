class AIUsageMeter {
  constructor({ budgets = {} } = {}) { this.budgets = { ...budgets }; this.usage = new Map(); }
  record({ tenantId, agentId, tokens = 0, durationMs = 0 }) {
    const key = `${tenantId}:${agentId}`;
    const current = this.usage.get(key) ?? { tokens: 0, durationMs: 0, calls: 0 };
    const next = { tokens: current.tokens + tokens, durationMs: current.durationMs + durationMs, calls: current.calls + 1 };
    const budget = this.budgets[key];
    if (budget?.tokens != null && next.tokens > budget.tokens) throw new Error('AI usage budget exceeded');
    this.usage.set(key, next); return next;
  }
  get({ tenantId, agentId }) { return this.usage.get(`${tenantId}:${agentId}`) ?? { tokens: 0, durationMs: 0, calls: 0 }; }
}
module.exports = { AIUsageMeter };
