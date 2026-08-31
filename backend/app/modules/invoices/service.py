from datetime import UTC, datetime
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.common.errors import DomainProblem
from app.config import settings
from app.core.refs import next_invoice_number
from app.modules.bookings.models import Booking
from app.modules.estimates.models import Estimate, EstimateLineItem
from app.modules.field_work.models import JobLabour, JobPart
from app.modules.invoices.models import Invoice, InvoiceLineItem
from app.modules.invoices.pdf_renderer import render_invoice_pdf
from app.modules.invoices.pricing import round_tax
from app.modules.invoices.repository import InvoiceRepository
from app.modules.invoices.schemas import InvoiceLineOut, InvoiceOut, InvoiceSummaryOut
from app.modules.job_cards.models import JobCard
from app.modules.media.storage import get_storage
from app.modules.notifications.models import OutboxEvent
from app.modules.notifications.service import enqueue_intent
from app.modules.payments.repository import PaymentRepository
from app.modules.visits.models import Visit

PDF_TTL_SECONDS = 15 * 60
GST_LABEL = "GST (18%)"


class InvoiceService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.repo = InvoiceRepository(db)
        self.payments = PaymentRepository(db)

    def get_for_booking(
        self, booking_id: str, profile_id: str, *, role: str = "customer"
    ) -> Invoice:
        booking = self._require_booking(booking_id, profile_id, role)
        invoice = self._invoice_for_job(booking)
        if invoice is None:
            raise DomainProblem(404, "NOT_FOUND", "Invoice is not ready yet.")
        return invoice

    def get_by_id(self, invoice_id: str, profile_id: str, *, role: str = "customer") -> Invoice:
        invoice = self.repo.get(invoice_id)
        if invoice is None:
            raise DomainProblem(404, "NOT_FOUND", "Not found.")
        self._require_booking(invoice.booking_id, profile_id, role)
        return invoice

    def issue_for_booking(
        self,
        booking_id: str,
        *,
        force: bool = False,
    ) -> Invoice:
        booking = self.db.get(Booking, booking_id)
        if booking is None:
            raise DomainProblem(404, "NOT_FOUND", "Booking not found.")
        existing = self._invoice_for_job(booking)
        if existing is not None and existing.status != "VOID":
            return existing
        visits = self._visits(booking.job_card_id)
        if not force and not should_auto_issue_invoice(booking, visits):
            raise DomainProblem(
                409,
                "INVOICE_NOT_PAYABLE",
                "Invoice is not ready for this booking.",
            )
        invoice = self._build(booking, visits)
        self.repo.add(invoice)
        self.db.flush()
        self._store_pdf(invoice, booking)
        self.db.add(
            OutboxEvent(
                event_type="invoice.issued",
                payload={"invoice_id": invoice.id, "booking_id": booking.id},
            )
        )
        self._notify_invoice_ready(booking, invoice)
        return invoice

    def apply_allocation(self, invoice: Invoice, amount_minor: int) -> Invoice:
        invoice.paid_minor = min(invoice.total_minor, invoice.paid_minor + amount_minor)
        invoice.balance_minor = max(0, invoice.total_minor - invoice.paid_minor)
        if invoice.balance_minor == 0:
            invoice.status = "PAID"
        elif invoice.paid_minor > 0:
            invoice.status = "PARTIALLY_PAID"
        invoice.updated_at = datetime.now(UTC)
        if invoice.status == "PAID":
            booking = self.db.get(Booking, invoice.booking_id)
            if booking is not None:
                enqueue_intent(
                    self.db,
                    profile_id=booking.profile_id,
                    intent="payment_verified",
                    entity_type="invoice",
                    entity_id=invoice.id,
                    context={
                        "service_name": booking.public_ref,
                        "invoice_id": invoice.id,
                        "booking_id": booking.id,
                    },
                )
                self.db.add(
                    OutboxEvent(
                        event_type="review.prompt",
                        payload={"booking_id": booking.id, "invoice_id": invoice.id},
                    )
                )
        return invoice

    def to_out(self, invoice: Invoice) -> InvoiceOut:
        url = None
        if invoice.pdf_storage_path:
            url = get_storage().create_signed_download(invoice.pdf_storage_path, PDF_TTL_SECONDS)
        actions: list[str] = []
        if invoice.status in {"ISSUED", "PARTIALLY_PAID"} and invoice.balance_minor > 0:
            actions = ["PAY_BALANCE", "DOWNLOAD_PDF", "VIEW_PDF"]
        elif invoice.status == "PAID":
            actions = ["DOWNLOAD_PDF", "VIEW_PDF"]
        return InvoiceOut(
            id=invoice.id,
            booking_id=invoice.booking_id,
            invoice_number=invoice.invoice_number,
            status=invoice.status,
            currency=invoice.currency,
            subtotal_minor=invoice.subtotal_minor,
            tax_minor=invoice.tax_minor,
            total_minor=invoice.total_minor,
            paid_minor=invoice.paid_minor,
            balance_minor=invoice.balance_minor,
            issued_at=invoice.issued_at,
            pdf_download_url=url,
            line_items=[
                InvoiceLineOut(
                    id=line.id,
                    sort_order=line.sort_order,
                    kind=line.kind,
                    label=line.label,
                    quantity=float(line.quantity),
                    unit_price_minor=line.unit_price_minor,
                    amount_minor=line.amount_minor,
                    metadata=line.extra,
                )
                for line in invoice.line_items
            ],
            allowed_actions=actions,
        )

    def summary(self, invoice: Invoice | None) -> InvoiceSummaryOut | None:
        if invoice is None:
            return None
        return InvoiceSummaryOut(
            id=invoice.id,
            status=invoice.status,
            balance_minor=invoice.balance_minor,
            invoice_number=invoice.invoice_number,
        )

    def _build(self, booking: Booking, visits: list[Visit]) -> Invoice:
        job = self.db.get(JobCard, booking.job_card_id)
        estimate = self._accepted_estimate(job)
        parts = self._fitted_parts(booking.job_card_id)
        labour = self._labour(booking.job_card_id)
        raw_lines = derive_invoice_lines(estimate, parts, labour, booking)
        subtotal = sum(item["amount_minor"] for item in raw_lines if item["kind"] != "TAX")
        subtotal, tax, total = round_tax(subtotal)
        paid = self.payments.captured_parts_advance_total(booking.job_card_id)
        paid = min(paid, total)
        balance = max(0, total - paid)
        status = "PAID" if balance == 0 else ("PARTIALLY_PAID" if paid > 0 else "ISSUED")
        invoice = Invoice(
            booking_id=booking.id,
            invoice_number=next_invoice_number(self.db),
            status=status,
            currency="INR",
            subtotal_minor=subtotal,
            tax_minor=tax,
            total_minor=total,
            paid_minor=paid,
            balance_minor=balance,
            issued_at=datetime.now(UTC),
            version=1,
        )
        for index, item in enumerate(raw_lines):
            invoice.line_items.append(
                InvoiceLineItem(
                    sort_order=index,
                    kind=item["kind"],
                    label=item["label"],
                    quantity=Decimal(str(item.get("quantity") or 1)),
                    unit_price_minor=int(item.get("unit_price_minor") or item["amount_minor"]),
                    amount_minor=item["amount_minor"],
                    extra=item.get("metadata"),
                )
            )
        invoice.line_items.append(
            InvoiceLineItem(
                sort_order=len(raw_lines),
                kind="TAX",
                label=GST_LABEL,
                quantity=Decimal("1"),
                unit_price_minor=tax,
                amount_minor=tax,
            )
        )
        return invoice

    def _store_pdf(self, invoice: Invoice, booking: Booking) -> None:
        snapshot = booking.snapshot
        customer = (snapshot.customer_snapshot if snapshot else {}) or {}
        address = (snapshot.address_snapshot if snapshot else {}) or {}
        vehicle = (snapshot.vehicle_snapshot if snapshot else {}) or {}
        phone = str(customer.get("phone") or "")
        pdf = render_invoice_pdf(
            invoice_number=invoice.invoice_number,
            issued_at=invoice.issued_at,
            public_ref=booking.public_ref,
            customer_name=str(customer.get("full_name") or "Customer"),
            phone_masked=_mask_phone(phone),
            address_lines=[
                part
                for part in [
                    address.get("line1"),
                    ", ".join(
                        str(p)
                        for p in (
                            address.get("locality"),
                            address.get("city"),
                            address.get("postal_code"),
                        )
                        if p
                    ),
                ]
                if part
            ],
            vehicle_line=" ".join(
                str(part)
                for part in (vehicle.get("make"), vehicle.get("model"), vehicle.get("year"))
                if part
            )
            or "Vehicle",
            registration=str(vehicle.get("registration") or vehicle.get("reg") or "—"),
            lines=[
                {
                    "kind": line.kind,
                    "label": line.label,
                    "quantity": float(line.quantity),
                    "unit_price_minor": line.unit_price_minor,
                    "amount_minor": line.amount_minor,
                }
                for line in invoice.line_items
            ],
            subtotal_minor=invoice.subtotal_minor,
            tax_minor=invoice.tax_minor,
            total_minor=invoice.total_minor,
            paid_minor=invoice.paid_minor,
            balance_minor=invoice.balance_minor,
            gstin=settings.invoice_gstin,
            legal_name=settings.invoice_legal_name,
            sac=settings.invoice_sac,
        )
        path = f"invoices/{invoice.id}/v{invoice.version}/invoice.pdf"
        try:
            get_storage().upload_bytes(path, pdf, "application/pdf")
            invoice.pdf_storage_path = path
        except Exception:
            invoice.pdf_storage_path = None

    def _notify_invoice_ready(self, booking: Booking, invoice: Invoice) -> None:
        enqueue_intent(
            self.db,
            profile_id=booking.profile_id,
            intent="payment_due",
            entity_type="invoice",
            entity_id=invoice.id,
            context={
                "service_name": booking.public_ref,
                "invoice_id": invoice.id,
                "booking_id": booking.id,
            },
        )

    def _require_booking(self, booking_id: str, profile_id: str, role: str) -> Booking:
        booking = self.db.get(Booking, booking_id)
        if booking is None or (booking.profile_id != profile_id and role != "admin"):
            raise DomainProblem(404, "NOT_FOUND", "Not found.")
        return booking

    def _invoice_for_job(self, booking: Booking) -> Invoice | None:
        found = self.repo.get_by_booking(booking.id)
        if found is not None:
            return found
        siblings = self.db.scalars(
            select(Booking.id).where(Booking.job_card_id == booking.job_card_id)
        ).all()
        for sibling_id in siblings:
            found = self.repo.get_by_booking(str(sibling_id))
            if found is not None:
                return found
        return None

    def _visits(self, job_card_id: str) -> list[Visit]:
        return list(self.db.scalars(select(Visit).where(Visit.job_card_id == job_card_id)).all())

    def _fitted_parts(self, job_card_id: str) -> list[JobPart]:
        return list(
            self.db.scalars(
                select(JobPart).where(
                    JobPart.job_card_id == job_card_id, JobPart.readiness_status == "FITTED"
                )
            ).all()
        )

    def _labour(self, job_card_id: str) -> list[JobLabour]:
        return list(
            self.db.scalars(select(JobLabour).where(JobLabour.job_card_id == job_card_id)).all()
        )

    def _accepted_estimate(self, job: JobCard | None) -> Estimate | None:
        if job is None:
            return None
        estimate_id = job.accepted_inspection_estimate_id or job.accepted_estimate_id
        if estimate_id:
            estimate = self.db.get(Estimate, estimate_id)
            if estimate is not None:
                return estimate
        return self.db.scalar(
            select(Estimate)
            .where(Estimate.job_card_id == job.id, Estimate.status.in_({"ACCEPTED", "READY"}))
            .order_by(Estimate.version.desc())
        )


