const assert = require('node:assert/strict');
const test = require('node:test');
const { AutomationRuleEngine } = require('../rules');

test('matches only enabled rules belonging to the tenant', () => {
  const engine = new AutomationRuleEngine({ rules: [
    { id: 'a', tenantId: 't1', enabled: true, when: event => event.type === 'lead.created', actions: ['qualify'] },
    { id: 'b', tenantId: 't2', enabled: true, when: () => true, actions: ['other'] },
    { id: 'c', tenantId: 't1', enabled: false, when: () => true, actions: ['disabled'] }
  ] });
  assert.deepEqual(engine.evaluate({ tenantId: 't1', event: { type: 'lead.created' } }), [{ id: 'a', actions: ['qualify'] }]);
});
