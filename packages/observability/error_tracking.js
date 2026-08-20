let reporter = null;

export function configureErrorTracking(nextReporter) {
  reporter = typeof nextReporter === "function" ? nextReporter : null;
}

export function captureException(error, context = {}) {
  if (!reporter) return;
  reporter(error, context);
}

export function hasErrorTracking() {
  return reporter !== null;
}
