from datetime import datetime

from pydantic import BaseModel, Field


class NotificationOut(BaseModel):
    id: str
    kind: str
    intent: str = ""
    title: str
    body: str
    deep_link: str | None = None
    deep_link_path: str = "caratom://notifications"
    resource_type: str | None = None
    resource_id: str | None = None
    entity_type: str = "unknown"
    entity_id: str = ""
    read_at: datetime | None = None
    created_at: datetime
    delivery_status: str = "pending"


class NotificationListMeta(BaseModel):
    next_cursor: str | None = None
    unread_count: int = 0
    has_more: bool = False


class NotificationListResponse(BaseModel):
    data: list[NotificationOut]
    meta: NotificationListMeta = Field(default_factory=NotificationListMeta)


class DevicePushTokenIn(BaseModel):
    app_surface: str
    expo_push_token: str
    platform: str
    device_id: str | None = None


class DevicePushTokenOut(BaseModel):
    id: str
    revoked_at: datetime | None = None
    last_seen_at: datetime


class OutboxRetryIn(BaseModel):
    reason: str


class AnalyticsEventIn(BaseModel):
    name: str
    schema_version: int = 1
    occurred_at: datetime
    app_surface: str | None = None
    session_id: str | None = None
    properties: dict = Field(default_factory=dict)


class AnalyticsBatchIn(BaseModel):
    events: list[AnalyticsEventIn]
