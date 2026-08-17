const assert = require('node:assert/strict');
const test = require('node:test');
const http = require('node:http');
const handler = require('../../../api/[...path]');

function request(method, path, body = {}) {
  return new Promise((resolve, reject) => {
    const server = http.createServer(handler);
    server.listen(0, () => {
      const port = server.address().port;
      const payload = JSON.stringify(body);
      const req = http.request(`http://127.0.0.1:${port}${path}`, {
        method,
        headers: { 'content-type': 'application/json', 'content-length': Buffer.byteLength(payload) },
      }, res => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
          server.close();
          resolve({ statusCode: res.statusCode, body: data ? JSON.parse(data) : {} });
        });
      });
      req.on('error', error => { server.close(); reject(error); });
      req.end(payload);
    });
  });
}

test('Google config reports missing production configuration safely', async () => {
  const previous = process.env.GOOGLE_CLIENT_ID;
  delete process.env.GOOGLE_CLIENT_ID;
  const result = await request('GET', '/api/v1/auth/google-config');
  if (previous === undefined) delete process.env.GOOGLE_CLIENT_ID;
  else process.env.GOOGLE_CLIENT_ID = previous;
  assert.equal(result.statusCode, 503);
  assert.equal(result.body.error.code, 'GOOGLE_AUTH_NOT_CONFIGURED');
});

test('Google auth rejects requests without a configured provider', async () => {
  const previous = process.env.GOOGLE_CLIENT_ID;
  delete process.env.GOOGLE_CLIENT_ID;
  const result = await request('POST', '/api/v1/auth/google', {});
  if (previous === undefined) delete process.env.GOOGLE_CLIENT_ID;
  else process.env.GOOGLE_CLIENT_ID = previous;
  assert.equal(result.statusCode, 503);
  assert.equal(result.body.error.code, 'GOOGLE_AUTH_NOT_CONFIGURED');
});
