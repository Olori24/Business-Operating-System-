function securityGate({ tenantIsolation, authz, secretsHygiene, ciGreen, recoveryControls }) {
  return Boolean(tenantIsolation && authz && secretsHygiene && ciGreen && recoveryControls);
}
module.exports = { securityGate };
