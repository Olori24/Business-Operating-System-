const assert = require('node:assert/strict');
const test = require('node:test');
const { AgentMemoryStore } = require('../memory_store');

test('isolates agent memory and enforces bounds', () => {
  const store = new AgentMemoryStore({ maxEntries: 2 });
  store.put({ tenantId: 'a', agentId: 'x', key: 'one', value: 1 });
  store.put({ tenantId: 'a', agentId: 'x', key: 'two', value: 2 });
  store.put({ tenantId: 'a', agentId: 'x', key: 'three', value: 3 });
  assert.equal(store.get({ tenantId: 'a', agentId: 'x', key: 'one' }), null);
  assert.equal(store.get({ tenantId: 'a', agentId: 'x', key: 'three' }), 3);
  assert.equal(store.get({ tenantId: 'b', agentId: 'x', key: 'three' }), null);
});
