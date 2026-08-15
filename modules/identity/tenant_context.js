class TenantContext {
  constructor({ tenantId, organizationId, userId } = {}) {
    if (!tenantId || !organizationId || !userId) throw new Error('TENANT_CONTEXT_REQUIRED');
    this.tenantId = tenantId;
    this.organizationId = organizationId;
    this.userId = userId;
    Object.freeze(this);
  }

  assertTenant(tenantId) {
    if (tenantId !== this.tenantId) throw new Error('TENANT_BOUNDARY_VIOLATION');
    return true;
  }

  assertOrganization(organizationId) {
    if (organizationId !== this.organizationId) throw new Error('ORGANIZATION_BOUNDARY_VIOLATION');
    return true;
  }
}

module.exports = { TenantContext };
