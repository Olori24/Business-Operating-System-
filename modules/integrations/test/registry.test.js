const assert = require('node:assert/strict');
const test = require('node:test');
const { IntegrationRegistry } = require('../registry');

test('registers versioned integration adapters', async () => {
  const r = new IntegrationRegistry();
  const execute = async x => x;
  r.register({ name: 'crm', version: '1.2.0', execute, actions: ['sync'] });
  assert.deepEqual(r.list(), [{ name: 'crm', version: '1.2.0' }]);
  assert.deepEqual(await r.invoke('crm', 'sync', 'ok', { tenantId: 't1' }), { action: 'sync', payload: 'ok', context: { tenantId: 't1' } });
});

test('requires tenant context for invocation', async () => {
  const r = new IntegrationRegistry();
  r.register({ name: 'crm', execute: async x => x });
  await assert.rejects(() => r.invoke('crm', 'sync', {}, {}), /TENANT_CONTEXT_REQUIRED/);
});

test('rejects duplicate or invalid registrations', () => {
  const r = new IntegrationRegistry();
  r.register({ name: 'crm', execute: async () => null });
  assert.throws(() => r.register({ name: 'crm', execute: async () => null }), /ALREADY_REGISTERED/);
  assert.throws(() => r.register({ name: 'x', version: 'bad', execute: async () => null }), /INVALID_VERSION/);
});
