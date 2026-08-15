module.exports = function meta(req, res) {
  const requestId = req.headers['x-request-id'] || crypto.randomUUID();
  res.setHeader('x-request-id', requestId);
  res.status(200).json({
    name: 'Business Operating System',
    service: 'bos-api',
    apiVersion: 'v1',
    requestId
  });
};
