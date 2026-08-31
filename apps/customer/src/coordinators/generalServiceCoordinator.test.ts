import { nextRouteFromDecision } from './generalServiceCoordinator';
import type { FlowDecision } from '@caratom/contracts';

const ctx = { jobCardId: 'jc-1', bookingId: 'bk-1' };

function decision(action: string, extra: Partial<FlowDecision> = {}): FlowDecision {
  return {
    policy: 'GENERAL_SERVICE',
    advisor_requirement: 'NOT_REQUIRED',
    estimate_requirement: 'PRE_BOOKING',
    required_next_action: action,
    allowed_actions: [action],
    blocking_reasons: [],
    ...extra,
  };
}

const accept = nextRouteFromDecision(decision('ACCEPT_ESTIMATE'), ctx);
if (accept !== '/job-card/jc-1/estimate') {
  throw new Error(`ACCEPT_ESTIMATE routed to ${accept}`);
}

const finalize = nextRouteFromDecision(decision('FINALIZE'), ctx);
if (finalize !== '/checkout/details?jobCardId=jc-1') {
  throw new Error(`FINALIZE routed to ${finalize}`);
}

const slot = nextRouteFromDecision(decision('SELECT_SLOT'), ctx);
if (slot !== '/checkout/slot?jobCardId=jc-1') {
  throw new Error(`SELECT_SLOT routed to ${slot}`);
}

const confirm = nextRouteFromDecision(decision('CONFIRM_BOOKING'), ctx);
if (confirm !== '/checkout/slot?jobCardId=jc-1') {
  throw new Error(`CONFIRM_BOOKING routed to ${confirm}`);
}

const booking = nextRouteFromDecision(decision('VIEW_BOOKING'), ctx);
if (booking !== '/booking/bk-1') {
  throw new Error(`VIEW_BOOKING routed to ${booking}`);
}

const stay = nextRouteFromDecision(decision('REQUEST_ESTIMATE'), ctx);
if (stay !== null) {
  throw new Error('REQUEST_ESTIMATE should stay on the job card screen');
}

(globalThis as { __DEV__?: boolean }).__DEV__ = true;
let threw = false;
try {
  nextRouteFromDecision(decision('FINALIZE', { advisor_requirement: 'REQUIRED_NOW' }), ctx);
} catch (err) {
  threw = err instanceof Error && err.message.includes('Advisor');
}
if (!threw) {
  throw new Error('Coordinator must refuse advisor on the general service path');
}

console.log('generalServiceCoordinator OK');
