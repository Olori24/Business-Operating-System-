const test = require('node:test');
const assert = require('node:assert/strict');
const { TenantScopedRepository } = require('../tenant_scoped_repository');

test('tenant scoped repository forwards tenant identity to postgres repository', async () => {
  const calls = [];
  const repository = {
    async save(...args) { calls.push(['save', ...args]); return args[3]; },
    async find(...args) { calls.push(['find', ...args]); return null; },
    async all(...args) { calls.push(['all', ...args]); return []; },
    async delete(...args) { calls.push(['delete', ...args]); return true; }
  };
  const scoped = new TenantScopedRepository({ repository, tenantId: 'tenant-a' });

  await scoped.save('execution', 'exec-1', { status: 'pending' });
  await scoped.find('execution', 'exec-1');
  await scoped.all('execution');
  await scoped.delete('execution', 'exec-1');

  assert.deepEqual(calls, [
    ['save', 'tenant-a', 'execution', 'exec-1', { status: 'pending' }],
    ['find', 'tenant-a', 'execution', 'exec-1'],
    ['all', 'tenant-a', 'execution'],
    ['delete', 'tenant-a', 'execution', 'exec-1']
  ]);
});
