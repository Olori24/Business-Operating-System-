const assert = require('node:assert/strict');
const test = require('node:test');
const { REQUIRED_GATES, certify } = require('../certification');

test('certifies only when every production gate is green', () => { const gates = Object.fromEntries(REQUIRED_GATES.map(name => [name, true])); assert.equal(certify(gates).certified, true); assert.deepEqual(certify({ ...gates, billing: false }).missing, ['billing']); });
