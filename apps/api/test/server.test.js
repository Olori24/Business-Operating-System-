const test = require('node:test');
const assert = require('node:assert/strict');
const { requestHandler } = require('../server');

function invoke(method, url, headers = {}) {
  return new Promise((resolve) => {
    const responseHeaders = {};
    const response = {
      writeHead(statusCode, responseHeaderValues) {
        resolve.statusCode = statusCode;
        Object.assign(responseHeaders, responseHeaderValues);
      },
      setHeader(name, value) {
        responseHeaders[name.toLowerCase()] = value;
      },
      end(body) {
        resolve({ statusCode: resolve.statusCode, headers: responseHeaders, body });
      }
    };

    requestHandler({ method, url, headers }, response);
  });
}

test('health endpoint reports a healthy BOS API with request correlation', async () => {
  const response = await invoke('GET', '/health', { 'x-request-id': 'req-1' });
  assert.equal(response.statusCode, 200);
  assert.deepEqual(JSON.parse(response.body), {
    status: 'ok',
    service: 'bos-api',
    requestId: 'req-1'
  });
  assert.equal(response.headers['x-request-id'], 'req-1');
});

test('API metadata exposes the current contract version', async () => {
  const response = await invoke('GET', '/api/v1/meta', { 'x-request-id': 'req-2' });
  assert.equal(response.statusCode, 200);
  assert.deepEqual(JSON.parse(response.body), {
    name: 'Business Operating System',
    service: 'bos-api',
    apiVersion: 'v1',
    requestId: 'req-2'
  });
});

test('JSON responses declare the expected content type', async () => {
  const response = await invoke('GET', '/health');
  assert.equal(response.headers['content-type'], 'application/json; charset=utf-8');
});

test('unknown routes return a stable error envelope', async () => {
  const response = await invoke('GET', '/missing', { 'x-request-id': 'req-3' });
  assert.equal(response.statusCode, 404);
  assert.deepEqual(JSON.parse(response.body), {
    error: { code: 'NOT_FOUND', message: 'Route not found', requestId: 'req-3' }
  });
});
