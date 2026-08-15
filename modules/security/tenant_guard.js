class TenantGuard {
  assertAccess(resourceTenantId, actorTenantId) {
    if (!actorTenantId || !resourceTenantId || actorTenantId !== resourceTenantId) {
      const error = new Error('Tenant access denied');
      error.code = 'TENANT_ACCESS_DENIED';
      throw error;
    }
    return true;
  }
}

module.exports = { TenantGuard };
