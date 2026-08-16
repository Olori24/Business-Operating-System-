const readiness = require('./readiness');

module.exports = (req, res) => readiness(req, res);
