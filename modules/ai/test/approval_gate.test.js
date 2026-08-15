const assert = require('node:assert/strict');
const test = require('node:test');
const { ApprovalGate } = require('../approval_gate');

test('requires a distinct approver and records decision', () => {
  const gate = new ApprovalGate();
  gate.request({ id: 'r1', tenantId: 't1', action: 'refund', requestedBy: 'agent' });
  assert.throws(() => gate.decide({ tenantId: 't1', id: 'r1', approver: 'agent', approved: true }), /cannot approve/);
  const result = gate.decide({ tenantId: 't1', id: 'r1', approver: 'human', approved: true });
  assert.equal(result.status, 'approved');
  assert.equal(result.approver, 'human');
});
