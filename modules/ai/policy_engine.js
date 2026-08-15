class AgentPolicyEngine {
  constructor({ rules = [] } = {}) { this.rules = [...rules]; }
  evaluate(request) {
    for (const rule of this.rules) {
      if (rule.when(request)) return { allowed: Boolean(rule.allow), reason: rule.reason ?? 'policy rule' };
    }
    return { allowed: false, reason: 'no matching policy rule' };
  }
  authorize(request) {
    return this.evaluate(request).allowed;
  }
}
module.exports = { AgentPolicyEngine };
