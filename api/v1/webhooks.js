const crypto = require('node:crypto');
const { getProductionStore } = require('../../packages/persistence/production_store');
const { AutomationEngine } = require('../../modules/automation/engine');

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
      if (raw.length > 200000) reject(new Error('PAYLOAD_TOO_LARGE'));
    });
    req.on('end', () => {
      try { resolve(raw ? JSON.parse(raw) : {}); } catch { reject(new Error('INVALID_JSON')); }
    });
    req.on('error', reject);
  });
}

module.exports = async (req, res) => {
  const requestId = req.headers['x-request-id'] || crypto.randomUUID();
  if (req.method !== 'POST') return send(res, 405, { error: { code: 'METHOD_NOT_ALLOWED', message: 'Use POST for webhook events' } }, requestId);

  const tenantId = req.headers['x-tenant-id'];
  if (!tenantId || typeof tenantId !== 'string' || tenantId.length > 128) {
    return send(res, 401, { error: { code: 'TENANT_REQUIRED', message: 'x-tenant-id is required' } }, requestId);
  }

  try {
    const store = await getProductionStore();
    if (!store) return send(res, 503, { error: { code: 'DATABASE_NOT_READY', message: 'Production database is required' } }, requestId);

    const payload = await readBody(req);
    const eventType = req.headers['x-bos-event'] || payload.event || 'webhook.received';
    const eventId = req.headers['x-event-id'] || crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex').slice(0, 40);
    const executionId = crypto.createHash('sha256').update(`${tenantId}:webhook:${eventId}`).digest('hex').slice(0, 40);

    const existing = await store.repository.find(tenantId, 'webhook_execution', executionId);
    if (existing) return send(res, 200, { status: 'accepted', replayed: true, execution: existing }, requestId);

    const workflows = await store.repository.all(tenantId, 'workflow');
    const matched = workflows.filter((workflow) => workflow.enabled !== false && (workflow.trigger?.type === eventType || workflow.trigger?.event === eventType || workflow.trigger?.type === 'webhook'));

    const engine = new AutomationEngine({
      actions: {
        create_task: ({ tenantId: id, input }) => store.repository.save(id, 'task', crypto.randomUUID(), { tenantId: id, type: 'task', status: 'open', input, createdAt: new Date().toISOString() }),
        notify_sales: ({ tenantId: id, input }) => store.repository.save(id, 'sales_notification', crypto.randomUUID(), { tenantId: id, status: 'queued', input, createdAt: new Date().toISOString() }),
        ai_followup: ({ tenantId: id, input }) => store.repository.save(id, 'ai_followup', crypto.randomUUID(), { tenantId: id, status: 'queued', input, createdAt: new Date().toISOString() }),
      },
    });

    const results = [];
    for (const workflow of matched) {
      const result = await engine.run({ tenantId, steps: workflow.steps, context: { eventType, eventId, payload, workflowId: workflow.id } });
      results.push({ workflowId: workflow.id, result });
    }

    const execution = { id: executionId, tenantId, eventType, eventId, matchedWorkflows: matched.map((workflow) => workflow.id), results, createdAt: new Date().toISOString() };
    await store.repository.save(tenantId, 'webhook_execution', executionId, execution);
    return send(res, 202, { status: 'accepted', execution }, requestId);
  } catch (error) {
    const status = error.message === 'INVALID_JSON' ? 400 : error.message === 'PAYLOAD_TOO_LARGE' ? 413 : 422;
    return send(res, status, { error: { code: status === 400 ? 'INVALID_JSON' : status === 413 ? 'PAYLOAD_TOO_LARGE' : 'WEBHOOK_FAILED', message: error.message || 'Webhook execution failed' } }, requestId);
  }
};
