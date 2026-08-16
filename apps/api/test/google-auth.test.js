const assert = require('node:assert/strict');
const test = require('node:test');
const googleConfig = require('../../../api/v1/auth/google-config');
const googleAuth = require('../../../api/v1/auth/google');

function response() {
  return { statusCode: 200, body: null, headers: {}, status(code) { this.statusCode = code; return this; }, json(value) { this.body = value; return this; }, setHeader(key, value) { this.headers[key] = value; } };
}

test('Google config reports missing production configuration safely', async () => {
  const previous = process.env.GOOGLE_CLIENT_ID;
  delete process.env.GOOGLE_CLIENT_ID;
  const res = response();
  await googleConfig({ method: 'GET' }, res);
  assert.equal(res.statusCode, 503);
  assert.equal(res.body.error.code, 'GOOGLE_AUTH_NOT_CONFIGURED');
  if (previous === undefined) delete process.env.GOOGLE_CLIENT_ID;
  else process.env.GOOGLE_CLIENT_ID = previous;
});

test('Google auth rejects requests without a configured provider', async () => {
  const previous = process.env.GOOGLE_CLIENT_ID;
  delete process.env.GOOGLE_CLIENT_ID;
  const res = response();
  await googleAuth({ method: 'POST', body: {} }, res);
  assert.equal(res.statusCode, 503);
  assert.equal(res.body.error.code, 'GOOGLE_AUTH_NOT_CONFIGURED');
  if (previous === undefined) delete process.env.GOOGLE_CLIENT_ID;
  else process.env.GOOGLE_CLIENT_ID = previous;
});
