async def generate_invoice_pdf(ctx: dict, invoice_id: str) -> str:
    from app.db.session import SessionLocal
    from app.modules.bookings.models import Booking
    from app.modules.invoices.repository import InvoiceRepository
    from app.modules.invoices.service import InvoiceService

    db = SessionLocal()
    try:
        invoice = InvoiceRepository(db).get(invoice_id)
        if invoice is None:
            return "missing"
        booking = db.get(Booking, invoice.booking_id)
        if booking is None:
            return "missing-booking"
        InvoiceService(db)._store_pdf(invoice, booking)
        db.commit()
        return invoice.pdf_storage_path or "ok"
    finally:
        db.close()
