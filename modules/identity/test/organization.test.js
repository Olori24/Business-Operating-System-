const assert = require('node:assert/strict');
const test = require('node:test');
const { OrganizationDirectory } = require('../organization');

test('creates organizations and manages member roles', () => { const d = new OrganizationDirectory(); d.create({ id: 'o1', tenantId: 't1', name: 'Acme' }); d.addMember('o1', { userId: 'u1', role: 'admin' }); assert.equal(d.role('o1', 'u1'), 'admin'); });
test('rejects missing organization', () => assert.throws(() => new OrganizationDirectory().addMember('missing', { userId: 'u1' }), /Organization not found/));
