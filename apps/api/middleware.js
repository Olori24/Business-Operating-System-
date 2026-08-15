const { randomUUID } = require('node:crypto');

function requestContext(req) {
  const requestId = req.headers['x-request-id'] || randomUUID();
  return { requestId };
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
