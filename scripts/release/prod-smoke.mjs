#!/usr/bin/env node
/**
 * Post-deploy production smoke. Never prints secrets or internal hostnames.
 *
 *   $env:PROD_API_URL = "https://api.caratom.in"
 *   $env:PROD_ADMIN_ORIGIN = "https://admin.caratom.in"
 *   node scripts/release/prod-smoke.mjs
 */
const API = (process.env.PROD_API_URL ?? process.env.API_BASE_URL ?? 'http://127.0.0.1:8000').replace(
  /\/$/,
  '',
);
const ADMIN_ORIGIN = process.env.PROD_ADMIN_ORIGIN ?? 'https://admin.caratom.in';

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

const healthRes = await fetch(`${API}/health`);
if (!healthRes.ok) {
  fail(`health HTTP ${healthRes.status}`);
} else {
  const health = await healthRes.json();
  const requestId = healthRes.headers.get('x-request-id') || healthRes.headers.get('X-Request-Id');
  if (!requestId) fail('missing X-Request-Id on /health');
  if (health.status !== 'ok') fail(`health status ${health.status}`);
  if (!health.environment) fail('health missing environment');
  if (!health.version) fail('health missing version');
  if (!['ok', 'degraded', 'unavailable'].includes(health.database)) fail('health database field');
  if (!['ok', 'unavailable'].includes(health.redis)) fail('health redis field');
  const blob = JSON.stringify(health).toLowerCase();
  if (blob.includes('postgres://') || blob.includes('redis://') || blob.includes('service_role')) {
    fail('health body looks like it leaked internals');
  }
  console.log(
    JSON.stringify({
      health: health.status,
      environment: health.environment,
      database: health.database,
      redis: health.redis,
      version: health.version,
    }),
  );
}

const catalog = await fetch(`${API}/v1/catalog/home`);
if (![200, 401, 503].includes(catalog.status)) {
  fail(`catalog/home unexpected ${catalog.status}`);
} else {
  console.log(`catalog/home ${catalog.status}`);
}

const preflight = await fetch(`${API}/v1/catalog/home`, {
  method: 'OPTIONS',
  headers: {
    Origin: ADMIN_ORIGIN,
    'Access-Control-Request-Method': 'GET',
  },
});
console.log(`preflight ${preflight.status} origin ${ADMIN_ORIGIN}`);

if (process.exitCode) {
  process.exit(process.exitCode);
}
