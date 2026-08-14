const assert = require('node:assert/strict');
const test = require('node:test');
const { InMemoryRepository } = require('../repository');
const { createOrganization, createUser, createRoleAssignment, createWorkspace } = require('../identity/domain');

test('stores and retrieves a domain record without sharing mutable state', async () => {
  const repository = new InMemoryRepository();
  const organization = createOrganization({ id: 'org-1', name: 'Acme', slug: 'acme' });

  await repository.save('organization', organization.id, organization);
  const loaded = await repository.find('organization', organization.id);

  assert.deepEqual(loaded, organization);
  assert.notStrictEqual(loaded, organization);
});

test('keeps records isolated by type and id', async () => {
  const repository = new InMemoryRepository();
  await repository.save('user', 'same-id', createUser({ id: 'same-id', email: 'a@example.com', name: 'A' }));
  await repository.save('workspace', 'same-id', createWorkspace({ id: 'same-id', organizationId: 'org-1', name: 'Main' }));

  assert.equal((await repository.find('user', 'same-id')).type, 'user');
  assert.equal((await repository.find('workspace', 'same-id')).type, 'workspace');
});

test('returns null for a missing record and supports deletion', async () => {
  const repository = new InMemoryRepository();
  assert.equal(await repository.find('organization', 'missing'), null);

  const role = createRoleAssignment({ organizationId: 'org-1', userId: 'user-1', role: 'owner' });
  await repository.save('role_assignment', 'user-1', role);
  assert.equal(await repository.delete('role_assignment', 'user-1'), true);
  assert.equal(await repository.find('role_assignment', 'user-1'), null);
});
