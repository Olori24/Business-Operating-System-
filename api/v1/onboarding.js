const crypto = require('crypto');
const { getProductionStore } = require('../../packages/persistence/production_store');

module.exports = async function onboarding(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: { code: 'METHOD_NOT_ALLOWED' } });
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const businessName = String(body.businessName || '').trim();
    const ownerName = String(body.ownerName || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    if (!businessName || !ownerName || !email) return res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'businessName, ownerName and email are required' } });
    const store = await getProductionStore();
    if (!store) return res.status(503).json({ error: { code: 'DATABASE_NOT_CONFIGURED', message: 'Production database is not configured' } });
    const tenantId = `tenant_${crypto.randomUUID()}`;
    await store.repository.save(tenantId, 'workspace', 'profile', { tenantId, businessName, ownerName, email, plan: 'early_access_free', createdAt: new Date().toISOString() });
    return res.status(201).json({ tenantId, workspace: { businessName, ownerName, email, plan: 'early_access_free' } });
  } catch (error) {
    return res.status(500).json({ error: { code: 'ONBOARDING_FAILED', message: error.message } });
  }
};
