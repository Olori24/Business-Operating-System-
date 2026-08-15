function health({ version = '1.0.0', now = new Date().toISOString() } = {}) {
  return { status: 'ok', version, timestamp: now };
}

function readiness({ dependencies = {} } = {}) {
  const checks = Object.fromEntries(Object.entries(dependencies).map(([name, value]) => [name, value === true]));
  const ready = Object.values(checks).every(Boolean);
  return { status: ready ? 'ready' : 'not_ready', checks };
}

module.exports = { health, readiness };
