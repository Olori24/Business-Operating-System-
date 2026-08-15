class AutomationEngine {
  constructor({ actions = {} } = {}) { this.actions = { ...actions }; }
  async run({ tenantId, steps = [], context = {} }) {
    if (!tenantId) throw new TypeError('tenantId is required');
    const results = [];
    for (const step of steps) {
      if (!step?.action || typeof this.actions[step.action] !== 'function') throw new Error(`unknown automation action: ${step?.action}`);
      results.push(await this.actions[step.action]({ tenantId, context, input: step.input ?? {} }));
    }
    return { tenantId, results };
  }
}
module.exports = { AutomationEngine };
