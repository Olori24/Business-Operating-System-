const assert = require('node:assert/strict');
const test = require('node:test');
const http = require('node:http');
const handler = require('../../../api/[...path]');

function request(method, path) {
  return new Promise((resolve, reject) => {
    const server = http.createServer(handler);
    server.listen(0, () => {
      const port = server.address().port;
      const req = http.request(`http://127.0.0.1:${port}${path}`, { method, headers: { 'content-type': 'application/json' } }, res => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
          server.close();
          resolve({ status: res.statusCode, body: data ? JSON.parse(data) : {} });
        });
      });
      req.on('error', error => { server.close(); reject(error); });
      req.end();
    });
  });
}

test('Google config fails safely when unconfigured', async () => {
  const previous = process.env.GOOGLE_CLIENT_ID;
  delete process.env.GOOGLE_CLIENT_ID;
  const result = await request('GET', '/api/v1/auth/google-config');
  if (previous === undefined) delete process.env.GOOGLE_CLIENT_ID;
  else process.env.GOOGLE_CLIENT_ID = previous;
  assert.equal(result.status, 503);
  assert.equal(result.body.error.code, 'GOOGLE_AUTH_NOT_CONFIGURED');
});

test('auth me rejects unauthenticated requests', async () => {
  const result = await request('GET', '/api/v1/auth/me');
  assert.equal(result.status, 401);
  assert.equal(result.body.error.code, 'UNAUTHENTICATED');
});
