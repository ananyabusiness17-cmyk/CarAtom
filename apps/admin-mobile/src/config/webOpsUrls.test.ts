import { jobWebUrl, overrideWebUrl, resolveAdminWebUrl, webOpsUrl } from './webOpsUrls';

const prod = { baseUrl: 'https://admin.caratom.example', isDev: false };
const dev = { baseUrl: 'http://localhost:3000', isDev: true };

if (webOpsUrl('inventory', prod) !== 'https://admin.caratom.example/inventory') {
  throw new Error('inventory path');
}
if (jobWebUrl('11111111-1111-4111-8111-111111111111', prod) == null) {
  throw new Error('job url');
}
if (overrideWebUrl('11111111-1111-4111-8111-111111111111', prod) == null) {
  throw new Error('override url');
}

if (resolveAdminWebUrl('/inventory', { baseUrl: 'javascript:alert(1)', isDev: true }) != null) {
  throw new Error('javascript base must fail');
}
if (resolveAdminWebUrl('/inventory', { baseUrl: 'https://evil.example', isDev: false }) == null) {
  throw new Error('https host matching its own base is the env host');
}
if (resolveAdminWebUrl('https://evil.example/inventory', prod) != null) {
  throw new Error('absolute path must fail');
}
if (resolveAdminWebUrl('/inventory/../etc', prod) != null) {
  throw new Error('traversal must fail');
}
try {
  if (jobWebUrl('../etc', prod) != null) throw new Error('job traversal must fail');
} catch {
  // assertSafeId throws — also acceptable
}
if (jobWebUrl('abc/../def', prod) != null) throw new Error('slash in id must fail');
if (resolveAdminWebUrl('/inventory', { baseUrl: 'http://evil.example', isDev: false }) != null) {
  throw new Error('http in prod must fail');
}
if (webOpsUrl('inventory', dev) !== 'http://localhost:3000/inventory') {
  throw new Error('dev localhost http must pass');
}
if (resolveAdminWebUrl('/inventory', { baseUrl: 'http://127.0.0.1:3000', isDev: true }) == null) {
  throw new Error('dev loopback http must pass');
}

console.log('webOpsUrls OK');
