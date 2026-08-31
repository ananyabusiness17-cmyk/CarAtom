import { isHoldExpired, isStaleEstimate } from './staleGuards';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

assert(isStaleEstimate('abc', 'def') === true, 'different hashes are stale');
assert(isStaleEstimate('abc', 'abc') === false, 'matching hashes are current');
assert(isStaleEstimate(null, 'abc') === false, 'missing local hash is not stale');
assert(isHoldExpired('HOLD_EXPIRED') === true, 'hold expired');
assert(isHoldExpired('SLOT_UNAVAILABLE') === true, 'slot unavailable');
assert(isHoldExpired('OK') === false, 'other codes pass');

console.log('recovery helper tests passed');
