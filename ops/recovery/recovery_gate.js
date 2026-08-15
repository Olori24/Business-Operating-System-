function recoveryGate({ backupVerified, isolationVerified, readinessVerified, operatorApproved }) {
  return Boolean(backupVerified && isolationVerified && readinessVerified && operatorApproved);
}
module.exports = { recoveryGate };
