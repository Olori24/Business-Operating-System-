const assert = require('node:assert/strict');
const test = require('node:test');
const { recoveryGate } = require('../recovery_gate');

test('requires all recovery controls', () => { const good = { backupVerified: true, isolationVerified: true, readinessVerified: true, operatorApproved: true }; assert.equal(recoveryGate(good), true); assert.equal(recoveryGate({ ...good, backupVerified: false }), false); });
