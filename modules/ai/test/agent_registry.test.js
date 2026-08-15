const assert = require('node:assert/strict');
const test = require('node:test');
const { AgentRegistry } = require('../agent_registry');

test('scopes agent identity and tools by tenant', () => {
  const registry = new AgentRegistry();
  registry.register({ id: 'sales', tenantId: 'a', name: 'Sales', tools: ['crm.read'] });
  registry.register({ id: 'sales', tenantId: 'b', name: 'Sales', tools: ['crm.write'] });
  assert.equal(registry.canUseTool({ tenantId: 'a', id: 'sales', tool: 'crm.read' }), true);
  assert.equal(registry.canUseTool({ tenantId: 'a', id: 'sales', tool: 'crm.write' }), false);
  assert.equal(registry.get({ tenantId: 'b', id: 'sales' }).tenantId, 'b');
});
