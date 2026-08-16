const crypto = require('crypto');
const { getProductionStore } = require('../../packages/persistence/production_store');
const { getSession, parseCookies } = require('../../packages/auth/email_auth');

module.exports = async function onboarding(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: { code: 'METHOD_NOT_ALLOWED' } });
  try {
    const session = await getSession(parseCookies(req).bos_session);
    if (!session) return res.status(401).json({ error: { code: 'AUTH_REQUIRED', message: 'Please sign up or sign in first' } });
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const businessName = String(body.businessName || '').trim();
    if (!businessName) return res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'businessName is required' } });
    const store = await getProductionStore();
    if (!store) return res.status(503).json({ error: { code: 'DATABASE_NOT_CONFIGURED', message: 'Production database is not configured' } });
    const existing = await store.pool.query("SELECT value FROM bos_records WHERE record_type='workspace' AND value->>'userId'=$1 LIMIT 1", [session.user_id]);
    if (existing.rowCount) return res.status(200).json({ status: 'exists', tenantId: existing.rows[0].value.tenantId, workspace: existing.rows[0].value });
    const tenantId = `tenant_${crypto.randomUUID()}`;
    const workspace = { tenantId, userId: session.user_id, businessName, ownerName: session.name, email: session.email, plan: 'early_access_free', createdAt: new Date().toISOString() };
    await store.repository.save(tenantId, 'workspace', 'profile', workspace);
    return res.status(201).json({ tenantId, workspace });
  } catch (error) {
    return res.status(500).json({ error: { code: 'ONBOARDING_FAILED', message: error.message } });
  }
};
