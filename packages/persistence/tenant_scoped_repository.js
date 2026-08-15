class TenantScopedRepository {
  constructor({ repository, tenantId }) {
    if (!repository) throw new TypeError('TenantScopedRepository requires a repository');
    if (!tenantId) throw new TypeError('TenantScopedRepository requires tenantId');
    this.repository = repository;
    this.tenantId = tenantId;
  }

  save(type, id, value) {
    return this.repository.save(this.tenantId, type, id, value);
  }

  find(type, id) {
    return this.repository.find(this.tenantId, type, id);
  }

  all(type) {
    return this.repository.all(this.tenantId, type);
  }

  delete(type, id) {
    return this.repository.delete(this.tenantId, type, id);
  }

  transaction(callback) {
    if (typeof this.repository.transaction !== 'function') {
      throw new TypeError('Underlying repository does not support transactions');
    }
    return this.repository.transaction(callback);
  }
}

module.exports = { TenantScopedRepository };
