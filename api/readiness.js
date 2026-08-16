const { getProductionStore } = require('../packages/persistence/production_store');

module.exports = async (req, res) => {
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  const requestId = req.headers['x-request-id'] || 'readiness';
  if (req.method !== 'GET') {
    res.statusCode = 405;
    return res.end(JSON.stringify({ status: 'not_ready', error: 'METHOD_NOT_ALLOWED', requestId }));
  }
  try {
    const store = await getProductionStore();
    if (!store) {
      res.statusCode = 503;
      return res.end(JSON.stringify({ status: 'not_ready', service: 'bos-api', database: 'not_configured', requestId }));
    }
    await store.pool.query('SELECT 1');
    res.statusCode = 200;
    return res.end(JSON.stringify({ status: 'ready', service: 'bos-api', database: 'ready', requestId }));
  } catch (error) {
    res.statusCode = 503;
    return res.end(JSON.stringify({ status: 'not_ready', service: 'bos-api', database: 'unavailable', requestId }));
  }
};
