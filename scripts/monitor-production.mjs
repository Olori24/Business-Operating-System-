import fs from 'node:fs/promises';
import path from 'node:path';

const baseUrl = process.env.PRODUCTION_URL || 'https://business-operating-system-pied.vercel.app';
const outputPath = process.env.MONITOR_OUTPUT || 'monitor-results/production-smoke.json';
const checks = [];

async function request(route, options = {}) {
  const response = await fetch(`${baseUrl}${route}`, {
    ...options,
    signal: AbortSignal.timeout(15000),
    headers: { accept: 'application/json, text/html', ...(options.headers || {}) },
  });
  return {
    route,
    status: response.status,
    body: await response.text(),
    headers: Object.fromEntries(response.headers.entries()),
  };
}

function check(name, pass, details) {
  checks.push({ name, pass, details });
}

function titleOf(body) {
  return body.match(/<title>([^<]*)<\/title>/i)?.[1] || null;
}

async function main() {
  const pages = [
    ['/', 'BOS — Business Operating System'],
    ['/start', 'BOS — Create your workspace'],
    ['/dashboard', 'BOS — Operations'],
  ];

  for (const [route, expectedTitle] of pages) {
    try {
      const response = await request(route);
      check(`${route} renders`, response.status === 200 && titleOf(response.body) === expectedTitle, `HTTP ${response.status}; title=${titleOf(response.body)}`);
    } catch (error) {
      check(`${route} renders`, false, error.message);
    }
  }

  const jsonChecks = [
    ['/api/health', 200, (body) => body.status === 'ok' && body.service === 'bos-api'],
    ['/api/v1/meta', 200, (body) => body.service === 'bos-api' && body.apiVersion === 'v1' && typeof body.requestId === 'string' && body.requestId.length > 0],
    ['/api/v1/auth/google-config', 200, (body) => typeof body.clientId === 'string' && body.clientId.length > 0],
  ];
  for (const [route, expectedStatus, predicate] of jsonChecks) {
    try {
      const response = await request(route);
      const body = JSON.parse(response.body);
      check(`${route} contract`, response.status === expectedStatus && predicate(body), `HTTP ${response.status}; body=${response.body.slice(0, 300)}`);
    } catch (error) {
      check(`${route} contract`, false, error.message);
    }
  }

  for (const [route, expectedStatus] of [['/api/v1/auth/me', 401], ['/api/v1/auth/register', 405], ['/api/v1/auth/login', 405]]) {
    try {
      const response = await request(route);
      check(`${route} guard`, response.status === expectedStatus, `HTTP ${response.status}; expected ${expectedStatus}`);
    } catch (error) {
      check(`${route} guard`, false, error.message);
    }
  }

  try {
    const startHtml = (await request('/start')).body;
    check('Google script is lazy-loaded', !/<script[^>]+accounts\.google\.com\/gsi\/client[^>]*>/i.test(startHtml), 'no eager Google Identity Services script tag');
    check('Google dynamic loader exists', /function loadGoogleIdentityServices\(\)/.test(startHtml), 'dynamic loader function present');
    check('Google keyboard hook exists', /google\.addEventListener\('focusin',renderGoogle/.test(startHtml), 'focusin trigger present');
    check('Google pointer hook exists', /google\.addEventListener\('pointerover',renderGoogle/.test(startHtml), 'pointerover trigger present');
  } catch (error) {
    check('Google lazy-loader contract', false, error.message);
  }

  const passed = checks.filter((item) => item.pass).length;
  const failed = checks.length - passed;
  const report = {
    monitor: 'production-smoke',
    checkedAt: new Date().toISOString(),
    baseUrl,
    totalChecks: checks.length,
    passed,
    failed,
    errorRate: checks.length ? failed / checks.length : 1,
    checks,
  };
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  if (failed > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
