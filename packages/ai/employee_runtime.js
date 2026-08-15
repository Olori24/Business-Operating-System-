class EmployeeRuntime {
  constructor({ executor, policy = null, audit = null } = {}) {
    if (typeof executor !== 'function') throw new TypeError('executor is required');
    this.executor = executor;
    this.policy = policy;
    this.audit = audit;
  }

  async run({ employeeId, tenantId, objective, context = {}, metadata = {} }) {
    if (!employeeId || !tenantId || !objective) throw new TypeError('employeeId, tenantId and objective are required');
    const request = { employeeId, tenantId, objective, context, metadata };
    if (this.policy?.authorize && !(await this.policy.authorize(request))) {
      throw new Error('employee execution denied by policy');
    }
    await this.audit?.({ type: 'employee.execution.started', ...request });
    try {
      const result = await this.executor(request);
      await this.audit?.({ type: 'employee.execution.completed', employeeId, tenantId });
      return result;
    } catch (error) {
      await this.audit?.({ type: 'employee.execution.failed', employeeId, tenantId, error: error.message });
      throw error;
    }
  }
}

module.exports = { EmployeeRuntime };
