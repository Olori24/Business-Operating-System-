const http = require('node:http');
const { jsonResponse } = require('./http');
const { requestContext, errorPayload } = require('./middleware');

const port = Number(process.env.PORT || 3000);
const apiVersion = 'v1';

function requestHandler(req, res) {
  const { requestId } = requestContext(req);
  res.setHeader('x-request-id', requestId);

  if (req.method === 'GET' && req.url === '/health') {
    jsonResponse(res, 200, { status: 'ok', service: 'bos-api', requestId });
    return;
  }

  if (req.method === 'GET' && req.url === '/') {
    jsonResponse(res, 200, { name: 'Business Operating System', status: 'running', requestId });
    return;
  }

  if (req.method === 'GET' && req.url === '/api/v1/meta') {
    jsonResponse(res, 200, {
      name: 'Business Operating System',
      service: 'bos-api',
      apiVersion,
      requestId
    });
    return;
  }

  jsonResponse(res, 404, errorPayload('NOT_FOUND', 'Route not found', requestId));
}

function startServer() {
  const server = http.createServer(requestHandler);
  server.listen(port, () => {
    console.log(`BOS API listening on port ${port}`);
  });
  return server;
}

if (require.main === module) startServer();

module.exports = { requestHandler, startServer };
