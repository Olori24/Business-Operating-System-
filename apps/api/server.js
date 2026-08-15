const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { jsonResponse } = require('./http');
const { requestContext, errorPayload } = require('./middleware');

const port = Number(process.env.PORT || 3000);
const apiVersion = 'v1';
const dashboardPath = path.join(__dirname, '..', 'dashboard', 'index.html');
const workflowBuilderPath = path.join(__dirname, '..', 'dashboard', 'workflows.html');

function htmlResponse(res, filePath) {
  try {
    const html = fs.readFileSync(filePath, 'utf8');
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(html);
  } catch {
    jsonResponse(res, 500, { status: 'error', code: 'PAGE_UNAVAILABLE' });
  }
}

function requestHandler(req, res) {
  const { requestId } = requestContext(req);
  res.setHeader('x-request-id', requestId);

  if (req.method === 'GET' && (req.url === '/health' || req.url === '/api/health')) {
    jsonResponse(res, 200, { status: 'ok', service: 'bos-api', requestId });
    return;
  }

  if (req.method === 'GET' && (req.url === '/' || req.url === '/dashboard')) {
    htmlResponse(res, dashboardPath);
    return;
  }

  if (req.method === 'GET' && (req.url === '/workflows' || req.url === '/dashboard/workflows')) {
    htmlResponse(res, workflowBuilderPath);
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
