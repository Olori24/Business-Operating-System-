const http = require('node:http');

const port = Number(process.env.PORT || 3000);

function requestHandler(req, res) {
  if (req.method === 'GET' && req.url === '/health') {
    const body = JSON.stringify({ status: 'ok', service: 'bos-api' });
    res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
    res.end(body);
    return;
  }

  if (req.method === 'GET' && req.url === '/') {
    const body = JSON.stringify({ name: 'Business Operating System', status: 'running' });
    res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
    res.end(body);
    return;
  }

  res.writeHead(404, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({ error: 'Not found' }));
}

const server = http.createServer(requestHandler);

server.listen(port, () => {
  console.log(`BOS API listening on port ${port}`);
});

module.exports = { requestHandler };
