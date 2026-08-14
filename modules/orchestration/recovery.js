class DurableOrchestrationRecovery {
  constructor({ state }) {
    if (!state) throw new TypeError('DurableOrchestrationRecovery requires state');
    this.state = state;
  }

  async recover(id, options = {}) {
    const execution = await this.state.get(id);
    if (!execution) throw new Error('EXECUTION_NOT_FOUND');
    if (!['pending', 'retrying', 'failed', 'resuming', 'running'].includes(execution.status)) {
      return { recovered: false, execution };
    }
    if (options.resume === false) return { recovered: false, execution };
    const recovered = await this.state.update(id, {
      status: 'resuming',
      recoveryCount: (execution.recoveryCount || 0) + 1,
      lastRecoveredAt: new Date().toISOString()
    });
    return { recovered: true, execution: recovered };
  }

  async recoverAll(options = {}) {
    const executions = await this.state.all();
    const results = [];
    for (const execution of executions) {
      results.push(await this.recover(execution.id, options));
    }
    return results;
  }
}

module.exports = { DurableOrchestrationRecovery };
