const assert = require('node:assert/strict');
const test = require('node:test');
const { sendOutboundWebhook } = require('./outbound_webhook');

test('outbound webhook performs a real HTTPS POST', async () => {
  const originalFetch = global.fetch;
  let received;
  global.fetch = async (url, options) => {
    received = { url: String(url), options };
    return { status: 200, ok: true, text: async () => 'ok' };
  };
  try {
    const result = await sendOutboundWebhook({
      url: 'https://example.com/bos-hook',
      payload: { lead: 'Ada' },
    });
    assert.equal(result.ok, true);
    assert.equal(result.status, 200);
    assert.equal(received.options.method, 'POST');
    assert.deepEqual(JSON.parse(received.options.body), { lead: 'Ada' });
  } finally {
    global.fetch = originalFetch;
  }
});

test('outbound webhook rejects non-HTTPS endpoints', async () => {
  await assert.rejects(
    sendOutboundWebhook({ url: 'http://example.com/hook', payload: {} }),
    /OUTBOUND_WEBHOOK_REQUIRES_HTTPS/,
  );
});
