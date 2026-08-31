import { parseDeepLink } from '@caratom/contracts';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const booking = parseDeepLink('caratom://booking/11111111-1111-4111-8111-111111111111');
assert(booking?.entity === 'booking', 'parses booking scheme');
assert(booking.route === '/booking/11111111-1111-4111-8111-111111111111', 'booking route');

const estimate = parseDeepLink('https://staging.caratom.app/l/e/11111111-1111-4111-8111-111111111111');
assert(estimate?.entity === 'estimate', 'parses universal estimate');
assert(estimate.route === '/job-card/11111111-1111-4111-8111-111111111111/estimate', 'estimate maps to job card');

assert(parseDeepLink('caratom://payment/not-a-uuid') === null, 'rejects invalid id');
assert(parseDeepLink('https://evil.example/l/b/11111111-1111-4111-8111-111111111111') === null, 'rejects unknown host');
assert(parseDeepLink('caratom://support')?.route === '/sos/pick', 'support opens SOS pick');
assert(parseDeepLink('caratom://visit/11111111-1111-4111-8111-111111111111')?.route === '/visits/11111111-1111-4111-8111-111111111111', 'visit maps to technician visit');
assert(
  parseDeepLink('caratom://job-card/11111111-1111-4111-8111-111111111111/findings')?.route ===
    '/job-card/11111111-1111-4111-8111-111111111111/findings',
  'findings path',
);
assert(
  parseDeepLink('caratom://findings/11111111-1111-4111-8111-111111111111')?.route ===
    '/job-card/11111111-1111-4111-8111-111111111111/findings',
  'findings entity',
);

console.log('deep-link parse tests passed');
