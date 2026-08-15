const REQUIRED_GATES = Object.freeze(['identity', 'policy', 'memory', 'verification', 'approval', 'usage']);
function assessAIReadiness(gates = {}) {
  const missing = REQUIRED_GATES.filter(name => gates[name] !== true);
  return { ready: missing.length === 0, missing, required: [...REQUIRED_GATES] };
}
module.exports = { REQUIRED_GATES, assessAIReadiness };
