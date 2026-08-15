const assert = require('node:assert/strict');
const test = require('node:test');
const { AutomationEngine } = require('../engine');

test('executes ordered automation actions', async () => {
  const engine = new AutomationEngine({ actions: { add: async ({ input }) => input.a + input.b } });
  const result = await engine.run({ tenantId: 'tenant-1', steps: [{ action: 'add', input: { a: 2, b: 3 } }] });
  assert.deepEqual(result.results, [5]);
});
