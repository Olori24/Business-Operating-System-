class FailurePolicy {
  constructor({ maxAttempts = 3, baseDelayMs = 1000, maxDelayMs = 60000 } = {}) {
    this.maxAttempts = maxAttempts;
    this.baseDelayMs = baseDelayMs;
    this.maxDelayMs = maxDelayMs;
  }

  classify(error) {
    if (error?.retryable === false || error?.code === 'VALIDATION_ERROR' || error?.code === 'AUTHORIZATION_ERROR') return 'permanent';
    return 'transient';
  }

  next(attempt, error) {
    const classification = this.classify(error);
    if (classification === 'permanent' || attempt >= this.maxAttempts) return { action: 'dead-letter', classification, delayMs: 0 };
    const delayMs = Math.min(this.baseDelayMs * (2 ** Math.max(0, attempt - 1)), this.maxDelayMs);
    return { action: 'retry', classification, delayMs };
  }
}

module.exports = { FailurePolicy };
