const assert = require('node:assert/strict');
const test = require('node:test');
const { CommercialLaunchCertification, REQUIRED_PRODUCTION_PROOFS } = require('../commercial_launch');

test('certifies launch only when every required proof is present', () => {
  const proofs = Object.fromEntries(REQUIRED_PRODUCTION_PROOFS.map(name => [name, true]));
  const result = new CommercialLaunchCertification().assertCertified(proofs);
  assert.equal(result.certified, true);
  assert.equal(result.missing.length, 0);
});

test('reports missing environment proofs', () => {
  const result = new CommercialLaunchCertification().certify({ managedDatabase: true, secrets: true });
  assert.equal(result.certified, false);
  assert.ok(result.missing.length > 0);
});
