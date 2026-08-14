class RecoveryAwareOrchestrator {
  constructor({ state, recovery }) {
    if (!state) throw new TypeError('RecoveryAwareOrchestrator requires state');
    if (!recovery) throw new TypeError('RecoveryAwareOrchestrator requires recovery');
    this.state = state;
    this.recovery = recovery;
  }

  async execute(id, operation, options = {}) {
    if (!id) throw new TypeError('Execution id is required');
    if (typeof operation !== 'function') throw new TypeError('Operation must be a function');
    const idempotencyKey = options.idempotencyKey || id;
    let execution = await this.state.get(id);
    if (!execution) throw new Error('EXECUTION_NOT_FOUND');

    if (execution.idempotencyKey && execution.idempotencyKey !== idempotencyKey) {
      throw new Error('IDEMPOTENCY_KEY_MISMATCH');
    }
    if (!execution.idempotencyKey) {
      execution = await this.state.update(id, { idempotencyKey });
    }

    if (execution.status === 'completed') {
      return { execution, result: execution.result, reused: true, idempotencyKey };
    }

    if (execution.status !== 'running' && execution.status !== 'resuming') {
      const result = await this.recovery.recover(id);
      if (!result.recovered) throw new Error('EXECUTION_NOT_RESUMABLE');
      execution = result.execution;
    }

    execution = await this.state.update(id, {
      status: 'running',
      attempts: (execution.attempts || 0) + 1
    });

    try {
      const result = await operation(execution);
      const completed = await this.state.update(id, {
        status: 'completed',
        result,
        idempotencyKey
      });
      return { execution: completed, result, reused: false, idempotencyKey };
    } catch (error) {
      const failed = await this.state.update(id, {
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
        idempotencyKey
      });
      throw Object.assign(error instanceof Error ? error : new Error(String(error)), {
        execution: failed
      });
    }
  }
}

module.exports = { RecoveryAwareOrchestrator };
