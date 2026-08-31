import { DELETE_ACCOUNT_MAILTO, legalBaseUrl } from './legal';

if (legalBaseUrl().endsWith('/')) {
  throw new Error('legal base must not end with slash');
}
if (!DELETE_ACCOUNT_MAILTO.startsWith('mailto:grievance@caratom.in')) {
  throw new Error('erasure path must mail grievance officer');
}
console.log('legal urls OK');
