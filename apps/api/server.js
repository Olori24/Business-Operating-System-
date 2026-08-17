const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { jsonResponse } = require('./http');
const { requestContext, errorPayload } = require('./middleware');
const { AutomationEngine } = require('../../modules/automation/engine');
const { getProductionStore } = require('../../packages/persistence/production_store');
const {
  getSession,
  parseCookies,
  clearSessionCookie,
  getWorkspaceForUser,
  createOrUpdateWorkspace,
} = require('../../packages/auth/email_auth');
const { sendOutboundWebhook } = require('../../modules/integrations/outbound_webhook');
const { encryptSecret } = require('../../modules/integrations/secret_store');
const { sendWhatsAppMessage } = require('../../modules/integrations/whatsapp_cloud');

const port = Number(process.env.PORT || 3000);
const apiVersion = 'v1';
const dashboardPath = path.join(__dirname, '..', 'dashboard', 'index.html');
const onboardingPath = path.join(__dirname, '..', 'dashboard', 'onboarding.html');
const workflowBuilderPath = path.join(__dirname, '..', 'dashboard', 'workflows.html');
const aiEmployeePath = path.join(__dirname, '..', 'dashboard', 'ai-employees.html');
const integrationPath = path.join(__dirname, '..', 'dashboard', 'integrations.html');
const executionPath = path.join(__dirname, '..', 'dashboard', 'execution.html');
const analyticsPath = path.join(__dirname, '..', 'dashboard', 'analytics.html');
const billingPath = path.join(__dirname, '..', 'dashboard', 'billing.html');
const supportPath = path.join(__dirname, '..', 'dashboard', 'support.html');
const launchPath = path.join(__dirname, '..', 'dashboard', 'launch-readiness.html');

async function storeRequired() {
  const store = await getProductionStore();
  if (!store) throw new Error('DATABASE_NOT_CONFIGURED');
  return store;
}

async function record(tenantId, type, value) {
  const store = await storeRequired();
  const id = value.id || crypto.randomUUID();
  return store.repository.save(tenantId, type, id, { ...value, id });
}

async function integration(tenantId, type, id) {
  const store = await storeRequired();
  return store.repository.find(tenantId, type, id);
}

async function authenticate(req) {
  const session = await getSession(parseCookies(req).bos_session);
  if (!session) return null;
  const workspace = await getWorkspaceForUser(session.user_id);
  return {
    session,
    user: { id: session.user_id, email: session.email, name: session.name },
    workspace,
    tenantId: workspace?.tenantId || null,
  };
}

async function requireAuth(req) {
  const auth = await authenticate(req);
  if (!auth) {
    const error = new Error('UNAUTHENTICATED');
    error.statusCode = 401;
    throw error;
  }
  return auth;
}

function htmlResponse(res, filePath) {
  try {
    const html = fs.readFileSync(filePath, 'utf8');
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(html);
  } catch {
    jsonResponse(res, 500, { status: 'error', code: 'PAGE_UNAVAILABLE' });
  }
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.setEncoding('utf8');
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 100000) req.destroy();
    });
    req.on('end', () => {
      try { resolve(body ? JSON.parse(body) : {}); }
      catch { reject(new Error('INVALID_JSON')); }
    });
    req.on('error', reject);
  });
}

function workflowSteps(payload) {
  if (!Array.isArray(payload.steps) || payload.steps.length < 1 || payload.steps.length > 20) throw new TypeError('steps must contain 1 to 20 actions');
  return payload.steps.map(step => {
    if (!step || typeof step.action !== 'string' || !step.action.trim()) throw new TypeError('Each workflow step requires an action');
    if (step.input !== undefined && (step.input === null || typeof step.input !== 'object' || Array.isArray(step.input))) throw new TypeError('Step input must be an object');
    return { action: step.action.trim(), input: step.input || {} };
  });
}

function executionStatus(results) {
  if (!results.length) return 'skipped';
  if (results.some(result => result?.status === 'failed')) return 'failed';
  if (results.some(result => result?.status === 'queued')) return 'queued';
  return 'completed';
}