def should_auto_issue_invoice(booking: Booking, visits: list[Visit]) -> bool:
    if not visits:
        return booking.status == "COMPLETED"
    if any(visit.status != "COMPLETED" for visit in visits):
        return False
    has_inspection = any(visit.visit_type == "INSPECTION" for visit in visits)
    has_repair = any(visit.visit_type == "REPAIR" for visit in visits)
    if has_inspection and not has_repair:
        return False
    return True


def derive_invoice_lines(
    estimate: Estimate | None,
    parts: list[JobPart],
    labour: list[JobLabour],
    booking: Booking,
) -> list[dict]:
    estimate_lines = list(estimate.line_items) if estimate is not None else []
    by_label = {_norm(line.label): line for line in estimate_lines if line.kind != "TAX"}
    lines: list[dict] = []

    for line in estimate_lines:
        if line.kind in {"SERVICE", "FEE"} and not line.is_included:
            lines.append(_from_estimate_line(line))

    used = {_norm(item["label"]) for item in lines}
    field_used = False
    for part in parts:
        match = by_label.get(_norm(part.label)) or by_label.get(_norm(part.sku_code))
        if match is None or match.kind not in {"PART", "REPAIR"}:
            continue
        field_used = True
        if _norm(match.label) in used:
            continue
        used.add(_norm(match.label))
        qty = float(part.quantity or 1)
        amount = int(match.amount_minor)
        lines.append(
            {
                "kind": "PART",
                "label": match.label,
                "quantity": qty,
                "unit_price_minor": amount,
                "amount_minor": amount,
                "metadata": {"sku": part.sku_code, "visit_id": part.visit_id},
            }
        )
    for row in labour:
        match = by_label.get(_norm(row.description))
        if match is None or match.kind != "LABOUR":
            continue
        field_used = True
        if _norm(match.label) in used:
            continue
        used.add(_norm(match.label))
        lines.append(_from_estimate_line(match, kind="LABOUR"))

    if not field_used:
        for line in estimate_lines:
            if line.kind in {"TAX", "DISCOUNT"} or line.is_included:
                continue
            if _norm(line.label) in used:
                continue
            used.add(_norm(line.label))
            mapped_kind = (
                line.kind if line.kind in {"SERVICE", "PART", "LABOUR", "FEE"} else "SERVICE"
            )
            lines.append(_from_estimate_line(line, kind=mapped_kind))

    if not lines:
        offering = (booking.snapshot.offering_snapshot if booking.snapshot else {}) or {}
        name = str(offering.get("name") or "Service")
        amount = 0
        if estimate is not None:
            amount = int(estimate.total_minor)
        lines.append(
            {
                "kind": "SERVICE",
                "label": name,
                "quantity": 1,
                "unit_price_minor": amount,
                "amount_minor": amount,
            }
        )
    return lines


def _from_estimate_line(line: EstimateLineItem, *, kind: str | None = None) -> dict:
    return {
        "kind": kind or line.kind,
        "label": line.label,
        "quantity": 1,
        "unit_price_minor": line.amount_minor,
        "amount_minor": line.amount_minor,
    }


def _norm(value: str) -> str:
    return " ".join(value.lower().split())


def _mask_phone(phone: str) -> str:
    digits = "".join(ch for ch in phone if ch.isdigit())
    if len(digits) < 4:
        return "+91 ••••••••••"
    return f"+91 {digits[-10:-8]}{digits[-8:-5]} ••••{digits[-2:]}" if len(digits) >= 10 else phone
