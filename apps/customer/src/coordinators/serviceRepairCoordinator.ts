import type { FlowDecision } from '@caratom/contracts';

import { nextRouteFromDecision, queryKeys as gsKeys } from './generalServiceCoordinator';

export const queryKeys = {
  ...gsKeys,
  repairOfferings: (params: Record<string, string | number | undefined>) =>
    ['repair-offerings', params] as const,
  advisorCase: (jobCardId: string) => ['advisor-case', jobCardId] as const,
};

export type DecisionContext = {
  jobCardId: string;
  bookingId?: string;
};

export function nextRepairRouteFromDecision(
  decision: FlowDecision,
  ctx: DecisionContext,
): string | null {
  switch (decision.required_next_action) {
    case 'ACCEPT_ESTIMATE':
      return `/job-card/${ctx.jobCardId}/estimate`;
    case 'CREATE_ADVISOR_CASE':
    case 'WAIT_FOR_ADVISOR':
    case 'VIEW_ADVISOR_STATUS':
      return `/job-card/${ctx.jobCardId}/advisor-waiting`;
    case 'ACCEPT_REVISED_ESTIMATE':
    case 'REJECT_REVISED_ESTIMATE':
      return `/job-card/${ctx.jobCardId}/advisor-revised`;
    case 'EDIT_JOB_CARD':
      return `/job-card/${ctx.jobCardId}/repairs-cart?mode=deny`;
    case 'FINALIZE':
      return `/checkout/details?jobCardId=${ctx.jobCardId}`;
    case 'SELECT_SLOT':
    case 'CONFIRM_BOOKING':
      return `/checkout/slot?jobCardId=${ctx.jobCardId}`;
    case 'VIEW_BOOKING':
      return ctx.bookingId ? `/booking/${ctx.bookingId}` : null;
    default:
      return null;
  }
}

export function hasRepairItems(items: { kind: string }[] | undefined): boolean {
  return Boolean(items?.some((item) => item.kind === 'REPAIR'));
}

export function nextRouteForJob(
  decision: FlowDecision,
  ctx: DecisionContext,
  items?: { kind: string }[],
): string | null {
  if (hasRepairItems(items) || decision.advisor_requirement !== 'NOT_REQUIRED') {
    return nextRepairRouteFromDecision(decision, ctx);
  }
  return nextRouteFromDecision(decision, ctx);
}