const automationEngine = new AutomationEngine({
  actions: {
    create_task: async ({ tenantId, input }) => record(tenantId, 'task', { status: 'completed', source: 'automation', input }),
    notify_sales: async ({ tenantId, input }) => record(tenantId, 'sales_notification', { status: 'queued', source: 'automation', input }),
    ai_followup: async ({ tenantId, input }) => record(tenantId, 'ai_followup', { status: 'queued', source: 'automation', input }),
    outbound_webhook: async ({ tenantId, input, context }) => {
      const result = await sendOutboundWebhook({
        url: input.url,
        payload: { tenantId, context, input: input.payload || {} },
        headers: input.headers || {},
        timeoutMs: input.timeoutMs,
      });
      return record(tenantId, 'outbound_webhook', { status: result.ok ? 'completed' : 'failed', source: 'automation', result });
    },
    whatsapp_send: async ({ tenantId, input }) => {
      const config = await integration(tenantId, 'integration', 'whatsapp');
      if (!config) throw new Error('WHATSAPP_NOT_CONNECTED');
      const result = await sendWhatsAppMessage({ config, to: input.to, text: input.text });
      return record(tenantId, 'whatsapp_message', {
        status: 'completed', source: 'automation', to: input.to,
        messageId: result.messages?.[0]?.id || null, result,
      });
    },
  },
});

