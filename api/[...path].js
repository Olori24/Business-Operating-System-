const crypto = require('node:crypto');
const { requestHandler } = require('../apps/api/server');
const { getProductionStore } = require('../packages/persistence/production_store');
const {
  register,
  login,
  createSession,
  getSession,
  setSessionCookie,
  clearSessionCookie,
  parseCookies,
  revokeSession,
  getWorkspaceForUser,
  createOrUpdateWorkspace,
} = require('../packages/auth/email_auth');

async function body(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  let raw = '';
  for await (const chunk of req) raw += chunk;
  return raw ? JSON.parse(raw) : {};
}

function json(res, status, value) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(value));
}

async function emailRegister(req, res) {
  const data = await body(req);
  const user = await register({ name: data.name, email: data.email, password: data.password });
  setSessionCookie(res, await createSession(user.id));
  return json(res, 201, { status: 'authenticated', user });
}

async function emailLogin(req, res) {
  const data = await body(req);
  const user = await login({ email: data.email, password: data.password });
  setSessionCookie(res, await createSession(user.id));
  return json(res, 200, { status: 'authenticated', user, workspace: await getWorkspaceForUser(user.id) });
}

async function currentUser(req, res) {
  const session = await getSession(parseCookies(req).bos_session);
  if (!session) return json(res, 401, { error: { code: 'UNAUTHENTICATED', message: 'Sign in required' } });
  return json(res, 200, {
    authenticated: true,
    user: { id: session.user_id, email: session.email, name: session.name },
    workspace: await getWorkspaceForUser(session.user_id),
  });
}

async function googleAuth(req, res) {
  const clientId = String(process.env.GOOGLE_CLIENT_ID || '').trim();
  if (!clientId) return json(res, 503, { error: { code: 'GOOGLE_AUTH_NOT_CONFIGURED', message: 'Google sign-in is not configured for this deployment' } });
  const data = await body(req);
  const credential = String(data.credential || '').trim();
  const businessName = String(data.businessName || '').trim();
  if (!credential) return json(res, 400, { error: { code: 'INVALID_INPUT', message: 'Google credential is required' } });

  const tokenResponse = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
  const google = await tokenResponse.json();
  if (!tokenResponse.ok || google.aud !== clientId || !['accounts.google.com', 'https://accounts.google.com'].includes(google.iss) || google.email_verified !== 'true') {
    return json(res, 401, { error: { code: 'GOOGLE_AUTH_INVALID', message: 'Google authentication could not be verified' } });
  }

  const email = String(google.email || '').trim().toLowerCase();
  const name = String(google.name || email.split('@')[0] || 'BOS user').trim();
  const subject = String(google.sub || '').trim();
  if (!email || !subject) return json(res, 401, { error: { code: 'GOOGLE_PROFILE_INVALID', message: 'Google profile is incomplete' } });

  const store = await getProductionStore();
  if (!store) return json(res, 503, { error: { code: 'DATABASE_NOT_CONFIGURED', message: 'Production database is not configured' } });
  const existing = await store.pool.query('SELECT id,email,name,status FROM bos_users WHERE email=$1', [email]);
  let user = existing.rows[0];
  if (!user) {
    user = await register({ email, password: crypto.randomBytes(32).toString('hex'), name });
  }

  const workspace = await getWorkspaceForUser(user.id);
  const finalWorkspace = workspace || (businessName
    ? await createOrUpdateWorkspace({ userId: user.id, businessName, email, ownerName: name, authProvider: 'google', googleSubject: subject })
    : null);

  setSessionCookie(res, await createSession(user.id));
  return json(res, 200, {
    status: 'authenticated',
    needsWorkspace: !finalWorkspace,
    workspace: finalWorkspace,
    user: { id: user.id, email: user.email, name: user.name },
  });
}

module.exports = async function catchAll(req, res) {
  const url = req.url.split('?')[0];
  try {
    if (req.method === 'GET' && url === '/api/health') return json(res, 200, { status: 'ok', service: 'bos-api' });
    if (req.method === 'GET' && url === '/api/v1/auth/google-config') {
      const clientId = String(process.env.GOOGLE_CLIENT_ID || '').trim();
      if (!clientId) return json(res, 503, { error: { code: 'GOOGLE_AUTH_NOT_CONFIGURED', message: 'Google sign-in is not configured for this deployment' } });
      return json(res, 200, { clientId });
    }
    if (req.method === 'POST' && url === '/api/v1/auth/google') return googleAuth(req, res);
    if (req.method === 'POST' && url === '/api/v1/auth/register') {
      try { return await emailRegister(req, res); }
      catch (error) { return json(res, 400, { error: { code: error.message, message: error.message } }); }
    }
    if (req.method === 'POST' && url === '/api/v1/auth/login') {
      try { return await emailLogin(req, res); }
      catch (error) { return json(res, 401, { error: { code: error.message, message: 'Invalid email or password' } }); }
    }
    if (req.method === 'POST' && url === '/api/v1/auth/logout') {
      await revokeSession(parseCookies(req).bos_session);
      clearSessionCookie(res);
      return json(res, 200, { status: 'signed_out' });
    }
    if (req.method === 'GET' && url === '/api/v1/auth/me') return currentUser(req, res);
    return requestHandler(req, res);
  } catch (error) {
    return json(res, 500, { error: { code: 'API_FAILED', message: 'Request could not be completed' } });
  }
};
