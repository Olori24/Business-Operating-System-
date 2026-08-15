const assert = require('node:assert/strict');
const test = require('node:test');
const { EntitlementService } = require('../entitlements');

test('enforces plan capability limits', () => {
  const service = new EntitlementService({ pro: { limits: { automation_runs: 10 }, capabilities: ['ai'] } });
  assert.equal(service.allows({ planId: 'pro', capability: 'automation_runs', usage: 9 }), true);
  assert.equal(service.allows({ planId: 'pro', capability: 'automation_runs', usage: 10 }), false);
  assert.equal(service.allows({ planId: 'pro', capability: 'ai' }), true);
});

test('assertAllowed rejects unavailable capability', () => {
  const service = new EntitlementService({ starter: { capabilities: [] } });
  assert.throws(() => service.assertAllowed({ planId: 'starter', capability: 'ai' }), /not available/);
});
