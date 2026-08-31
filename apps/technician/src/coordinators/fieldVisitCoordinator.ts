import type { AllowedAction, TechnicianVisitDetail } from '@caratom/contracts';

export const FIELD_VISIT_STEPS = [
  'Today',
  'Detail',
  'Navigate',
  'Inspect',
  'Service',
  'Parts',
  'Exception',
  'QC',
  'Me',
] as const;

export const FIELD_VISIT_RAIL_LENGTH = 9;

const CTA_PRIORITY: AllowedAction[] = [
  'CHECK_IN',
  'START_SERVICE',
  'START_INSPECTION',
  'SUBMIT_QC',
  'COMPLETE',
  'EN_ROUTE',
];

export function primaryAction(detail: Pick<TechnicianVisitDetail, 'allowed_actions'>): AllowedAction | null {
  for (const action of CTA_PRIORITY) {
    if (detail.allowed_actions.includes(action)) return action;
  }
  return detail.allowed_actions.find((action) => action !== 'VIEW') ?? null;
}

export function nextRouteForVisit(detail: TechnicianVisitDetail): string {
  const actions = detail.allowed_actions;
  if (actions.includes('CHECK_IN') || actions.includes('EN_ROUTE')) {
    return `/visits/${detail.id}/navigate`;
  }
  if (actions.includes('START_INSPECTION') || actions.includes('SUBMIT_INSPECTION')) {
    return `/visits/${detail.id}/inspection`;
  }
  if (actions.includes('START_SERVICE') || actions.includes('RECORD_PARTS') || actions.includes('RECORD_LABOUR')) {
    return `/visits/${detail.id}/service`;
  }
  if (actions.includes('SUBMIT_QC') || actions.includes('COMPLETE')) {
    return `/visits/${detail.id}/qc`;
  }
  return `/visits/${detail.id}`;
}

export function ctaLabel(action: AllowedAction | null): string {
  switch (action) {
    case 'EN_ROUTE':
      return "I'm on the way";
    case 'CHECK_IN':
      return 'Arrived · on site';
    case 'START_INSPECTION':
    case 'SUBMIT_INSPECTION':
      return 'Submit inspection findings';
    case 'START_SERVICE':
      return 'Open navigation';
    case 'SUBMIT_QC':
    case 'COMPLETE':
      return 'Mark visit complete';
    default:
      return 'Open navigation';
  }
}

export function canRaiseException(detail: Pick<TechnicianVisitDetail, 'allowed_actions'>): boolean {
  return detail.allowed_actions.includes('RAISE_EXCEPTION');
}
