import type { FlowDecision, JobCard } from '@caratom/contracts';

export type IrCoordinatorInput = {
  jobCard: Pick<
    JobCard,
    'id' | 'customer_progress' | 'parts_status' | 'booking_id' | 'repair_visit_id'
  >;
  flowDecision: FlowDecision;
  bookingId?: string | null;
  lastIrScreen?: string | null;
};

export function routeFromInspectionRepairState({
  jobCard,
  flowDecision,
  bookingId,
  lastIrScreen,
}: IrCoordinatorInput): string {
  const progress = jobCard.customer_progress ?? flowDecision.customer_progress ?? 'BUILDING';
  const id = jobCard.id;
  const booking = bookingId ?? jobCard.booking_id ?? undefined;
  const repairPresent = Boolean(jobCard.repair_visit_id);
  const partsReady = jobCard.parts_status?.all_ready !== false;

  switch (progress) {
    case 'ESTIMATE_APPROVAL_REQUIRED':
      if (flowDecision.allowed_actions.includes('VIEW_FINDINGS')) {
        return `/job-card/${id}/findings`;
      }
      return `/job-card/${id}/estimate?source=inspection`;
    case 'PARTS_PAYMENT_REQUIRED':
      return `/job-card/${id}/parts-advance`;
    case 'ESTIMATE_PENDING':
      return `/job-card/${id}/awaiting-findings`;
    case 'REPAIR_BOOKING_REQUIRED':
      if (jobCard.parts_status && !jobCard.parts_status.all_ready) {
        return `/job-card/${id}/parts-pending`;
      }
      if (!partsReady) {
        return `/job-card/${id}/parts-pending`;
      }
      return `/checkout/repair-slot?jobCardId=${id}`;
    case 'BOOKING_CONFIRMED':
      if (repairPresent && booking) {
        return `/booking/${booking}?phase=visit2`;
      }
      return booking ? `/booking/${booking}?phase=visit1` : `/inspection-repair/offering`;
    case 'VISIT_IN_PROGRESS':
      if (repairPresent && booking) {
        return `/booking/${booking}?view=repair-progress`;
      }
      return booking ? `/booking/${booking}?phase=visit1` : `/job-card/${id}/awaiting-findings`;
    case 'PAYMENT_DUE':
    case 'COMPLETED':
      return booking ? `/booking/${booking}` : `/job-card/${id}`;
    case 'BUILDING':
    default:
      if (lastIrScreen) return lastIrScreen;
      if (flowDecision.required_next_action === 'FINALIZE') {
        return `/checkout/details?flow=ir&jobCardId=${id}`;
      }
      if (
        flowDecision.required_next_action === 'SELECT_SLOT' ||
        flowDecision.required_next_action === 'CONFIRM_BOOKING'
      ) {
        return `/checkout/inspection-slot?jobCardId=${id}`;
      }
      return '/inspection-repair/offering';
  }
}

export function nextIrRouteFromDecision(
  decision: FlowDecision,
  ctx: { jobCardId: string; bookingId?: string },
): string | null {
  return routeFromInspectionRepairState({
    jobCard: {
      id: ctx.jobCardId,
      customer_progress: decision.customer_progress,
      booking_id: ctx.bookingId,
    },
    flowDecision: decision,
    bookingId: ctx.bookingId,
  });
}
