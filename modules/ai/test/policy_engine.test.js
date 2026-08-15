const assert = require('node:assert/strict');
const test = require('node:test');
const { AgentPolicyEngine } = require('../policy_engine');

test('denies by default and applies first matching rule', () => {
  const policy = new AgentPolicyEngine({ rules: [
    { when: request => request.tool === 'crm.read', allow: true },
    { when: request => request.tool === 'payments.send', allow: false, reason: 'financial action requires approval' }
  ] });
  assert.equal(policy.authorize({ tool: 'crm.read' }), true);
  assert.equal(policy.authorize({ tool: 'payments.send' }), false);
  assert.equal(policy.authorize({ tool: 'unknown' }), false);
});
