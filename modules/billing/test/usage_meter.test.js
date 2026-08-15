const assert = require('node:assert/strict');
const test = require('node:test');
const { UsageMeter } = require('../usage_meter');

test('records usage per tenant and metric', () => {
  const meter = new UsageMeter();
  meter.record({ tenantId: 't1', metric: 'automation_runs', quantity: 3 });
  meter.record({ tenantId: 't1', metric: 'automation_runs', quantity: 2 });
  meter.record({ tenantId: 't2', metric: 'automation_runs', quantity: 9 });
  assert.equal(meter.get({ tenantId: 't1', metric: 'automation_runs' }), 5);
  assert.equal(meter.get({ tenantId: 't2', metric: 'automation_runs' }), 9);
});

test('rejects invalid usage quantities', () => {
  assert.throws(() => new UsageMeter().record({ tenantId: 't1', metric: 'runs', quantity: -1 }), /non-negative/);
});
