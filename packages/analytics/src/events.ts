export const EVENT_SCHEMA_VERSION = 1;

export const CLIENT_EVENTS = [
  'app_opened',
  'session_restored',
  'notification_opened',
  'notifications_viewed',
  'booking_detail_viewed',
  'estimate_viewed',
  'payment_started',
  'offline_banner_shown',
  'service_detail_viewed',
  'service_started',
  'vehicle_context_completed',
  'job_card_started',
  'concern_added',
  'addon_search_used',
  'addon_added',
  'addon_removed',
  'estimate_accepted',
  'estimate_rejected',
  'advisor_required',
  'advisor_call_rescheduled',
  'advisor_confirmed',
  'customer_details_completed',
  'vehicle_finalized',
  'address_selected',
  'slot_viewed',
  'slot_selected',
  'slot_hold_expired',
  'booking_reviewed',
  'booking_confirmed',
  'booking_failed',
  'booking_cancelled',
  'invoice_viewed',
  'payment_verified',
  'payment_failed',
  'review_submitted',
  'support_ticket_created',
] as const;

export const SERVER_EVENTS = [
  'booking_confirmed',
  'payment_verified',
  'notification_delivered',
  'outbox_dead_letter',
] as const;

export const PII_KEYS = new Set([
  'phone',
  'address',
  'reg',
  'registration',
  'payment_id',
  'razorpay_payment_id',
  'image',
  'image_url',
  'url',
  'concern',
  'concerns',
  'email',
  'full_name',
  'name',
  'lat',
  'lng',
]);

export class PiiRejectedError extends Error {
  constructor(key: string) {
    super(`Analytics property "${key}" is not allowed`);
    this.name = 'PiiRejectedError';
  }
}

export function stripPii(
  properties: Record<string, unknown> | undefined,
  options?: { reject?: boolean },
): Record<string, string | number | boolean> {
  const reject = Boolean(options?.reject);
  const out: Record<string, string | number | boolean> = {};
  if (!properties) return out;
  for (const [key, value] of Object.entries(properties)) {
    const lower = key.toLowerCase();
    const looksUrl = typeof value === 'string' && /^https?:\/\//i.test(value);
    const looksPhone = typeof value === 'string' && /^\+?\d{10,}$/.test(value.replace(/\s/g, ''));
    if (PII_KEYS.has(lower) || looksUrl || looksPhone) {
      if (reject) throw new PiiRejectedError(key);
      continue;
    }
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      out[key] = value;
    }
  }
  return out;
}

export type AnalyticsEventName = (typeof CLIENT_EVENTS)[number] | (typeof SERVER_EVENTS)[number] | string;

export type AnalyticsEvent = {
  name: AnalyticsEventName;
  schema_version: number;
  occurred_at: string;
  app_surface?: string;
  session_id?: string;
  properties: Record<string, string | number | boolean>;
};
