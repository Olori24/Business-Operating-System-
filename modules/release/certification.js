const REQUIRED_GATES = Object.freeze([
  'persistence', 'orchestration', 'workers', 'leases', 'failureHandling',
  'observability', 'tenantIsolation', 'productionApi', 'onboarding',
  'organizations', 'integrations', 'billing', 'deployment', 'recovery', 'security'
]);

function certify(gates) {
  const missing = REQUIRED_GATES.filter(name => gates?.[name] !== true);
  return { certified: missing.length === 0, missing, gates: { ...gates } };
}
module.exports = { REQUIRED_GATES, certify };
