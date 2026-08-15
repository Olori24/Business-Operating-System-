const assert = require('node:assert/strict');
const test = require('node:test');
const { requestContext, errorPayload, parsePagination } = require('../middleware');

test('request context preserves trusted request id', () => {
  const context = requestContext({ headers: { 'x-request-id': 'req-1' } });
  assert.deepEqual(context, { requestId: 'req-1' });
});

test('pagination is bounded and cursor-aware', () => {
  assert.deepEqual(parsePagination('http://bos.local/api?limit=500&cursor=abc'), { limit: 100, cursor: 'abc' });
});

test('error payload is stable and traceable', () => {
  assert.deepEqual(errorPayload('NOT_FOUND', 'Route not found', 'req-1'), {
    error: { code: 'NOT_FOUND', message: 'Route not found', requestId: 'req-1' }
  });
});
