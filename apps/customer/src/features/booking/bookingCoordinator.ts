import type { BookingDetailResponse } from '@caratom/contracts';
import type { Href } from 'expo-router';

const PRIMARY_ORDER = [
  'PAY_BALANCE',
  'PAY_PARTS_ADVANCE',
  'SUBMIT_REVIEW',
  'BOOK_REPAIR_VISIT',
  'CONTACT_SUPPORT',
  'VIEW_INVOICE',
  'DOWNLOAD_PDF',
] as const;

export function pickPrimaryAction(actions: string[] | undefined): string | undefined {
  if (!actions?.length) return undefined;
  return PRIMARY_ORDER.find((item) => actions.includes(item)) ?? actions[0];
}

export function resolvePrimaryRoute(detail: BookingDetailResponse): Href | null {
  const action = pickPrimaryAction(detail.allowed_actions);
  const invoiceId = detail.invoice?.id;
  switch (action) {
    case 'PAY_BALANCE':
    case 'PAY_PARTS_ADVANCE':
    case 'VIEW_INVOICE':
    case 'DOWNLOAD_PDF':
    case 'PAYMENT_PENDING':
      return invoiceId ? `/invoice/${invoiceId}` : null;
    case 'SUBMIT_REVIEW':
      return `/review/${detail.booking.id}`;
    case 'BOOK_REPAIR_VISIT':
      return detail.booking.job_card_id
        ? `/checkout/repair-slot?jobCardId=${detail.booking.job_card_id}`
        : null;
    case 'CONTACT_SUPPORT':
      return '/sos/pick';
    default:
      return null;
  }
}

export function primaryCtaLabel(
  action: string | undefined,
  balanceMinor?: number,
): string | null {
  switch (action) {
    case 'PAY_BALANCE':
      return balanceMinor ? `Pay ₹${Math.round(balanceMinor / 100).toLocaleString('en-IN')}` : 'Pay invoice';
    case 'PAY_PARTS_ADVANCE':
      return 'Pay parts advance';
    case 'VIEW_INVOICE':
      return 'View invoice';
    case 'SUBMIT_REVIEW':
      return 'Rate this service';
    case 'BOOK_REPAIR_VISIT':
      return 'Book repair visit';
    case 'CONTACT_SUPPORT':
      return 'Get help';
    case 'PAYMENT_PENDING':
      return null;
    default:
      return null;
  }
}
