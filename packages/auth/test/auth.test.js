const assert = require('node:assert/strict');
const test = require('node:test');
const { AuthService } = require('../auth');

function repository() {
  const records = new Map();
  return {
    async save(type, id, value) { records.set(`${type}:${id}`, structuredClone(value)); return value; },
    async find(type, id) { const value = records.get(`${type}:${id}`); return value ? structuredClone(value) : null; }
  };
}

test('creates a session for an active user in an organization', async () => {
  const users = repository();
  const sessions = repository();
  await users.save('user', 'user-1', { id: 'user-1', status: 'active' });

  const auth = new AuthService({
    userRepository: users,
    sessionRepository: sessions,
    tokenGenerator: { async generate() { return { id: 'session-1', value: 'token-1' }; } }
  });

  const session = await auth.createSession({ userId: 'user-1', organizationId: 'org-1' });
  assert.equal(session.userId, 'user-1');
  assert.equal(session.organizationId, 'org-1');
  assert.equal(await sessions.find('session', 'session-1').then(value => value.token), 'token-1');
});

test('rejects unknown or inactive users', async () => {
  const users = repository();
  const sessions = repository();
  const auth = new AuthService({
    userRepository: users,
    sessionRepository: sessions,
    tokenGenerator: { async generate() { return { id: 'unused', value: 'unused' }; } }
  });

  assert.equal(await auth.createSession({ userId: 'missing', organizationId: 'org-1' }), null);
  await users.save('user', 'inactive', { id: 'inactive', status: 'inactive' });
  assert.equal(await auth.createSession({ userId: 'inactive', organizationId: 'org-1' }), null);
});
