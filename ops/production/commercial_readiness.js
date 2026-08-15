const REQUIRED_GATES = ['onboarding', 'billing', 'entitlements', 'apiKeys', 'webhooks', 'tenantIsolation', 'observability', 'recovery'];

class CommercialReadiness {
  certify(gates = {}) {
    const missing = REQUIRED_GATES.filter(name => gates[name] !== true);
    return { ready: missing.length === 0, missing, gates: { ...gates } };
  }

  assertReady(gates = {}) {
    const result = this.certify(gates);
    if (!result.ready) throw new Error(`COMMERCIAL_NOT_READY:${result.missing.join(',')}`);
    return result;
  }
}
module.exports = { CommercialReadiness, REQUIRED_GATES };
