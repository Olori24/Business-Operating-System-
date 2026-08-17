const assert = require('node:assert/strict');
const test = require('node:test');
const http = require('node:http');
process.env.BOS_ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
const { requestHandler } = require('../server');

function request(method, url, body = {}, headers = {}) {
  return new Promise((resolve, reject) => {
    const server = http.createServer(requestHandler).listen(0, () => {
      const port = server.address().port;
      const payload = JSON.stringify(body);
      const req = http.request(`http://127.0.0.1:${port}${url}`, {
        method,
        headers: { 'content-type': 'application/json', 'content-length': Buffer.byteLength(payload), ...headers },
      }, res => {
        let text = '';
        res.setEncoding('utf8');
        res.on('data', c => text += c);
        res.on('end', () => { server.close(); resolve({ statusCode: res.statusCode, body: text }); });
      });
      req.on('error', e => { server.close(); reject(e); });
      req.end(payload);
    });
  });
}

test('WhatsApp connection endpoint rejects unauthenticated tenant access', async () => {
  const response = await request('POST', '/api/v1/integrations/whatsapp/connect', { phoneNumberId: '123456', accessToken: 'token' }, { 'x-tenant-id': 'tenant-test' });
  assert.equal(response.statusCode, 401);
  assert.equal(JSON.parse(response.body).error.code, 'UNAUTHENTICATED');
});

test('WhatsApp status endpoint rejects unauthenticated tenant access', async () => {
  const response = await request('GET', '/api/v1/integrations/whatsapp', {}, { 'x-tenant-id': 'tenant-test' });
  assert.equal(response.statusCode, 401);
  assert.equal(JSON.parse(response.body).error.code, 'UNAUTHENTICATED');
});
