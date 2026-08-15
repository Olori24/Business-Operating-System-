function releaseGate({ ciGreen, readinessGreen, backupFresh }) {
  return Boolean(ciGreen && readinessGreen && backupFresh);
}
module.exports = { releaseGate };
