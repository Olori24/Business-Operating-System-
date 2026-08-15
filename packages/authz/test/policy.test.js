const assert = require('node:assert/strict');
const test = require('node:test');
const { evaluatePolicy } = require('../policy');

test('denies missing authorization context by default', () => {
  assert.deepEqual(evaluatePolicy(), { allowed: false, reason: 'MISSING_AUTHORIZATION_CONTEXT' });
});

test('denies cross-organization access', () => {
  assert.equal(evaluatePolicy({ role: 'owner', permission: 'organization:write', organizationId: 'o1', resourceOrganizationId: 'o2' }).allowed, false);
});

test('requires approval for high-risk actions', () => {
  const context = { role: 'owner', permission: 'organization:write', organizationId: 'o1', resourceOrganizationId: 'o1', highRisk: true };
  assert.deepEqual(evaluatePolicy(context), { allowed: false, reason: 'APPROVAL_REQUIRED' });
  assert.equal(evaluatePolicy({ ...context, approval: true }).allowed, true);
});