async function requestHandler(req, res) {
  const { requestId } = requestContext(req);
  res.setHeader('x-request-id', requestId);
  const url = String(req.url || '').split('?')[0];

  try {
    if (req.method === 'GET' && (url === '/health' || url === '/api/health')) {
      jsonResponse(res, 200, { status: 'ok', service: 'bos-api', requestId });
      return;
    }
    if (req.method === 'GET' && (url === '/' || url === '/dashboard')) return htmlResponse(res, dashboardPath);
    if (req.method === 'GET' && (url === '/start' || url === '/onboarding')) return htmlResponse(res, onboardingPath);
    if (req.method === 'GET' && (url === '/workflows' || url === '/dashboard/workflows')) return htmlResponse(res, workflowBuilderPath);
    if (req.method === 'GET' && (url === '/ai-employees' || url === '/dashboard/ai-employees')) return htmlResponse(res, aiEmployeePath);
    if (req.method === 'GET' && (url === '/integrations' || url === '/dashboard/integrations')) return htmlResponse(res, integrationPath);
    if (req.method === 'GET' && (url === '/execution' || url === '/dashboard/execution')) return htmlResponse(res, executionPath);
    if (req.method === 'GET' && (url === '/analytics' || url === '/dashboard/analytics')) return htmlResponse(res, analyticsPath);
    if (req.method === 'GET' && (url === '/billing' || url === '/dashboard/billing')) return htmlResponse(res, billingPath);
    if (req.method === 'GET' && (url === '/support' || url === '/dashboard/support')) return htmlResponse(res, supportPath);
    if (req.method === 'GET' && (url === '/launch' || url === '/dashboard/launch')) return htmlResponse(res, launchPath);

    if (req.method === 'POST' && url === '/api/v1/onboarding') {
      const auth = await requireAuth(req);
      const payload = await readJson(req);
      const businessName = String(payload.businessName || payload.business_name || '').trim();
      if (!businessName) throw new TypeError('businessName is required');
      const workspace = await createOrUpdateWorkspace({
        userId: auth.user.id,
        businessName,
        email: auth.user.email,
        ownerName: auth.user.name,
        authProvider: 'email',
      });
      jsonResponse(res, 201, { status: 'created', tenantId: workspace.tenantId, workspace, requestId });
      return;
    }

    if (req.method === 'GET' && url === '/api/v1/workflows') {
      const auth = await requireAuth(req);
      if (!auth.tenantId) throw new Error('WORKSPACE_REQUIRED');
      const store = await storeRequired();
      const workflows = await store.repository.all(auth.tenantId, 'workflow');
      jsonResponse(res, 200, { status: 'ok', workflows, requestId });
      return;
    }

    if (req.method === 'POST' && url === '/api/v1/workflows') {
      const auth = await requireAuth(req);
      if (!auth.tenantId) throw new Error('WORKSPACE_REQUIRED');
      const payload = await readJson(req);
      const name = String(payload.name || '').trim();
      if (!name || name.length > 120) throw new TypeError('Workflow name is required and must be 120 characters or fewer');
      const trigger = payload.trigger;
      if (!trigger || typeof trigger !== 'object' || !String(trigger.type || '').trim()) throw new TypeError('Workflow trigger is required');
      const steps = workflowSteps(payload);
      const workflow = await record(auth.tenantId, 'workflow', {
        name,
        trigger: { type: String(trigger.type).trim() },
        steps,
        enabled: payload.enabled !== false,
        createdBy: auth.user.id,
      });
      jsonResponse(res, 201, { status: 'created', workflow, requestId });
      return;
    }

    if (req.method === 'GET' && url === '/api/v1/integrations/whatsapp') {
      const auth = await requireAuth(req);
      if (!auth.tenantId) throw new Error('WORKSPACE_REQUIRED');
      const config = await integration(auth.tenantId, 'integration', 'whatsapp');
      jsonResponse(res, 200, {
        status: config ? 'connected' : 'not_connected',
        provider: 'whatsapp_cloud',
        phoneNumberId: config?.phoneNumberId || null,
        requestId,
      });
      return;
    }

    if (req.method === 'POST' && url === '/api/v1/integrations/whatsapp/connect') {
      const auth = await requireAuth(req);
      if (!auth.tenantId) throw new Error('WORKSPACE_REQUIRED');
      const payload = await readJson(req);
      const phoneNumberId = String(payload.phoneNumberId || '').trim();
      const accessToken = String(payload.accessToken || '').trim();
      if (!phoneNumberId || !accessToken) throw new TypeError('phoneNumberId and accessToken are required');
      await record(auth.tenantId, 'integration', {
        id: 'whatsapp', provider: 'whatsapp_cloud', phoneNumberId,
        accessToken: encryptSecret(accessToken), status: 'connected', connectedBy: auth.user.id,
      });
      jsonResponse(res, 201, { status: 'connected', provider: 'whatsapp_cloud', phoneNumberId, requestId });
      return;
    }

    if (req.method === 'POST' && url === '/api/v1/automations/run') {
      const auth = await requireAuth(req);
      if (!auth.tenantId) throw new Error('WORKSPACE_REQUIRED');
      const payload = await readJson(req);
      let steps = payload.steps;
      let workflowId = String(payload.workflowId || '').trim() || null;
      if (workflowId) {
        const workflow = await integration(auth.tenantId, 'workflow', workflowId);
        if (!workflow) throw new Error('WORKFLOW_NOT_FOUND');
        if (workflow.enabled === false) throw new Error('WORKFLOW_DISABLED');
        steps = workflow.steps;
      }
      steps = workflowSteps({ steps });
      const executionId = `execution_${crypto.randomUUID()}`;
      let execution;
      try {
        const result = await automationEngine.run({ tenantId: auth.tenantId, steps, context: payload.context || {} });
        const status = executionStatus(result.results);
        execution = await record(auth.tenantId, 'execution', {
          id: executionId, workflowId, status, results: result.results, context: payload.context || {}, userId: auth.user.id,
        });
      } catch (error) {
        execution = await record(auth.tenantId, 'execution', {
          id: executionId, workflowId, status: 'failed', error: error.message, userId: auth.user.id,
        });
        jsonResponse(res, 422, { status: 'failed', execution, requestId });
        return;
      }
      jsonResponse(res, 200, { status: execution.status, execution, requestId });
      return;
    }

    if (req.method === 'POST' && url === '/api/v1/auth/logout') {
      const { revokeSession } = require('../../packages/auth/email_auth');
      await revokeSession(parseCookies(req).bos_session);
      clearSessionCookie(res);
      jsonResponse(res, 200, { status: 'signed_out', requestId });
      return;
    }

    if (req.method === 'GET' && url === '/api/v1/meta') {
      jsonResponse(res, 200, { name: 'Business Operating System', service: 'bos-api', apiVersion, requestId });
      return;
    }

    jsonResponse(res, 404, errorPayload('NOT_FOUND', 'Route not found', requestId));
  } catch (error) {
    const status = error.statusCode || (error instanceof TypeError || error.message === 'INVALID_JSON' ? 400 : error.message === 'UNAUTHENTICATED' ? 401 : 422);
    const code = status === 401 ? 'UNAUTHENTICATED' : status === 400 ? 'INVALID_REQUEST' : 'API_FAILED';
    jsonResponse(res, status, errorPayload(code, error.message, requestId));
  }
}

function startServer() {
  const server = http.createServer(requestHandler);
  server.listen(port, () => console.log(`BOS API listening on port ${port}`));
  return server;
}

if (require.main === module) startServer();
module.exports = { requestHandler, startServer, authenticate };
