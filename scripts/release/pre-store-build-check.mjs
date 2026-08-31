#!/usr/bin/env node
/**
 * Fail if customer/technician/admin-mobile source still points at staging hosts
 * or embeds a service-role key name assignment.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = new URL('../..', import.meta.url);
const ROOT_PATH = decodeURIComponent(ROOT.pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const APPS = ['apps/customer', 'apps/technician', 'apps/admin-mobile', 'apps/admin'];
const SKIP = new Set(['node_modules', '.expo', '.next', 'dist']);
const FORBIDDEN = [
  /api-staging\.caratom\.in/i,
  /SUPABASE_SERVICE_ROLE_KEY\s*=/,
];

const hits = [];

function walk(dir) {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const full = join(dir, name);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      walk(full);
      continue;
    }
    if (!/\.(tsx?|jsx?|json|env\.example|env\.production\.example)$/.test(name)) continue;
    const text = readFileSync(full, 'utf8');
    for (const pattern of FORBIDDEN) {
      if (pattern.test(text) && !full.includes('.env.example')) {
        hits.push(`${relative(ROOT_PATH, full)} matches ${pattern}`);
      }
    }
  }
}

for (const app of APPS) {
  walk(join(ROOT_PATH, app));
}

if (hits.length) {
  console.error(hits.join('\n'));
  process.exit(1);
}
console.log('pre-store-build-check: ok');
