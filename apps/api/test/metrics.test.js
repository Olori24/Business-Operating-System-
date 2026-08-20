const assert = require('node:assert/strict');
const test = require('node:test');
const { requestHandler } = require('../server');
const { resetForTests } = require('../../../packages/observability/metrics');

function invoke(method, url) {
  return new Promise((resolve) => {
    const headers = {};
    const response = {
      statusCode: 200,
      setHeader(name, value) { headers[name.toLowerCase()] = value; },
      writeHead(status, values) { this.statusCode = status; Object.assign(headers, Object.fromEntries(Object.entries(values).map(([k, v]) => [k.toLowerCase(), v]))); },
      once() {},
      end(body) { resolve({ statusCode: this.statusCode, headers, body }); },
    };
    requestHandler({ method, url, headers: {} }, response);
  });
}

test.beforeEach(() => resetForTests());

test('GET /api/metrics exposes service counters', async () => {
  const response = await invoke('GET', '/api/metrics');
  assert.equal(response.statusCode, 200);
  const payload = JSON.parse(response.body);
  assert.equal(payload.status, 'ok');
  assert.equal(typeof payload.metrics.requests, 'number');
  assert.equal(typeof payload.metrics.errors, 'number');
  assert.equal(typeof payload.metrics.queueDepth, 'number');
  assert.equal(typeof payload.metrics.uptimeSeconds, 'number');
});
