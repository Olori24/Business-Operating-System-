const assert = require('node:assert/strict');
const test = require('node:test');
const { ApprovalGate } = require('../approval');

test('requires independent approval within the same tenant', () => {
  const gate = new ApprovalGate();
  gate.request({ id: 'a1', tenantId: 't1', action: 'payment.send', requesterId: 'u1' });
  assert.throws(() => gate.decide({ id: 'a1', tenantId: 't1', approverId: 'u1', decision: 'approved' }), /SELF_APPROVAL_FORBIDDEN/);
  assert.equal(gate.decide({ id: 'a1', tenantId: 't1', approverId: 'u2', decision: 'approved' }).status, 'approved');
});

test('prevents cross-tenant and repeated decisions', () => {
  const gate = new ApprovalGate();
  gate.request({ id: 'a1', tenantId: 't1', action: 'delete', requesterId: 'u1' });
  assert.throws(() => gate.decide({ id: 'a1', tenantId: 't2', approverId: 'u2', decision: 'approved' }), /TENANT_BOUNDARY_VIOLATION/);
  gate.decide({ id: 'a1', tenantId: 't1', approverId: 'u2', decision: 'rejected' });
  assert.throws(() => gate.decide({ id: 'a1', tenantId: 't1', approverId: 'u3', decision: 'approved' }), /APPROVAL_TERMINAL/);
});
