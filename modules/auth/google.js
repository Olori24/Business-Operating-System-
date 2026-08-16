const crypto = require('node:crypto');

const GOOGLE_TOKENINFO_URL = 'https://oauth2.googleapis.com/tokeninfo';

function base64url(value) {
  return Buffer.from(value).toString('base64url');
}

function signSession(payload, secret) {
  const encoded = base64url(JSON.stringify(payload));
  const signature = crypto.createHmac('sha256', secret).update(encoded).digest('base64url');
  return `${encoded}.${signature}`;
}

function verifySession(token, secret) {
  if (!token || !secret) return null;
  const [encoded, signature] = String(token).split('.');
  if (!encoded || !signature) return null;
  const expected = crypto.createHmac('sha256', secret).update(encoded).digest('base64url');
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch { return null; }
}

async function verifyGoogleCredential(credential) {
  if (!credential) throw new Error('GOOGLE_CREDENTIAL_REQUIRED');
  const clientId = String(process.env.GOOGLE_CLIENT_ID || '').trim();
  if (!clientId) throw new Error('GOOGLE_CLIENT_ID_NOT_CONFIGURED');
  const response = await fetch(`${GOOGLE_TOKENINFO_URL}?id_token=${encodeURIComponent(credential)}`);
  if (!response.ok) throw new Error('INVALID_GOOGLE_CREDENTIAL');
  const profile = await response.json();
  if (profile.aud !== clientId) throw new Error('GOOGLE_AUDIENCE_MISMATCH');
  if (profile.email_verified !== 'true') throw new Error('GOOGLE_EMAIL_NOT_VERIFIED');
  if (!profile.sub || !profile.email) throw new Error('GOOGLE_PROFILE_INCOMPLETE');
  return {
    provider: 'google',
    providerId: profile.sub,
    email: String(profile.email).toLowerCase(),
    name: profile.name || profile.email.split('@')[0],
    picture: profile.picture || null,
  };
}

function sessionCookie(session, secret) {
  const token = signSession(session, secret);
  return `bos_session=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=604800`;
}

function parseCookie(req, name) {
  const raw = req.headers.cookie || '';
  const found = raw.split(';').map(v => v.trim()).find(v => v.startsWith(`${name}=`));
  return found ? decodeURIComponent(found.slice(name.length + 1)) : null;
}

function authenticatedSession(req) {
  return verifySession(parseCookie(req, 'bos_session'), process.env.BOS_SESSION_SECRET);
}

module.exports = { verifyGoogleCredential, sessionCookie, authenticatedSession };
