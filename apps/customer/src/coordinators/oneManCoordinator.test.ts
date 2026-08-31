import { nextOneManRouteFromDecision } from './oneManCoordinator';
import type { FlowDecision } from '@caratom/contracts';

const ctx = { jobCardId: 'jc-1', bookingId: 'bk-1' };

function decision(action: string): FlowDecision {
  return {
    policy: 'ONE_MAN',
    advisor_requirement: 'NOT_REQUIRED',
    estimate_requirement: 'PRE_BOOKING',
    required_next_action: action,
    allowed_actions: [action],
    blocking_reasons: [],
  };
}

const finalize = nextOneManRouteFromDecision(decision('FINALIZE'), ctx);
if (finalize !== '/checkout/details?jobCardId=jc-1&flow=oneman') {
  throw new Error(`FINALIZE routed to ${finalize}`);
}

const slot = nextOneManRouteFromDecision(decision('SELECT_SLOT'), ctx);
if (slot !== '/checkout/slot?jobCardId=jc-1&flow=oneman') {
  throw new Error(`SELECT_SLOT routed to ${slot}`);
}

const booking = nextOneManRouteFromDecision(decision('VIEW_BOOKING'), ctx);
if (booking !== '/booking/bk-1?flow=oneman') {
  throw new Error(`VIEW_BOOKING routed to ${booking}`);
}

let threw = false;
try {
  nextOneManRouteFromDecision(decision('ACCEPT_ESTIMATE'), ctx);
} catch (err) {
  threw = err instanceof Error && err.message.includes('ACCEPT_ESTIMATE');
}
if (!threw) {
  throw new Error('oneManCoordinator must refuse ACCEPT_ESTIMATE');
}

console.log('oneManCoordinator OK');
