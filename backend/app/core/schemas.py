from datetime import datetime

from pydantic import BaseModel, Field


class FlowDecisionSchema(BaseModel):
    policy: str
    advisor_requirement: str
    estimate_requirement: str
    required_next_action: str
    allowed_actions: list[str]
    blocking_reasons: list[str] = Field(default_factory=list)
    estimate_version_id: str | None = None
    expires_at: datetime | None = None
    customer_progress: str | None = None
