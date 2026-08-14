const assert = require('node:assert/strict');
const test = require('node:test');
const { createBusiness, createProcess, createTask } = require('../domain');

test('creates an organization-scoped business', () => {
  const business = createBusiness({ id: 'biz-1', organizationId: 'org-1', name: 'Acme', slug: 'acme' });
  assert.deepEqual(business, {
    id: 'biz-1', organizationId: 'org-1', name: 'Acme', slug: 'acme', description: '', type: 'business'
  });
});

test('creates a business process', () => {
  const process = createProcess({ id: 'process-1', businessId: 'biz-1', name: 'Lead follow-up' });
  assert.equal(process.businessId, 'biz-1');
  assert.equal(process.type, 'process');
});

test('creates tasks with controlled lifecycle states', () => {
  const task = createTask({ id: 'task-1', processId: 'process-1', name: 'Call lead', status: 'in_progress' });
  assert.equal(task.status, 'in_progress');
});

test('rejects invalid task states', () => {
  assert.throws(() => createTask({ id: 'task-1', processId: 'process-1', name: 'Call lead', status: 'blocked' }), /Unsupported task status/);
});

test('rejects missing business ownership', () => {
  assert.throws(() => createBusiness({ id: 'biz-1', name: 'Acme', slug: 'acme' }), /organizationId/);
});
