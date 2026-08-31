import { createAnalyticsClient } from '@caratom/analytics';

import { apiClient } from './api';

const sessionId =
  typeof globalThis.crypto?.randomUUID === 'function'
    ? globalThis.crypto.randomUUID()
    : `s-${Date.now()}`;

const analytics = createAnalyticsClient({
  appSurface: 'customer',
  appVersion: '0.0.1',
  sessionId,
  send: async (events) => {
    await apiClient.postAnalyticsEvents(events as unknown as Array<Record<string, unknown>>);
  },
});

type AnalyticsProps = Record<string, string | number | boolean | null | undefined>;

export function track(event: string, props?: AnalyticsProps): void {
  analytics.track(event, props as Record<string, unknown> | undefined);
}
