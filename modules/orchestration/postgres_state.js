const { DurableOrchestrationState } = require('./durable_state');
const { TenantScopedRepository } = require('../../packages/persistence/tenant_scoped_repository');

class PostgresOrchestrationState extends DurableOrchestrationState {
  constructor({ repository, tenantId }) {
    super({ repository: new TenantScopedRepository({ repository, tenantId }) });
    this.tenantId = tenantId;
  }
}

module.exports = { PostgresOrchestrationState };
