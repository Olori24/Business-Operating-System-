class AutomationRuleEngine {
  constructor({ rules = [] } = {}) { this.rules = [...rules]; }
  evaluate({ tenantId, event }) {
    return this.rules.filter(rule => rule.tenantId === tenantId && rule.enabled !== false && rule.when(event)).map(rule => ({ id: rule.id, actions: [...rule.actions] }));
  }
}
module.exports = { AutomationRuleEngine };
