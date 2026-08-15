const assert = require('node:assert/strict');
const test = require('node:test');
const { Onboarding } = require('../onboarding');

test('creates and completes a tenant workspace', () => {
  const onboarding = new Onboarding();
  const workspace = onboarding.createWorkspace({ tenantId: 't1', ownerId: 'u1', businessName: 'Acme' });
  assert.equal(onboarding.complete(workspace, { template: 'lead-management' }).onboarding, 'completed');
});

test('requires onboarding identity and business name', () => assert.throws(() => new Onboarding().createWorkspace({ tenantId: 't1' }), /required/));
