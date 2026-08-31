import { nextRepairRouteFromDecision, nextRouteForJob } from './serviceRepairCoordinator';
import type { FlowDecision } from '@caratom/contracts';

const ctx = { jobCardId: 'jc-1', bookingId: 'bk-1' };

function decision(action: string, extra: Partial<FlowDecision> = {}): FlowDecision {
  return {
    policy: 'GENERAL_SERVICE',
    advisor_requirement: 'REQUIRED_NOW',
    estimate_requirement: 'PRE_BOOKING',
    required_next_action: action,
    allowed_actions: [action],
    blocking_reasons: [],
    ...extra,
  };
}

const estimate = nextRepairRouteFromDecision(decision('ACCEPT_ESTIMATE'), ctx);
if (estimate !== '/job-card/jc-1/estimate') {
  throw new Error(`ACCEPT_ESTIMATE routed to ${estimate}`);
}

const createCase = nextRepairRouteFromDecision(decision('CREATE_ADVISOR_CASE'), ctx);
if (createCase !== '/job-card/jc-1/advisor-waiting') {
  throw new Error(`CREATE_ADVISOR_CASE routed to ${createCase}`);
}

const wait = nextRepairRouteFromDecision(decision('WAIT_FOR_ADVISOR'), ctx);
if (wait !== '/job-card/jc-1/advisor-waiting') {
  throw new Error(`WAIT_FOR_ADVISOR routed to ${wait}`);
}

const revised = nextRepairRouteFromDecision(decision('ACCEPT_REVISED_ESTIMATE'), ctx);
if (revised !== '/job-card/jc-1/advisor-revised') {
  throw new Error(`ACCEPT_REVISED_ESTIMATE routed to ${revised}`);
}

const deny = nextRepairRouteFromDecision(decision('EDIT_JOB_CARD'), ctx);
if (deny !== '/job-card/jc-1/repairs-cart?mode=deny') {
  throw new Error(`EDIT_JOB_CARD routed to ${deny}`);
}

const finalize = nextRepairRouteFromDecision(decision('FINALIZE', { advisor_requirement: 'NOT_REQUIRED' }), ctx);
if (finalize !== '/checkout/details?jobCardId=jc-1') {
  throw new Error(`FINALIZE routed to ${finalize}`);
}

const slot = nextRepairRouteFromDecision(decision('SELECT_SLOT'), ctx);
if (slot !== '/checkout/slot?jobCardId=jc-1') {
  throw new Error(`SELECT_SLOT routed to ${slot}`);
}

const booking = nextRepairRouteFromDecision(decision('VIEW_BOOKING'), ctx);
if (booking !== '/booking/bk-1') {
  throw new Error(`VIEW_BOOKING routed to ${booking}`);
}

const gs = nextRouteForJob(
  decision('FINALIZE', { advisor_requirement: 'NOT_REQUIRED' }),
  ctx,
  [{ kind: 'SERVICE' }],
);
if (gs !== '/checkout/details?jobCardId=jc-1') {
  throw new Error('Service-only job must reuse the general service checkout route');
}

const mixed = nextRouteForJob(decision('WAIT_FOR_ADVISOR'), ctx, [{ kind: 'SERVICE' }, { kind: 'REPAIR' }]);
if (mixed !== '/job-card/jc-1/advisor-waiting') {
  throw new Error('Repair items must stay on the advisor waiting route');
}

if (
  mixed?.includes('inspect') ||
  mixed?.includes('one-man') ||
  mixed?.includes('sos') ||
  mixed?.includes('repair-slot') ||
  mixed?.includes('parts-advance')
) {
  throw new Error('Repair coordinator must not route to inspection, one-man, or SOS');
}

console.log('serviceRepairCoordinator OK');
