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

function captureException(error, context = {}) {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return false;
  try {
    const parsed = new URL(dsn);
    const projectId = parsed.pathname.replace(/^\//, '');
    const publicKey = parsed.username;
    if (!projectId || !publicKey) return false;
    const endpoint = `${parsed.protocol}//${parsed.host}/api/${projectId}/store/?sentry_version=7&sentry_key=${encodeURIComponent(publicKey)}`;
    const payload = JSON.stringify({
      message: error?.message || String(error),
      level: 'error',
      platform: 'node',
      logger: 'bos-api',
      exception: { values: [{ type: error?.name || 'Error', value: error?.message || String(error), stacktrace: { frames: [] } }] },
      extra: context,
    });
    void fetch(endpoint, { method: 'POST', headers: { 'content-type': 'application/json' }, body: payload }).catch(() => {});
    return true;
  } catch {
    return false;
  }
}

module.exports = { logger, captureException };
