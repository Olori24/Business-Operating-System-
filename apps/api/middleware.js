const { randomUUID } = require('node:crypto');

function requestContext(req = {}) {
  const headers = req.headers || {};
  const requestId = headers['x-request-id'] || randomUUID();
  const context = { requestId };
  Object.defineProperty(context, 'startedAt', {
    value: Date.now(),
    enumerable: false,
    writable: false,
  });
  return context;
}

function errorPayload(code, message, requestId) {
  return { error: { code, message, requestId } };
}

function parsePagination(url, { defaultLimit = 50, maxLimit = 100 } = {}) {
  const params = new URL(url, 'http://bos.local').searchParams;
  const limit = Math.min(Math.max(Number(params.get('limit') || defaultLimit), 1), maxLimit);
  const cursor = params.get('cursor') || null;
  return { limit, cursor };
}

module.exports = { requestContext, errorPayload, parsePagination };
