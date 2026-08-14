const test = require('node:test');
const assert = require('node:assert/strict');
const { requestHandler } = require('../server');

function invoke(method, url) {
  return new Promise((resolve) => {
    const headers = {};
    const response = {
      writeHead(statusCode, responseHeaders) {
        resolve.statusCode = statusCode;
        Object.assign(headers, responseHeaders);
      },
      end(body) {
        resolve({ statusCode: resolve.statusCode, headers, body });
      }
    };

    requestHandler({ method, url }, response);
  });
}

test('health endpoint reports a healthy BOS API', async () => {
  const response = await invoke('GET', '/health');
  assert.equal(response.statusCode, 200);
  assert.deepEqual(JSON.parse(response.body), {
    status: 'ok',
    service: 'bos-api'
  });
});

test('unknown routes return 404', async () => {
  const response = await invoke('GET', '/missing');
  assert.equal(response.statusCode, 404);
  assert.deepEqual(JSON.parse(response.body), { error: 'Not found' });
});
