const assert = require('node:assert/strict');
const test = require('node:test');
const { CommercialReadiness, REQUIRED_GATES } = require('../commercial_readiness');

test('certifies only when every commercial gate passes', () => {
  const readiness = new CommercialReadiness();
  const gates = Object.fromEntries(REQUIRED_GATES.map(name => [name, true]));
  assert.equal(readiness.certify(gates).ready, true);
  assert.equal(readiness.assertReady(gates).missing.length, 0);
});

test('reports missing commercial gates', () => {
  const result = new CommercialReadiness().certify({ onboarding: true, billing: true });
  assert.equal(result.ready, false);
  assert.ok(result.missing.includes('webhooks'));
});
