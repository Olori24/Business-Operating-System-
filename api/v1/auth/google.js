const crypto = require('node:crypto');
const { getProductionStore } = require('../../../packages/persistence/production_store');
const {
  register,
  createSession,
  getWorkspaceForUser,
  createOrUpdateWorkspace,
} = require('../../../packages/auth/email_auth');

module.exports = async function googleAuth(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: { code: 'METHOD_NOT_ALLOWED' } });
  try {
    const clientId = String(process.env.GOOGLE_CLIENT_ID || '').trim();
    if (!clientId) return res.status(503).json({ error: { code: 'GOOGLE_AUTH_NOT_CONFIGURED', message: 'Google sign-in is not configured for this deployment' } });

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const credential = String(body.credential || '').trim();
    const businessName = String(body.businessName || '').trim();
    if (!credential) return res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'Google credential is required' } });

    const tokenResponse = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
    const google = await tokenResponse.json();
    if (!tokenResponse.ok || google.aud !== clientId || !['accounts.google.com', 'https://accounts.google.com'].includes(google.iss) || google.email_verified !== 'true') {
      return res.status(401).json({ error: { code: 'GOOGLE_AUTH_INVALID', message: 'Google authentication could not be verified' } });
    }

    const email = String(google.email || '').trim().toLowerCase();
    const ownerName = String(google.name || email.split('@')[0] || 'BOS user').trim();
    const subject = String(google.sub || '').trim();
    if (!email || !subject) return res.status(401).json({ error: { code: 'GOOGLE_PROFILE_INVALID', message: 'Google account profile is incomplete' } });

    const store = await getProductionStore();
    if (!store) return res.status(503).json({ error: { code: 'DATABASE_NOT_CONFIGURED', message: 'Production database is not configured' } });

    const existingUser = await store.pool.query('SELECT id,email,name,status FROM bos_users WHERE email=$1', [email]);
    let user = existingUser.rows[0];
    if (!user) {
      user = await register({
        email,
        password: crypto.randomBytes(32).toString('hex'),
        name: ownerName,
      });
    }

    const existingWorkspace = await getWorkspaceForUser(user.id);
    const workspace = existingWorkspace || (businessName
      ? await createOrUpdateWorkspace({
          userId: user.id,
          businessName,
          email,
          ownerName,
          authProvider: 'google',
          googleSubject: subject,
        })
      : null);

    const session = await createSession(user.id);
    res.setHeader('Set-Cookie', `bos_session=${encodeURIComponent(session.token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`);

    return res.status(200).json({
      status: 'authenticated',
      needsWorkspace: !workspace,
      workspace,
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (error) {
    console.error('Google authentication failed:', error);
    return res.status(500).json({ error: { code: 'GOOGLE_AUTH_FAILED', message: 'Google authentication could not be completed' } });
  }
};
