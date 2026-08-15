module.exports = function health(req, res) {
  const requestId = req.headers['x-request-id'] || crypto.randomUUID();
  res.setHeader('x-request-id', requestId);
  res.status(200).json({ status: 'ok', service: 'bos-api', requestId });
};
