const metrics = {
  requests: 0,
  errors: 0,
  startedAt: new Date().toISOString(),
};

function recordRequest() {
  metrics.requests += 1;
}

function recordError() {
  metrics.errors += 1;
}

function snapshot({ queueDepth = 0 } = {}) {
  return {
    requests: metrics.requests,
    errors: metrics.errors,
    queueDepth: Number.isFinite(queueDepth) ? queueDepth : 0,
    uptimeSeconds: Math.floor(process.uptime()),
    startedAt: metrics.startedAt,
  };
}

function resetForTests() {
  metrics.requests = 0;
  metrics.errors = 0;
  metrics.startedAt = new Date().toISOString();
}

module.exports = { recordRequest, recordError, snapshot, resetForTests };
