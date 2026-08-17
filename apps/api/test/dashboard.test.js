const assert = require('node:assert/strict');
const test = require('node:test');
const http = require('node:http');
const { requestHandler } = require('../server');

function request(url) {
  return new Promise((resolve, reject) => {
    const server = http.createServer(requestHandler).listen(0, () => {
      const port = server.address().port;
      const req = http.get(`http://127.0.0.1:${port}${url}`, res => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', chunk => { body += chunk; });
        res.on('end', () => { server.close(); resolve({ statusCode: res.statusCode, contentType: res.headers['content-type'], body }); });
      });
      req.on('error', error => { server.close(); reject(error); });
    });
  });
}

function post(url, payload, headers = {}) {
  return new Promise((resolve, reject) => {
    const server = http.createServer(requestHandler).listen(0, () => {
      const port = server.address().port;
      const body = JSON.stringify(payload);
      const req = http.request(`http://127.0.0.1:${port}${url}`, { method: 'POST', headers: { 'content-type': 'application/json', 'content-length': Buffer.byteLength(body), ...headers } }, res => {
        let responseBody = '';
        res.setEncoding('utf8');
        res.on('data', chunk => { responseBody += chunk; });
        res.on('end', () => { server.close(); resolve({ statusCode: res.statusCode, contentType: res.headers['content-type'], body: responseBody }); });
      });
      req.on('error', error => { server.close(); reject(error); });
      req.end(body);
    });
  });
}

test('serves customer dashboard', async () => {
  const r = await request('/dashboard');
  assert.equal(r.statusCode, 200);
  assert.match(r.contentType, /text\/html/);
  assert.match(r.body, /Business workspace/);
  assert.match(r.body, /Run the business/);
  assert.match(r.body, /Build a workflow/);
  assert.match(r.body, /Integrations/);
});

test('serves dashboard API health endpoint', async () => {
  const r = await request('/api/health');
  assert.equal(r.statusCode, 200);
  assert.match(r.contentType, /application\/json/);
  assert.deepEqual(JSON.parse(r.body).status, 'ok');
});

test('serves workflow builder with core workflow controls', async () => {
  const r = await request('/workflows');
  assert.equal(r.statusCode, 200);
  assert.match(r.contentType, /text\/html/);
  assert.match(r.body, /Automate what matters/);
  assert.match(r.body, /Workflow name/);
  assert.match(r.body, /Trigger/);
  assert.match(r.body, /Action/);
  assert.match(r.body, /Save & Run Workflow/);
  assert.match(r.body, /workflow/);
});

test('serves AI employee configuration with governance controls', async () => {
  const r = await request('/ai-employees');
  assert.equal(r.statusCode, 200);
  assert.match(r.body, /BOS AI Employees/);
  assert.match(r.body, /Employee name/);
  assert.match(r.body, /Objective/);
});

test('serves integration connection surface', async () => {
  const r = await request('/integrations');
  assert.equal(r.statusCode, 200);
  assert.match(r.body, /BOS Integrations/);
  assert.match(r.body, /WhatsApp/);
  assert.match(r.body, /Connect/);
});

test('serves automation execution surface', async () => {
  const r = await request('/execution');
  assert.equal(r.statusCode, 200);
  assert.match(r.body, /BOS Automation Execution/);
  assert.match(r.body, /Run automation/);
  assert.match(r.body, /api\/v1\/automations\/run/);
});

test('automation endpoint rejects unauthenticated tenant spoofing', async () => {
  const r = await post('/api/v1/automations/run', { steps: [{ action: 'create_task', input: { title: 'Follow up' } }], context: { source: 'test' } }, { 'x-tenant-id': 'tenant-test' });
  assert.equal(r.statusCode, 401);
  assert.equal(JSON.parse(r.body).error.code, 'UNAUTHENTICATED');
});
