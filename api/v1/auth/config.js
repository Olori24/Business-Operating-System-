module.exports = async function authConfig(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: { code: 'METHOD_NOT_ALLOWED' } });
  const clientId = String(process.env.GOOGLE_CLIENT_ID || '').trim();
  return res.status(200).json({ google: { enabled: Boolean(clientId), clientId: clientId || null } });
};
