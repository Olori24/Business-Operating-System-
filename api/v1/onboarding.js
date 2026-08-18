const { getProductionStore } = require('../../packages/persistence/production_store');
const {
  getSession,
  parseCookies,
  getWorkspaceForUser,
  createOrUpdateWorkspace,
} = require('../../packages/auth/email_auth');

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

    // The authenticated workspace is the canonical SaaS tenant record.
    // Do not create a second, incompatible workspace representation in bos_records.
    const existing = await getWorkspaceForUser(session.user_id);
    if (existing) return res.status(200).json({ status: 'exists', tenantId: existing.tenantId, workspace: existing });

    // Legacy compatibility: if an earlier deployment created a workspace profile
    // in bos_records, migrate it into the canonical bos_workspaces table now.
    const legacy = await store.pool.query(
      "SELECT value FROM bos_records WHERE record_type='workspace' AND value->>'userId'=$1 LIMIT 1",
      [session.user_id]
    );
    const legacyWorkspace = legacy.rows[0]?.value || null;
    const workspace = await createOrUpdateWorkspace({
      userId: session.user_id,
      businessName,
      email: session.email,
      ownerName: session.name,
      authProvider: legacyWorkspace?.authProvider || 'google',
      googleSubject: legacyWorkspace?.googleSubject || null,
    });

    return res.status(201).json({ tenantId: workspace.tenantId, workspace });
  } catch (error) {
    return res.status(500).json({ error: { code: 'ONBOARDING_FAILED', message: error.message } });
  }
};
