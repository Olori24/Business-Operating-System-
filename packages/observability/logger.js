const pino = require('pino');

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  base: {
    service: 'bos-api',
  },
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'headers.authorization',
      'headers.cookie',
      'accessToken',
      'password',
      'secret',
    ],
    remove: true,
  },
});

module.exports = { logger };
