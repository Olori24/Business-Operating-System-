const { requestHandler } = require('../apps/api/server');

module.exports = (req, res) => requestHandler(req, res);
