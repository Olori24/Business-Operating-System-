const { getSession, parseCookies } = require('../../../packages/auth/email_auth');
const { getProductionStore } = require('../../../packages/persistence/production_store');

module.exports = async function authMe(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: { code: 'METHOD_NOT_ALLOWED' } });
  try {
    const session = await getSession(parseCookies(req).bos_session);
    if (!session) return res.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Sign in required' } });
    const store = await getProductionStore();
    if (!store) return res.status(503).json({ error: { code: 'DATABASE_NOT_CONFIGURED', message: 'Production database is not configured' } });
    const result = await store.pool.query("SELECT value FROM bos_records WHERE record_type='workspace' AND value->>'userId'=$1 ORDER BY created_at ASC LIMIT 1", [session.user_id]);
    const workspace = result.rows[0]?.value || null;
    return res.status(200).json({
      authenticated: true,
      user: { id: session.user_id, email: session.email, name: session.name },
      workspace: workspace ? {
        tenantId: workspace.tenantId,
        businessName: workspace.businessName,
        ownerName: workspace.ownerName,
        email: workspace.email,
        plan: workspace.plan || 'early_access_free'
      } : null
    });
  } catch (error) {
    return res.status(500).json({ error: { code: 'AUTH_ME_FAILED', message: 'Unable to load authenticated session' } });
  }
};
