import { safeReturnTo } from './safeReturnTo';

if (safeReturnTo('/(ops)/(tabs)/inbox') !== '/(ops)/(tabs)/inbox') {
  throw new Error('in-app path must pass');
}
if (safeReturnTo('//evil.example') !== '/(ops)/(tabs)/inbox') {
  throw new Error('protocol-relative must be rejected');
}
if (safeReturnTo('https://evil.example') !== '/(ops)/(tabs)/inbox') {
  throw new Error('absolute url must be rejected');
}
if (safeReturnTo('http://localhost') !== '/(ops)/(tabs)/inbox') {
  throw new Error('http returnTo must be rejected');
}

console.log('safeReturnTo OK');
