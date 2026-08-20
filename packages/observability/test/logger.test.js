const test = require('node:test');
const assert = require('node:assert/strict');

test('captureException is a no-op when SENTRY_DSN is not configured', () => {
  const previous = process.env.SENTRY_DSN;
  delete process.env.SENTRY_DSN;

  delete require.cache[require.resolve('../logger')];
  const { captureException } = require('../logger');

  assert.equal(captureException(new Error('expected test error'), { test: true }), false);

  if (previous === undefined) delete process.env.SENTRY_DSN;
  else process.env.SENTRY_DSN = previous;
});

test('captureException forwards errors to the configured Sentry-compatible endpoint', async () => {
  const previousDsn = process.env.SENTRY_DSN;
  const previousFetch = global.fetch;
  const requests = [];

  process.env.SENTRY_DSN = 'https://public@example.test/12345';
  global.fetch = async (url, options) => {
    requests.push({ url, options });
    return { ok: true, status: 200 };
  };

  delete require.cache[require.resolve('../logger')];
  const { captureException } = require('../logger');

  assert.equal(captureException(new Error('boom'), { requestId: 'req-123' }), true);
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(requests.length, 1);
  assert.match(requests[0].url, /\/api\/12345\/store\//);
  const payload = JSON.parse(requests[0].options.body);
  assert.equal(payload.exception.values[0].value, 'boom');
  assert.equal(payload.extra.requestId, 'req-123');

  global.fetch = previousFetch;
  if (previousDsn === undefined) delete process.env.SENTRY_DSN;
  else process.env.SENTRY_DSN = previousDsn;
});
