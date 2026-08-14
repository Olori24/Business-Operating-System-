class DurableOrchestrationState {
  constructor({ repository }) {
    if (!repository) throw new TypeError('DurableOrchestrationState requires a repository');
    this.repository = repository;
  }

  async create(execution) {
    if (!execution || !execution.id) throw new TypeError('Execution requires id');
    const existing = await this.repository.find('orchestration_execution', execution.id);
    if (existing) throw new Error('EXECUTION_ALREADY_EXISTS');
    return this.repository.save('orchestration_execution', execution.id, {
      ...execution,
      status: execution.status || 'pending',
      attempts: Number.isInteger(execution.attempts) ? execution.attempts : 0,
      updatedAt: execution.updatedAt || new Date().toISOString()
    });
  }

  async get(id) {
    if (!id) throw new TypeError('Execution id is required');
    return this.repository.find('orchestration_execution', id);
  }

  async update(id, patch) {
    const current = await this.get(id);
    if (!current) throw new Error('EXECUTION_NOT_FOUND');
    if (!patch || typeof patch !== 'object') throw new TypeError('State patch must be an object');
    return this.repository.save('orchestration_execution', id, {
      ...current,
      ...patch,
      id: current.id,
      updatedAt: new Date().toISOString()
    });
  }

  async resume(id) {
    const current = await this.get(id);
    if (!current) throw new Error('EXECUTION_NOT_FOUND');
    if (!['pending', 'retrying', 'failed'].includes(current.status)) {
      throw new Error('EXECUTION_NOT_RESUMABLE');
    }
    return this.update(id, { status: 'resuming' });
  }
}

module.exports = { DurableOrchestrationState };
