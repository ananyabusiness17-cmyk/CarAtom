from __future__ import annotations

ROLE_CUSTOMER = "customer"
ROLE_TECHNICIAN = "technician"
ROLE_ADMIN = "admin"

# MVP channel matrix (Phase 11). Admin override via FeatureSetting is Phase 12.
_POLICY: dict[str, dict[str, list[str]]] = {
    ROLE_CUSTOMER: {
        "estimate_ready": ["push"],
        "advisor_revised": ["push", "sms", "whatsapp"],
        "advisor_call_requested": ["push"],
        "slot_confirmed": ["push", "sms"],
        "technician_assigned": ["push"],
        "technician_eta": ["push"],
        "payment_due": ["push", "whatsapp"],
        "payment_verified": ["push"],
        "visit_complete": ["push"],
        "parts_advance_due": ["push"],
    },
    ROLE_TECHNICIAN: {
        "visit_assigned": ["push"],
        "visit_updated": ["push"],
        "dispatch_message": ["push"],
        "technician_assigned": ["push"],
    },
    ROLE_ADMIN: {
        "advisor_case_waiting": ["push"],
        "dispatch_override_needed": ["push"],
    },
}

INTENT_KIND: dict[str, str] = {
    "estimate_ready": "ESTIMATE",
    "advisor_revised": "ESTIMATE",
    "advisor_call_requested": "ADVISOR",
    "slot_confirmed": "BOOKING",
    "technician_assigned": "VISIT",
    "technician_eta": "VISIT",
    "payment_due": "PAYMENT",
    "payment_verified": "PAYMENT",
    "visit_complete": "VISIT",
    "parts_advance_due": "PAYMENT",
    "visit_assigned": "VISIT",
    "visit_updated": "VISIT",
    "dispatch_message": "VISIT",
    "advisor_case_waiting": "ADVISOR",
    "dispatch_override_needed": "ADVISOR",
}

APP_SURFACE: dict[str, str] = {
    ROLE_CUSTOMER: "customer",
    ROLE_TECHNICIAN: "technician",
    ROLE_ADMIN: "admin_mobile",
}


def channels_for(intent: str, role: str = ROLE_CUSTOMER) -> list[str]:
    table = _POLICY.get(role) or _POLICY[ROLE_CUSTOMER]
    return list(table.get(intent, ["push"]))


def kind_for(intent: str) -> str:
    return INTENT_KIND.get(intent, "BOOKING")


def app_surface_for(role: str) -> str:
    return APP_SURFACE.get(role, "customer")
