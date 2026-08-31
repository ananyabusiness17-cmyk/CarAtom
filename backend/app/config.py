from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_DEV_CORS = [
    "http://localhost:3000",
    "http://localhost:8081",
    "http://localhost:8082",
    "http://localhost:8083",
]
_PROD_CORS = ["https://admin.caratom.in"]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore", case_sensitive=False)

    env: str = "development"
    api_version: str = "1.0.0"
    enable_dev_simulate: bool = False
    sos_stub_dispatch_seconds: int = 90
    sos_ops_phone_e164: str = "+918012345678"

    database_url: str = "postgresql://caratom:caratom_dev@localhost:5432/caratom"
    redis_url: str = "redis://localhost:6379/0"

    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""
    supabase_jwt_audience: str = "authenticated"

    razorpay_key_id: str = ""
    razorpay_key_secret: str = ""
    razorpay_webhook_secret: str = ""
    razorpay_mode: str = "test"
    invoice_pdf_bucket: str = "caratom-invoices"
    invoice_gstin: str = ""
    invoice_legal_name: str = ""
    invoice_sac: str = "998729"

    slot_hold_minutes: int = 15
    slot_capacity: int = 3
    operating_hours: str = "09:00-18:00"

    cors_origins: list[str] = list(_DEV_CORS)

    supabase_storage_bucket_evidence: str = "caratom-evidence"
    signed_upload_ttl_seconds: int = 3600
    max_evidence_bytes: int = 10_485_760
    max_pending_evidence_per_visit: int = 20
    tech_location_ping_min_interval_seconds: int = 30
    dev_auto_assign_technician_id: str = ""

    nominatim_user_agent: str = "CARATOM/1.0 (location; https://caratom.in)"
    nominatim_timeout_seconds: float = 8.0

    sms_provider: str = "fake"
    sms_api_key: str | None = None
    sms_sender_id: str = "CARATM"
    sms_template_id: str | None = None
    whatsapp_provider: str = "fake"
    whatsapp_twilio_account_sid: str | None = None
    whatsapp_twilio_auth_token: str | None = None
    whatsapp_twilio_from: str | None = None
    expo_access_token: str | None = None
    force_real_messaging: bool = False
    fake_messaging_fail_rate: float = 0.0
    notification_max_attempts: int = 8
    outbox_batch_size: int = 50
    staging_link_base: str = "https://staging.caratom.app/l"

    @model_validator(mode="after")
    def production_cors_must_not_be_localhost(self):
        if self.env.lower() != "production":
            return self
        if not self.cors_origins or all(
            "localhost" in origin or "127.0.0.1" in origin for origin in self.cors_origins
        ):
            self.cors_origins = list(_PROD_CORS)
        return self


    @property
    def is_production(self) -> bool:
        return self.env.lower() == "production"


settings = Settings()
