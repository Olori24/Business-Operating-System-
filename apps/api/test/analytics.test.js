const assert = require('node:assert/strict');
const test = require('node:test');
const http = require('node:http');
const { requestHandler } = require('../server');

test('serves customer activity analytics', async () => {
  const response = await new Promise((resolve, reject) => {
    const server = http.createServer(requestHandler).listen(0, () => {
      const req = http.get(`http://127.0.0.1:${server.address().port}/analytics`, res => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', chunk => { body += chunk; });
        res.on('end', () => { server.close(); resolve({ statusCode: res.statusCode, contentType: res.headers['content-type'], body }); });
      });
      req.on('error', error => { server.close(); reject(error); });
    });
  });
  assert.equal(response.statusCode, 200);
  assert.match(response.contentType, /text\/html/);
  assert.match(response.body, /BOS Activity & Analytics/);
  assert.match(response.body, /Workflow runs/);
  assert.match(response.body, /Execution health/);
  assert.match(response.body, /Recent activity/);
});
