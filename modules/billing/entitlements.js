class EntitlementService {
  constructor(plans = {}) { this.plans = plans; }

  allows({ planId, capability, usage = 0 }) {
    const plan = this.plans[planId];
    if (!plan) throw new Error('unknown plan');
    const limit = plan.limits?.[capability];
    if (limit === undefined) return Boolean(plan.capabilities?.includes(capability));
    return usage < limit;
  }

  assertAllowed(input) {
    if (!this.allows(input)) throw new Error(`capability ${input.capability} is not available`);
    return true;
  }
}
module.exports = { EntitlementService };
