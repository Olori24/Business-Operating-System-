const { requestHandler } = require('../../apps/api/server');

module.exports = (req, res) => {
  req.url = '/api/v1/meta';
  return requestHandler(req, res);
};
