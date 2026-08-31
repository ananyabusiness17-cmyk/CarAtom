import { resolvePrimaryRoute } from './bookingCoordinator';
import type { BookingDetailResponse } from '@caratom/contracts';

const base = {
  booking: { id: 'b1', job_card_id: 'jc1', status: 'CONFIRMED', public_ref: 'BK-1' },
  invoice: null,
  allowed_actions: ['CONTACT_SUPPORT'],
  customer_progress: null,
} as unknown as BookingDetailResponse;

if (resolvePrimaryRoute(base) !== '/sos/pick') {
  throw new Error('CONTACT_SUPPORT must open SOS pick');
}

console.log('bookingCoordinator tests passed');
