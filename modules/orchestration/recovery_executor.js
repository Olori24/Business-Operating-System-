class RecoveryAwareOrchestrator {
  constructor({ state, recovery }) {
    if (!state) throw new TypeError('RecoveryAwareOrchestrator requires state');
    if (!recovery) throw new TypeError('RecoveryAwareOrchestrator requires recovery');
    this.state = state;
    this.recovery = recovery;
  }

  async execute(id, operation) {
    if (!id) throw new TypeError('Execution id is required');
    if (typeof operation !== 'function') throw new TypeError('Operation must be a function');

    let execution = await this.state.get(id);
    if (!execution) throw new Error('EXECUTION_NOT_FOUND');

    if (execution.status === 'completed') {
      return { execution, result: execution.result, reused: true };
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
        result
      });
      return { execution: completed, result, reused: false };
    } catch (error) {
      const failed = await this.state.update(id, {
        status: 'failed',
        error: error instanceof Error ? error.message : String(error)
      });
      throw Object.assign(error instanceof Error ? error : new Error(String(error)), {
        execution: failed
      });
    }
  }
}

module.exports = { RecoveryAwareOrchestrator };
