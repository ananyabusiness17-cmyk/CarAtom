export const IR_CUSTOMER_PROGRESS = [
  'BUILDING',
  'BOOKING_CONFIRMED',
  'VISIT_IN_PROGRESS',
  'ESTIMATE_PENDING',
  'ESTIMATE_APPROVAL_REQUIRED',
  'PARTS_PAYMENT_REQUIRED',
  'REPAIR_BOOKING_REQUIRED',
  'PAYMENT_DUE',
  'COMPLETED',
] as const;

export type IrCustomerProgress = (typeof IR_CUSTOMER_PROGRESS)[number];

export const IR_OFFERING_SLUG = 'inspection-and-repair';
