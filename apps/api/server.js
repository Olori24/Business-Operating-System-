const http = require('node:http');
const { jsonResponse } = require('./http');

const port = Number(process.env.PORT || 3000);
const apiVersion = 'v1';

function requestHandler(req, res) {
  if (req.method === 'GET' && req.url === '/health') {
    jsonResponse(res, 200, { status: 'ok', service: 'bos-api' });
    return;
  }

  if (req.method === 'GET' && req.url === '/') {
    jsonResponse(res, 200, { name: 'Business Operating System', status: 'running' });
    return;
  }

  if (req.method === 'GET' && req.url === '/api/v1/meta') {
    jsonResponse(res, 200, {
      name: 'Business Operating System',
      service: 'bos-api',
      apiVersion
    });
    return;
  }

  jsonResponse(res, 404, { error: 'Not found' });
}

function startServer() {
  const server = http.createServer(requestHandler);
  server.listen(port, () => {
    console.log(`BOS API listening on port ${port}`);
  });
  return server;
}

if (require.main === module) {
  startServer();
}

module.exports = { requestHandler, startServer };
