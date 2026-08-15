const assert = require('node:assert/strict');
const test = require('node:test');
const { securityGate } = require('../audit_gate');

test('security gate requires all controls', () => { const good = { tenantIsolation: true, authz: true, secretsHygiene: true, ciGreen: true, recoveryControls: true }; assert.equal(securityGate(good), true); assert.equal(securityGate({ ...good, authz: false }), false); });
