const assert = require('node:assert/strict');
const test = require('node:test');
const { TenantGuard } = require('../tenant_guard');

test('allows same-tenant access', () => assert.equal(new TenantGuard().assertAccess('t1', 't1'), true));
test('rejects cross-tenant access', () => assert.throws(() => new TenantGuard().assertAccess('t1', 't2'), /Tenant access denied/));
test('rejects missing tenant context', () => assert.throws(() => new TenantGuard().assertAccess('t1', null), /Tenant access denied/));
