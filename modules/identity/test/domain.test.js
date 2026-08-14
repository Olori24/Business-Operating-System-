const test = require('node:test');
const assert = require('node:assert/strict');

const {
  ROLE_VALUES,
  createOrganization,
  createUser,
  createRoleAssignment,
  createWorkspace,
} = require('../domain');

test('creates an organization', () => {
  assert.deepEqual(createOrganization({ id: 'org_1', name: 'Acme', slug: 'acme' }), {
    id: 'org_1', name: 'Acme', slug: 'acme', type: 'organization',
  });
});

test('creates a user', () => {
  assert.equal(createUser({ id: 'user_1', email: 'owner@example.com', name: 'Owner' }).type, 'user');
});

test('accepts only supported role assignments', () => {
  assert.deepEqual(ROLE_VALUES, ['owner', 'admin', 'member']);
  assert.equal(createRoleAssignment({ organizationId: 'org_1', userId: 'user_1', role: 'owner' }).role, 'owner');
  assert.throws(() => createRoleAssignment({ organizationId: 'org_1', userId: 'user_1', role: 'superadmin' }), /Unsupported role/);
});

test('creates a workspace scoped to an organization', () => {
  assert.deepEqual(createWorkspace({ id: 'ws_1', organizationId: 'org_1', name: 'Main' }), {
    id: 'ws_1', organizationId: 'org_1', name: 'Main', type: 'workspace',
  });
});
