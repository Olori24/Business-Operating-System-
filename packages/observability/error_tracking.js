let reporter = null;

function configureErrorTracking(nextReporter) {
  reporter = typeof nextReporter === 'function' ? nextReporter : null;
}

function captureException(error, context = {}) {
  if (!reporter) return;
  reporter(error, context);
}

function hasErrorTracking() {
  return reporter !== null;
}

module.exports = { configureErrorTracking, captureException, hasErrorTracking };
