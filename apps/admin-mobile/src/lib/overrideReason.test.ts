import { overrideReasonError } from './overrideReason';

if (overrideReasonError('') == null) throw new Error('empty reason must fail');
if (overrideReasonError('short') == null) throw new Error('short reason must fail');
if (overrideReasonError('123456789') == null) throw new Error('9 chars must fail');
if (overrideReasonError('Agreed on WhatsApp') != null) throw new Error('valid reason must pass');

console.log('overrideReason OK');
