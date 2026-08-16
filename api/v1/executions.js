const { getProductionStore } = require('../../../packages/persistence/production_store');

module.exports = async (req, res) => {
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  const requestId = req.headers['x-request-id'] || 'executions';
  const tenantId = req.headers['x-tenant-id'];
  if (!tenantId) {
    res.statusCode = 401;
    return res.end(JSON.stringify({ error: { code: 'TENANT_REQUIRED', message: 'x-tenant-id is required', requestId } }));
  }
  if (req.method !== 'GET') {
    res.statusCode = 405;
    return res.end(JSON.stringify({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Use GET for execution history', requestId } }));
  }
  try {
    const store = await getProductionStore();
    if (!store) {
      res.statusCode = 503;
      return res.end(JSON.stringify({ error: { code: 'PERSISTENCE_UNAVAILABLE', message: 'Production database is not configured', requestId } }));
    }
    const executions = await store.repository.all(tenantId, 'execution');
    res.statusCode = 200;
    return res.end(JSON.stringify({ status: 'ok', executions: executions.slice(-100).reverse(), requestId }));
  } catch (error) {
    res.statusCode = 503;
    return res.end(JSON.stringify({ error: { code: 'PERSISTENCE_UNAVAILABLE', message: error.message || 'Database unavailable', requestId } }));
  }
};
