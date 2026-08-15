const assert = require('node:assert/strict');
const test = require('node:test');
const http = require('node:http');
const { requestHandler } = require('../server');

function request(url) {
  return new Promise((resolve, reject) => {
    const server = http.createServer(requestHandler).listen(0, () => {
      const port = server.address().port;
      const req = http.get(`http://127.0.0.1:${port}${url}`, (res) => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', chunk => { body += chunk; });
        res.on('end', () => {
          server.close();
          resolve({ statusCode: res.statusCode, contentType: res.headers['content-type'], body });
        });
      });
      req.on('error', error => { server.close(); reject(error); });
    });
  });
}

test('serves customer dashboard', async () => {
  const response = await request('/dashboard');
  assert.equal(response.statusCode, 200);
  assert.match(response.contentType, /text\/html/);
  assert.match(response.body, /Business Operating System/);
});

test('serves dashboard API health endpoint', async () => {
  const response = await request('/api/health');
  assert.equal(response.statusCode, 200);
  assert.match(response.contentType, /application\/json/);
  assert.deepEqual(JSON.parse(response.body).status, 'ok');
});

test('dashboard exposes business workspace onboarding controls', async () => {
  const response = await request('/dashboard');
  assert.equal(response.statusCode, 200);
  assert.match(response.body, /Create your workspace/);
  assert.match(response.body, /businessName/);
  assert.match(response.body, /industry/);
  assert.match(response.body, /teamSize/);
  assert.match(response.body, /workspaceForm/);
});
