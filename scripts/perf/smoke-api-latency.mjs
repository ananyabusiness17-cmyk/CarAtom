#!/usr/bin/env node
/**
 * Smoke p50/p95 latency for catalog, job-card, and slots.
 * Catalog target (doc 17): p95 < 500ms.
 *
 * Usage:
 *   node scripts/perf/smoke-api-latency.mjs
 * Env:
 *   API_BASE_URL (default http://127.0.0.1:8000)
 *   SMOKE_TOKEN optional Bearer token for authenticated paths
 *   SMOKE_JOB_CARD_ID optional job card UUID
 *   SMOKE_ITERS (default 100)
 */
const BASE = (process.env.API_BASE_URL ?? 'http://127.0.0.1:8000').replace(/\/$/, '');
const TOKEN = process.env.SMOKE_TOKEN;
const JOB = process.env.SMOKE_JOB_CARD_ID;
const ITERS = Number(process.env.SMOKE_ITERS ?? 100);

function percentile(sorted, p) {
  if (!sorted.length) return null;
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[index];
}

async function timeRoute(path, auth) {
  const headers = {};
  if (auth && TOKEN) headers.Authorization = `Bearer ${TOKEN}`;
  const started = performance.now();
  const response = await fetch(`${BASE}${path}`, { headers });
  const latency = performance.now() - started;
  return { ok: response.ok, status: response.status, latency };
}

async function measure(name, path, auth) {
  const samples = [];
  let failures = 0;
  for (let i = 0; i < ITERS; i += 1) {
    try {
      const result = await timeRoute(path, auth);
      if (!result.ok) failures += 1;
      samples.push(result.latency);
    } catch {
      failures += 1;
    }
  }
  samples.sort((a, b) => a - b);
  const p50 = percentile(samples, 50);
  const p95 = percentile(samples, 95);
  return {
    name,
    path,
    n: samples.length,
    failures,
    p50_ms: p50 == null ? null : Number(p50.toFixed(1)),
    p95_ms: p95 == null ? null : Number(p95.toFixed(1)),
  };
}

const rows = [];
rows.push(await measure('catalog_home', '/v1/catalog/home', false));
if (TOKEN && JOB) {
  rows.push(await measure('job_card', `/v1/job-cards/${JOB}`, true));
  const from = new Date().toISOString();
  const to = new Date(Date.now() + 3 * 86400000).toISOString();
  rows.push(await measure('slots', `/v1/job-cards/${JOB}/slots?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, true));
} else {
  console.log('Skipping job-card and slots (set SMOKE_TOKEN and SMOKE_JOB_CARD_ID).');
}

console.table(rows);
const catalog = rows.find((row) => row.name === 'catalog_home');
if (catalog?.p95_ms != null && catalog.p95_ms >= 500) {
  console.error(`Catalog p95 ${catalog.p95_ms}ms exceeds 500ms target (doc 17).`);
  process.exitCode = 1;
}
