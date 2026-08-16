const crypto = require('node:crypto');
const { AutomationEngine } = require('../../../../modules/automation/engine');
const { getProductionStore } = require('../../../../packages/persistence/production_store');

const engine = new AutomationEngine({
  actions: {
    create_task: async ({ tenantId, input }) => ({ action: 'create_task', tenantId, accepted: true, input }),
    notify_sales: async ({ tenantId, input }) => ({ action: 'notify_sales', tenantId, accepted: true, input }),
    ai_followup: async ({ tenantId, input }) => ({ action: 'ai_followup', tenantId, accepted: true, input }),
  },
});

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.end(JSON.stringify(body));
}

module.exports = async (req, res) => {
  const requestId = req.headers['x-request-id'] || crypto.randomUUID();
  res.setHeader('x-request-id', requestId);
  if (req.method !== 'POST') return send(res, 405, { error: { code: 'METHOD_NOT_ALLOWED', message: 'Use POST for automation execution', requestId } });
  const tenantId = req.headers['x-tenant-id'];
  if (!tenantId || typeof tenantId !== 'string' || tenantId.length > 128) return send(res, 401, { error: { code: 'TENANT_REQUIRED', message: 'x-tenant-id is required', requestId } });
  try {
    const payload = typeof req.body === 'object' && req.body !== null ? req.body : {};
    const steps = Array.isArray(payload.steps) ? payload.steps : [];
    if (!steps.length) return send(res, 400, { error: { code: 'INVALID_REQUEST', message: 'steps must contain at least one action', requestId } });
    const idempotencyKey = req.headers['idempotency-key'] || crypto.randomUUID();
    const executionId = crypto.createHash('sha256').update(`${tenantId}:${idempotencyKey}`).digest('hex').slice(0, 40);
    const store = await getProductionStore();
    if (store) {
      const existing = await store.repository.find(tenantId, 'execution', executionId);
      if (existing) return send(res, 200, { status: 'completed', replayed: true, persisted: true, execution: existing, requestId });
    }
    const startedAt = new Date().toISOString();
    const result = await engine.run({ tenantId, steps, context: payload.context || {} });
    const execution = { id: executionId, tenantId, status: 'completed', idempotencyKey, steps, context: payload.context || {}, result, startedAt, completedAt: new Date().toISOString() };
    if (store) await store.repository.save(tenantId, 'execution', executionId, execution);
    return send(res, 200, { status: 'completed', persisted: Boolean(store), execution, requestId });
  } catch (error) {
    return send(res, 422, { error: { code: 'AUTOMATION_FAILED', message: error.message || 'Automation failed', requestId } });
  }
};
