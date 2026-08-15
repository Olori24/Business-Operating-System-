const assert = require('node:assert/strict');
const test = require('node:test');
const { IntegrationRegistry } = require('../registry');

test('supports declared actions and tenant-scoped connector invocation', async () => {
  const registry = new IntegrationRegistry();
  registry.register({ name: 'crm', actions: ['contact.create'], execute: async ({ action, payload }) => ({ action, payload }) });
  assert.deepEqual(await registry.invoke('crm', 'contact.create', { email: 'a@example.com' }, { tenantId: 't1' }), {
    action: 'contact.create',
    payload: { email: 'a@example.com' }
  });
});

test('rejects unsupported connector actions', async () => {
  const registry = new IntegrationRegistry();
  registry.register({ name: 'crm', actions: ['contact.create'], execute: async () => null });
  await assert.rejects(() => registry.invoke('crm', 'contact.delete', {}, { tenantId: 't1' }), /ACTION_NOT_SUPPORTED/);
});
