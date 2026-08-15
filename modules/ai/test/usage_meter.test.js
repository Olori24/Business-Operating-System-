const assert = require('node:assert/strict');
const test = require('node:test');
const { AIUsageMeter } = require('../usage_meter');

test('records usage and enforces token budget', () => {
  const meter = new AIUsageMeter({ budgets: { 't:a': { tokens: 10 } } });
  assert.deepEqual(meter.record({ tenantId: 't', agentId: 'a', tokens: 6 }), { tokens: 6, durationMs: 0, calls: 1 });
  assert.throws(() => meter.record({ tenantId: 't', agentId: 'a', tokens: 5 }), /budget exceeded/);
});
