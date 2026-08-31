import { formatJobsHeader } from './istDate';

const header = formatJobsHeader('2026-08-19', 3);
if (header !== 'Wednesday 19 Aug · 3 jobs') {
  throw new Error(`expected walkthrough date header, got ${header}`);
}
console.log('istDate OK');
