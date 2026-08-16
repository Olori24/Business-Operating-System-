const crypto = require('node:crypto');
const { getProductionStore } = require('../../packages/persistence/production_store');

function cookieValue(req, name) {
  const raw = String(req.headers.cookie || '');
  const item = raw.split(';').map(v => v.trim()).find(v => v.startsWith(`${name}=`));
  return item ? decodeURIComponent(item.slice(name.length + 1)) : null;
}

async function authenticatedTenantId(req) {
  const session = cookieValue(req, 'bos_session');
  if (!session) return null;
  const store = await getProductionStore();
  if (!store) return null;
  const hash = crypto.createHash('sha256').update(session).digest('hex');
  const rows = await store.repository.all('global', 'user').catch(() => []);
  const sessionRows = [];
  for (const user of rows) {
    if (!user?.tenantId) continue;
    const record = await store.repository.find(user.tenantId, 'auth_session', hash).catch(() => null);
    if (record) sessionRows.push({ user, record });
  }
  const match = sessionRows.find(({ record }) => record.expiresAt && new Date(record.expiresAt).getTime() > Date.now());
  return match?.user?.tenantId || null;
}

async function resolveTenantId(req) {
  const authenticated = await authenticatedTenantId(req);
  if (authenticated) return authenticated;
  const header = req.headers['x-tenant-id'];
  return typeof header === 'string' && header.length <= 128 ? header : null;
}

module.exports = { authenticatedTenantId, resolveTenantId };
