import { PiiRejectedError, stripPii } from './events';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const clean = stripPii({ intent: 'slot_confirmed', entity_type: 'booking' }, { reject: true });
assert(clean.intent === 'slot_confirmed', 'allowlisted properties pass');

let threw = false;
try {
  stripPii({ phone: '+919876543210' }, { reject: true });
} catch (err) {
  threw = err instanceof PiiRejectedError;
}
assert(threw, 'phone is rejected');

threw = false;
try {
  stripPii({ payment_id: 'pay_123' }, { reject: true });
} catch (err) {
  threw = err instanceof PiiRejectedError;
}
assert(threw, 'payment_id is rejected');

threw = false;
try {
  stripPii({ address: '12 Main St' }, { reject: true });
} catch (err) {
  threw = err instanceof PiiRejectedError;
}
assert(threw, 'address is rejected');

threw = false;
try {
  stripPii({ reg: 'KA01AB1234' }, { reject: true });
} catch (err) {
  threw = err instanceof PiiRejectedError;
}
assert(threw, 'reg is rejected');

threw = false;
try {
  stripPii({ photo: 'https://cdn.example/car.jpg' }, { reject: true });
} catch (err) {
  threw = err instanceof PiiRejectedError;
}
assert(threw, 'image URLs are rejected');

threw = false;
try {
  stripPii({ concern: 'AC not cooling' }, { reject: true });
} catch (err) {
  threw = err instanceof PiiRejectedError;
}
assert(threw, 'raw concerns are rejected');

const stripped = stripPii({ phone: '+91', intent: 'ok' });
assert(stripped.phone === undefined && stripped.intent === 'ok', 'strip mode drops PII');

console.log('analytics PII tests passed');
