import type { FlowDecision, JobCard } from '@caratom/contracts';

import { nextRouteFromDecision } from './generalServiceCoordinator';
import { routeFromInspectionRepairState } from './inspectionRepairCoordinator';

const ctx = { jobCardId: 'jc-ir', bookingId: 'bk-1' };

function card(
  progress: string,
  extra: Partial<JobCard> = {},
): Pick<JobCard, 'id' | 'customer_progress' | 'parts_status' | 'booking_id' | 'repair_visit_id'> {
  return {
    id: 'jc-ir',
    customer_progress: progress,
    booking_id: 'bk-1',
    ...extra,
  };
}

function decision(action: string, extra: Partial<FlowDecision> = {}): FlowDecision {
  return {
    policy: 'INSPECTION_REPAIR',
    advisor_requirement: 'NOT_REQUIRED',
    estimate_requirement: 'POST_INSPECTION',
    required_next_action: action,
    allowed_actions: [action],
    blocking_reasons: [],
    customer_progress: extra.customer_progress,
    ...extra,
  };
}

const building = routeFromInspectionRepairState({
  jobCard: card('BUILDING', { booking_id: null }),
  flowDecision: decision('FINALIZE', { customer_progress: 'BUILDING' }),
});
if (building !== '/checkout/details?flow=ir&jobCardId=jc-ir') {
  throw new Error(`BUILDING routed to ${building}`);
}

const visit1 = routeFromInspectionRepairState({
  jobCard: card('BOOKING_CONFIRMED'),
  flowDecision: decision('VIEW_BOOKING', { customer_progress: 'BOOKING_CONFIRMED' }),
  bookingId: 'bk-1',
});
if (visit1 !== '/booking/bk-1?phase=visit1') {
  throw new Error(`Visit 1 confirmed routed to ${visit1}`);
}

const visit1Progress = routeFromInspectionRepairState({
  jobCard: card('VISIT_IN_PROGRESS'),
  flowDecision: decision('VIEW_BOOKING', { customer_progress: 'VISIT_IN_PROGRESS' }),
  bookingId: 'bk-1',
});
if (visit1Progress !== '/booking/bk-1?phase=visit1') {
  throw new Error(`Inspection in progress routed to ${visit1Progress}`);
}

const pending = routeFromInspectionRepairState({
  jobCard: card('ESTIMATE_PENDING'),
  flowDecision: decision('VIEW_BOOKING', { customer_progress: 'ESTIMATE_PENDING' }),
});
if (pending !== '/job-card/jc-ir/awaiting-findings') {
  throw new Error(`ESTIMATE_PENDING routed to ${pending}`);
}

const findings = routeFromInspectionRepairState({
  jobCard: card('ESTIMATE_APPROVAL_REQUIRED'),
  flowDecision: decision('ACCEPT_ESTIMATE', {
    customer_progress: 'ESTIMATE_APPROVAL_REQUIRED',
    allowed_actions: ['VIEW_FINDINGS', 'ACCEPT_ESTIMATE'],
  }),
});
if (findings !== '/job-card/jc-ir/findings') {
  throw new Error(`ESTIMATE_APPROVAL_REQUIRED routed to ${findings}`);
}

const advance = routeFromInspectionRepairState({
  jobCard: card('PARTS_PAYMENT_REQUIRED'),
  flowDecision: decision('PAY_PARTS_ADVANCE', { customer_progress: 'PARTS_PAYMENT_REQUIRED' }),
});
if (advance !== '/job-card/jc-ir/parts-advance') {
  throw new Error(`PARTS_PAYMENT_REQUIRED routed to ${advance}`);
}

const partsWait = routeFromInspectionRepairState({
  jobCard: card('REPAIR_BOOKING_REQUIRED', { parts_status: { all_ready: false } }),
  flowDecision: decision('VIEW_PARTS_STATUS', { customer_progress: 'REPAIR_BOOKING_REQUIRED' }),
});
if (partsWait !== '/job-card/jc-ir/parts-pending') {
  throw new Error(`Parts not ready routed to ${partsWait}`);
}

const repairSlot = routeFromInspectionRepairState({
  jobCard: card('REPAIR_BOOKING_REQUIRED', { parts_status: { all_ready: true } }),
  flowDecision: decision('SELECT_REPAIR_SLOT', { customer_progress: 'REPAIR_BOOKING_REQUIRED' }),
});
if (repairSlot !== '/checkout/repair-slot?jobCardId=jc-ir') {
  throw new Error(`Repair booking routed to ${repairSlot}`);
}

const visit2 = routeFromInspectionRepairState({
  jobCard: card('BOOKING_CONFIRMED', { repair_visit_id: 'v-2' }),
  flowDecision: decision('VIEW_BOOKING', { customer_progress: 'BOOKING_CONFIRMED' }),
  bookingId: 'bk-2',
});
if (visit2 !== '/booking/bk-2?phase=visit2') {
  throw new Error(`Visit 2 confirmed routed to ${visit2}`);
}

const repairProgress = routeFromInspectionRepairState({
  jobCard: card('VISIT_IN_PROGRESS', { repair_visit_id: 'v-2' }),
  flowDecision: decision('VIEW_BOOKING', { customer_progress: 'VISIT_IN_PROGRESS' }),
  bookingId: 'bk-2',
});
if (repairProgress !== '/booking/bk-2?view=repair-progress') {
  throw new Error(`Repair progress routed to ${repairProgress}`);
}

const done = routeFromInspectionRepairState({
  jobCard: card('COMPLETED'),
  flowDecision: decision('VIEW_BOOKING', { customer_progress: 'COMPLETED' }),
  bookingId: 'bk-2',
});
if (done !== '/booking/bk-2') {
  throw new Error(`COMPLETED routed to ${done}`);
}

const paymentDue = routeFromInspectionRepairState({
  jobCard: card('PAYMENT_DUE'),
  flowDecision: decision('VIEW_BOOKING', { customer_progress: 'PAYMENT_DUE' }),
  bookingId: 'bk-2',
});
if (paymentDue !== '/booking/bk-2') {
  throw new Error(`PAYMENT_DUE routed to ${paymentDue}`);
}

const gs = nextRouteFromDecision(
  {
    policy: 'GENERAL_SERVICE',
    advisor_requirement: 'NOT_REQUIRED',
    estimate_requirement: 'PRE_BOOKING',
    required_next_action: 'SELECT_SLOT',
    allowed_actions: ['SELECT_SLOT'],
    blocking_reasons: [],
  },
  ctx,
);
if (gs?.includes('inspection') || gs?.includes('repair-slot') || gs?.includes('findings')) {
  throw new Error('General service coordinator must not emit IR routes');
}

console.log('inspectionRepairCoordinator OK');
