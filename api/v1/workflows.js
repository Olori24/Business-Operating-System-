const crypto = require('node:crypto');
const { getProductionStore } = require('../../packages/persistence/production_store');

function send(res, status, body, requestId) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.setHeader('x-request-id', requestId);
  res.end(JSON.stringify(body));
}

function readBody(req) {
  if (req.body && typeof req.body === 'object') return Promise.resolve(req.body);
  return new Promise((resolve, reject) => {
    let raw = '';
    req.setEncoding('utf8');
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 100000) reject(new Error('PAYLOAD_TOO_LARGE'));
    });
    req.on('end', () => {
      try { resolve(raw ? JSON.parse(raw) : {}); } catch { reject(new Error('INVALID_JSON')); }
    });
    req.on('error', reject);
  });
}

module.exports = async (req, res) => {
  const requestId = req.headers['x-request-id'] || crypto.randomUUID();
  const tenantId = req.headers['x-tenant-id'];
  if (!tenantId || typeof tenantId !== 'string' || tenantId.length > 128) {
    return send(res, 401, { error: { code: 'TENANT_REQUIRED', message: 'x-tenant-id is required' } }, requestId);
  }

  try {
    const store = await getProductionStore();
    if (!store) return send(res, 503, { error: { code: 'DATABASE_NOT_READY', message: 'Production database is required' } }, requestId);

    const url = new URL(req.url, 'http://bos.local');
    const id = url.searchParams.get('id');

    if (req.method === 'GET') {
      if (id) {
        const workflow = await store.repository.find(tenantId, 'workflow', id);
        if (!workflow) return send(res, 404, { error: { code: 'WORKFLOW_NOT_FOUND', message: 'Workflow not found' } }, requestId);
        return send(res, 200, { status: 'ok', workflow }, requestId);
      }
      return send(res, 200, { status: 'ok', workflows: await store.repository.all(tenantId, 'workflow') }, requestId);
    }

    if (req.method === 'POST') {
      const body = await readBody(req);
      if (!body.name || typeof body.name !== 'string') return send(res, 400, { error: { code: 'INVALID_WORKFLOW', message: 'name is required' } }, requestId);
      if (!body.trigger || typeof body.trigger !== 'object') return send(res, 400, { error: { code: 'INVALID_WORKFLOW', message: 'trigger is required' } }, requestId);
      if (!Array.isArray(body.steps) || !body.steps.length) return send(res, 400, { error: { code: 'INVALID_WORKFLOW', message: 'steps must contain at least one action' } }, requestId);
      const workflow = { id: crypto.randomUUID(), tenantId, name: body.name.trim(), trigger: body.trigger, steps: body.steps, enabled: body.enabled !== false, version: 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      await store.repository.save(tenantId, 'workflow', workflow.id, workflow);
      return send(res, 201, { status: 'created', workflow }, requestId);
    }

    if (req.method === 'PATCH') {
      if (!id) return send(res, 400, { error: { code: 'WORKFLOW_ID_REQUIRED', message: 'id query parameter is required' } }, requestId);
      const current = await store.repository.find(tenantId, 'workflow', id);
      if (!current) return send(res, 404, { error: { code: 'WORKFLOW_NOT_FOUND', message: 'Workflow not found' } }, requestId);
      const body = await readBody(req);
      const workflow = { ...current, ...body, id, tenantId, version: Number(current.version || 1) + 1, updatedAt: new Date().toISOString() };
      await store.repository.save(tenantId, 'workflow', id, workflow);
      return send(res, 200, { status: 'updated', workflow }, requestId);
    }

    if (req.method === 'DELETE') {
      if (!id) return send(res, 400, { error: { code: 'WORKFLOW_ID_REQUIRED', message: 'id query parameter is required' } }, requestId);
      const deleted = await store.repository.delete(tenantId, 'workflow', id);
      return send(res, deleted ? 200 : 404, deleted ? { status: 'deleted', id } : { error: { code: 'WORKFLOW_NOT_FOUND', message: 'Workflow not found' } }, requestId);
    }

    return send(res, 405, { error: { code: 'METHOD_NOT_ALLOWED', message: 'Use GET, POST, PATCH or DELETE' } }, requestId);
  } catch (error) {
    const status = error.message === 'INVALID_JSON' ? 400 : error.message === 'PAYLOAD_TOO_LARGE' ? 413 : 503;
    return send(res, status, { error: { code: status === 400 ? 'INVALID_JSON' : status === 413 ? 'PAYLOAD_TOO_LARGE' : 'WORKFLOW_STORE_FAILED', message: error.message || 'Workflow persistence failed' } }, requestId);
  }
};
