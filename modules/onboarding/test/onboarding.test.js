const assert = require('node:assert/strict');
const test = require('node:test');
const { Onboarding } = require('../onboarding');

test('creates and completes a tenant workspace', () => {
  const onboarding = new Onboarding();
  const workspace = onboarding.createWorkspace({ tenantId: 't1', ownerId: 'u1', businessName: 'Acme' });
  assert.equal(onboarding.complete(workspace, { template: 'lead-management' }).onboarding, 'completed');
});

test('requires onboarding identity and business name', () => assert.throws(() => new Onboarding().createWorkspace({ tenantId: 't1' }), /required/));

test('rejects blank business names', () => assert.throws(() => new Onboarding().createWorkspace({ tenantId: 't1', ownerId: 'u1', businessName: '   ' }), /required/));

test('idempotency key returns the same workspace for repeated requests', () => {
  const onboarding = new Onboarding();
  const first = onboarding.createWorkspace({ tenantId: 't1', ownerId: 'u1', businessName: 'Acme', idempotencyKey: 'signup-1' });
  const second = onboarding.createWorkspace({ tenantId: 't1', ownerId: 'u1', businessName: 'Changed', idempotencyKey: 'signup-1' });
  assert.equal(second, first);
});

test('completion is idempotent', () => {
  const onboarding = new Onboarding();
  const workspace = onboarding.createWorkspace({ tenantId: 't1', ownerId: 'u1', businessName: 'Acme' });
  const completed = onboarding.complete(workspace, { template: 'sales' });
  assert.equal(onboarding.complete(completed, { template: 'other' }), completed);
});
