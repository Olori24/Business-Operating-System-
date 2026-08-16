const crypto = require('crypto');
const { getProductionStore } = require('../../../packages/persistence/production_store');

function tenantForGoogleSubject(subject) {
  return `google_${crypto.createHash('sha256').update(subject).digest('hex').slice(0, 24)}`;
}

function sessionToken() {
  return crypto.randomBytes(32).toString('hex');
}

function sessionHash(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

module.exports = async function googleAuth(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: { code: 'METHOD_NOT_ALLOWED' } });
  try {
    const clientId = String(process.env.GOOGLE_CLIENT_ID || '').trim();
    if (!clientId) return res.status(503).json({ error: { code: 'GOOGLE_AUTH_NOT_CONFIGURED', message: 'Google sign-in is not configured for this deployment' } });
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const credential = String(body.credential || '').trim();
    const businessName = String(body.businessName || '').trim();
    if (!credential || !businessName) return res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'Google credential and businessName are required' } });

    const tokenResponse = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
    const google = await tokenResponse.json();
    if (!tokenResponse.ok || google.aud !== clientId || !['accounts.google.com', 'https://accounts.google.com'].includes(google.iss) || google.email_verified !== 'true') {
      return res.status(401).json({ error: { code: 'GOOGLE_AUTH_INVALID', message: 'Google authentication could not be verified' } });
    }
    const subject = String(google.sub || '').trim();
    const email = String(google.email || '').trim().toLowerCase();
    const ownerName = String(google.name || email.split('@')[0] || 'BOS user').trim();
    if (!subject || !email) return res.status(401).json({ error: { code: 'GOOGLE_PROFILE_INVALID', message: 'Google account profile is incomplete' } });

    const store = await getProductionStore();
    if (!store) return res.status(503).json({ error: { code: 'DATABASE_NOT_CONFIGURED', message: 'Production database is not configured' } });

    const tenantId = tenantForGoogleSubject(subject);
    const existing = await store.repository.find(tenantId, 'workspace', 'profile');
    const now = new Date().toISOString();
    const workspace = {
      tenantId,
      businessName,
      ownerName,
      email,
      authProvider: 'google',
      googleSubject: subject,
      plan: existing?.plan || 'early_access_free',
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };
    await store.repository.save(tenantId, 'workspace', 'profile', workspace);

    const rawSession = sessionToken();
    await store.repository.save(tenantId, 'auth_session', sessionHash(rawSession), {
      provider: 'google',
      subject,
      email,
      createdAt: now,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });
    res.setHeader('Set-Cookie', `bos_session=${rawSession}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`);
    return res.status(200).json({ status: 'authenticated', tenantId, workspace });
  } catch (error) {
    return res.status(500).json({ error: { code: 'GOOGLE_AUTH_FAILED', message: error.message } });
  }
};
