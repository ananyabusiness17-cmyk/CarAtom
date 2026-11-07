import {
  assertDevLocalOtp,
  assertDevLocalPhone,
  DEV_LOCAL_OTP,
  DEV_LOCAL_PHONE,
  isDevLocalAuthEnabled,
  isDevLocalToken,
} from './devLocalAuth';

assertDevLocalPhone(DEV_LOCAL_PHONE);
try {
  assertDevLocalPhone('+919876543210');
  throw new Error('Customer phone must not pass local technician login');
} catch (err) {
  if (!(err instanceof Error) || !err.message.includes('Imran')) {
    throw err;
  }
}

assertDevLocalOtp(DEV_LOCAL_OTP);
try {
  assertDevLocalOtp('000000');
  throw new Error('Wrong OTP must fail');
} catch (err) {
  if (!(err instanceof Error) || !err.message.includes('123456')) {
    throw err;
  }
}

if (isDevLocalAuthEnabled()) {
  throw new Error('tsx tests are not Expo __DEV__; local auth must stay off here');
}
if (!isDevLocalToken('caratom-dev-local.imran')) {
  throw new Error('Dummy local token must be detected');
}
if (isDevLocalToken('eyJhbGciOiJIUzI1NiJ9.e30.sig')) {
  throw new Error('Normal JWT must not look like a dummy local token');
}

console.log('devLocalAuth OK');
