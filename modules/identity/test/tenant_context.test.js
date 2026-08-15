const assert = require('node:assert/strict');
const test = require('node:test');
const { TenantContext } = require('../tenant_context');

test('creates immutable tenant context', () => {
  const context = new TenantContext({ tenantId: 't1', organizationId: 'o1', userId: 'u1' });
  assert.equal(context.tenantId, 't1');
  assert.equal(Object.isFrozen(context), true);
});

test('rejects cross-tenant and cross-organization access', () => {
  const context = new TenantContext({ tenantId: 't1', organizationId: 'o1', userId: 'u1' });
  assert.throws(() => context.assertTenant('t2'), /TENANT_BOUNDARY_VIOLATION/);
  assert.throws(() => context.assertOrganization('o2'), /ORGANIZATION_BOUNDARY_VIOLATION/);
});
