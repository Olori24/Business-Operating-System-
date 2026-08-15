const assert = require('node:assert/strict');
const test = require('node:test');
const { CommercialReport } = require('../commercial_report');

test('summarizes only tenant-owned operational events', () => {
  const report = new CommercialReport();
  const result = report.summarize({ tenantId: 't1', events: [
    { tenantId: 't1', status: 'completed' },
    { tenantId: 't1', status: 'failed' },
    { tenantId: 't2', status: 'completed' }
  ], usage: { automation_runs: 2 } });
  assert.equal(result.eventCount, 2);
  assert.deepEqual(result.statusCounts, { completed: 1, failed: 1 });
});

test('creates auditable tenant-scoped entries', () => {
  const entry = new CommercialReport().auditEntry({ tenantId: 't1', actorId: 'u1', action: 'workflow.run', resourceType: 'workflow', resourceId: 'w1' });
  assert.equal(entry.tenantId, 't1');
  assert.equal(entry.action, 'workflow.run');
  assert.ok(entry.occurredAt);
});
