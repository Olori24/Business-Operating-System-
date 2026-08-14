class OrchestrationReliability {
  constructor({ maxAttempts = 3, onFailure = null } = {}) {
    if (!Number.isInteger(maxAttempts) || maxAttempts < 1) {
      throw new TypeError('INVALID_MAX_ATTEMPTS');
    }
    if (onFailure !== null && typeof onFailure !== 'function') {
      throw new TypeError('INVALID_FAILURE_HANDLER');
    }
    this.maxAttempts = maxAttempts;
    this.onFailure = onFailure;
  }

  async execute(operation, context = {}) {
    if (typeof operation !== 'function') throw new TypeError('INVALID_OPERATION');

    let lastError;
    for (let attempt = 1; attempt <= this.maxAttempts; attempt += 1) {
      try {
        return await operation({ ...context, attempt });
      } catch (error) {
        lastError = error;
        if (attempt === this.maxAttempts) break;
      }
    }

    const failure = {
      ...context,
      attempts: this.maxAttempts,
      error: lastError
    };
    if (this.onFailure) await this.onFailure(failure);
    throw lastError;
  }
}

module.exports = { OrchestrationReliability };
