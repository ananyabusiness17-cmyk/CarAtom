import {
  EVENT_SCHEMA_VERSION,
  stripPii,
  type AnalyticsEvent,
  type AnalyticsEventName,
} from './events';

export type AnalyticsSender = (events: AnalyticsEvent[]) => Promise<void>;

export type AnalyticsClientOptions = {
  appSurface: string;
  appVersion: string;
  sessionId: string;
  send: AnalyticsSender;
};

export function createAnalyticsClient(options: AnalyticsClientOptions) {
  return {
    track(name: AnalyticsEventName, properties?: Record<string, unknown>): void {
      const event: AnalyticsEvent = {
        name,
        schema_version: EVENT_SCHEMA_VERSION,
        occurred_at: new Date().toISOString(),
        app_surface: options.appSurface,
        session_id: options.sessionId,
        properties: {
          app_version: options.appVersion,
          ...stripPii(properties),
        },
      };
      void options.send([event]).catch(() => undefined);
    },
  };
}
