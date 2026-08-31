import { z } from 'zod';

export const NotificationSchema = z.object({
  id: z.string(),
  kind: z.string(),
  intent: z.string().optional(),
  title: z.string(),
  body: z.string(),
  deep_link: z.string().nullable().optional(),
  deep_link_path: z.string().optional(),
  resource_type: z.string().nullable().optional(),
  resource_id: z.string().nullable().optional(),
  entity_type: z.string().optional(),
  entity_id: z.string().optional(),
  read_at: z.string().nullable().optional(),
  created_at: z.string(),
  delivery_status: z.enum(['pending', 'delivered', 'failed']).optional(),
});
export type Notification = z.infer<typeof NotificationSchema>;

export const NotificationListSchema = z.object({
  data: z.array(NotificationSchema),
  meta: z.object({
    next_cursor: z.string().nullable().optional(),
    unread_count: z.number().int().optional(),
    has_more: z.boolean().optional(),
  }),
});
export type NotificationList = z.infer<typeof NotificationListSchema>;

export const DevicePushTokenSchema = z.object({
  id: z.string(),
  revoked_at: z.string().nullable().optional(),
  last_seen_at: z.string(),
});
export type DevicePushToken = z.infer<typeof DevicePushTokenSchema>;

export const OutboxEventSchema = z.object({
  id: z.string(),
  channel: z.string(),
  event_type: z.string(),
  status: z.string(),
  attempt_count: z.number().int(),
  last_error_code: z.string().nullable().optional(),
  last_error_message: z.string().nullable().optional(),
  created_at: z.string(),
  available_at: z.string(),
  payload: z.record(z.unknown()),
  notification_id: z.string().nullable().optional(),
});
export type OutboxEvent = z.infer<typeof OutboxEventSchema>;

export const OutboxListSchema = z.object({
  items: z.array(OutboxEventSchema),
  next_cursor: z.string().nullable().optional(),
});
export type OutboxList = z.infer<typeof OutboxListSchema>;

export const MarkAllReadSchema = z.object({
  updated: z.number().int(),
});
export type MarkAllRead = z.infer<typeof MarkAllReadSchema>;

export const AnalyticsIngestSchema = z.object({
  accepted: z.number().int(),
});

export const OutboxRetryResponseSchema = z.object({
  id: z.string(),
  status: z.string(),
});

export const DeviceTokenRevokeSchema = z.object({
  revoked: z.boolean(),
});
