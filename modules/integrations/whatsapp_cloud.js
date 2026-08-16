const { decryptSecret } = require('./secret_store');

function graphVersion() {
  return process.env.WHATSAPP_GRAPH_VERSION || 'v23.0';
}

function requireConfig(config) {
  if (!config?.accessToken || !config?.phoneNumberId) throw new Error('WHATSAPP_NOT_CONNECTED');
  return config;
}

async function sendWhatsAppMessage({ config, to, text }) {
  requireConfig(config);
  if (!to || !text) throw new TypeError('WHATSAPP_RECIPIENT_AND_TEXT_REQUIRED');
  const response = await fetch(`https://graph.facebook.com/${graphVersion()}/${encodeURIComponent(config.phoneNumberId)}/messages`, {
    method: 'POST',
    headers: { authorization: `Bearer ${decryptSecret(config.accessToken)}`, 'content-type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', recipient_type: 'individual', to: String(to), type: 'text', text: { preview_url: false, body: String(text) } }),
  });
  const body = await response.text();
  if (!response.ok) throw new Error(`WHATSAPP_API_${response.status}:${body.slice(0, 1000)}`);
  return JSON.parse(body);
}

module.exports = { sendWhatsAppMessage };
