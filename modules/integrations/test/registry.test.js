const assert = require('node:assert/strict');
const test = require('node:test');
const { IntegrationRegistry } = require('../registry');

test('registers and resolves integration adapters', async () => { const r = new IntegrationRegistry(); const execute = async x => x; r.register({ name: 'crm', execute }); assert.deepEqual(r.list(), ['crm']); assert.equal(await r.get('crm').execute('ok'), 'ok'); });
test('rejects invalid adapter', () => assert.throws(() => new IntegrationRegistry().register({ name: 'crm' }), /required/));
