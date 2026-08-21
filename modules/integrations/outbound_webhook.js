const crypto = require('node:crypto');

function validateUrl(rawUrl) {
  const url = new URL(String(rawUrl || ''));
  if (url.protocol !== 'https:') throw new Error('OUTBOUND_WEBHOOK_REQUIRES_HTTPS');
  return url;
}

async function sendOutboundWebhook({ url: rawUrl, payload = {}, headers = {}, timeoutMs = 10000 }) {
  const url = validateUrl(rawUrl);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.min(Math.max(Number(timeoutMs) || 10000, 1000), 30000));
  const requestId = crypto.randomUUID();
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-bos-request-id': requestId, ...headers },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const text = await response.text();
    return {
      requestId,
      url: url.toString(),
      status: response.status,
      ok: response.ok,
      response: text.slice(0, 4000),
    };
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('OUTBOUND_WEBHOOK_TIMEOUT', { cause: error });
    throw new Error(`OUTBOUND_WEBHOOK_FAILED:${error.message}`, { cause: error });
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { sendOutboundWebhook };
