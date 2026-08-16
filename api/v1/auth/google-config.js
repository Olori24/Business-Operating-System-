module.exports = async function googleConfig(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: { code: 'METHOD_NOT_ALLOWED' } });
  const clientId = String(process.env.GOOGLE_CLIENT_ID || '').trim();
  if (!clientId) return res.status(503).json({ error: { code: 'GOOGLE_AUTH_NOT_CONFIGURED', message: 'Google sign-in is not configured for this deployment' } });
  return res.status(200).json({ clientId });
};
