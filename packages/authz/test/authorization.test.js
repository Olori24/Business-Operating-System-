const assert = require('node:assert/strict');
const test = require('node:test');
const { authorize, assertAuthorized, permissionsFor } = require('../authorization');

test('owner has organization write permission within the same tenant', () => {
  assert.equal(authorize({ role: 'owner', permission: 'organization:write', organizationId: 'org-1', resourceOrganizationId: 'org-1' }), true);
});

test('member can write workspace but not organization settings', () => {
  const context = { role: 'member', organizationId: 'org-1', resourceOrganizationId: 'org-1' };
  assert.equal(authorize({ ...context, permission: 'workspace:write' }), true);
  assert.equal(authorize({ ...context, permission: 'organization:write' }), false);
});

test('cross-organization access is denied even for an owner', () => {
  assert.equal(authorize({ role: 'owner', permission: 'organization:write', organizationId: 'org-1', resourceOrganizationId: 'org-2' }), false);
});

test('assertAuthorized throws a stable forbidden error', () => {
  assert.throws(() => assertAuthorized({ role: 'member', permission: 'members:write', organizationId: 'org-1', resourceOrganizationId: 'org-1' }), (error) => error.code === 'FORBIDDEN');
});

test('unknown roles are rejected', () => {
  assert.throws(() => permissionsFor('superuser'), /Unknown role/);
});
