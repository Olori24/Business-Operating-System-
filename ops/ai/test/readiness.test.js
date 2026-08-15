const assert = require('node:assert/strict');
const test = require('node:test');
const { assessAIReadiness } = require('../readiness');

test('requires every AI production gate', () => {
  const gates = { identity: true, policy: true, memory: true, verification: true, approval: true, usage: true };
  assert.deepEqual(assessAIReadiness(gates), { ready: true, missing: [], required: ['identity', 'policy', 'memory', 'verification', 'approval', 'usage'] });
  assert.equal(assessAIReadiness({ identity: true }).ready, false);
});
