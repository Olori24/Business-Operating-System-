const assert = require('node:assert/strict');
const test = require('node:test');
const { ApiKeyStore } = require('../api_keys');

test('issues and authenticates a tenant API key', () => {
  const store = new ApiKeyStore();
  const issued = store.issue({ tenantId: 't1', name: 'automation', scopes: ['workflow:run'] });
  const auth = store.authenticate(issued.secret);
  assert.equal(auth.tenantId, 't1');
  assert.deepEqual(auth.scopes, ['workflow:run']);
  assert.equal(auth.hash, undefined);
});

test('revoked keys no longer authenticate', () => {
  const store = new ApiKeyStore();
  const issued = store.issue({ tenantId: 't1', name: 'test' });
  assert.equal(store.revoke(issued.id), true);
  assert.equal(store.authenticate(issued.secret), null);
});
