from datetime import datetime
from io import BytesIO

from app.core.time import IST


def gst_footer_line(*, gstin: str | None, sac: str | None) -> str:
    gstin_label = (gstin or "").strip() or "pending registration"
    sac_label = (sac or "").strip()
    line = f"Support: support@caratom.in | GSTIN: {gstin_label}"
    if sac_label:
        line = f"{line} | SAC: {sac_label}"
    return line


def render_invoice_pdf(
    *,
    invoice_number: str,
    issued_at: datetime | None,
    public_ref: str,
    customer_name: str,
    phone_masked: str,
    address_lines: list[str],
    vehicle_line: str,
    registration: str,
    lines: list[dict],
    subtotal_minor: int,
    tax_minor: int,
    total_minor: int,
    paid_minor: int,
    balance_minor: int,
    gstin: str | None = None,
    legal_name: str | None = None,
    sac: str | None = None,
) -> bytes:
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import mm
    from reportlab.pdfgen import canvas
    from reportlab.platypus import Table, TableStyle

    buffer = BytesIO()
    page = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4
    margin = 24 * mm
    y = height - margin

    issued = (issued_at or datetime.now(IST)).astimezone(IST).strftime("%d %b %Y")
    seller = (legal_name or "").strip() or "CARATOM"
    page.setFont("Helvetica-Bold", 16)
    page.drawString(margin, y, seller)
    page.setFont("Helvetica", 11)
    page.drawString(margin, y - 16, "Tax Invoice")
    page.drawRightString(width - margin, y, f"Invoice #: {invoice_number}")
    page.drawRightString(width - margin, y - 14, f"Date: {issued} (IST)")
    page.drawRightString(width - margin, y - 28, f"Booking ref: {public_ref}")
    y -= 56

    page.setFont("Helvetica-Bold", 10)
    page.drawString(margin, y, "Bill to")
    page.setFont("Helvetica", 10)
    y -= 14
    page.drawString(margin, y, customer_name)
    y -= 12
    page.drawString(margin, y, phone_masked)
    for line in address_lines:
        y -= 12
        page.drawString(margin, y, line)
    y -= 20
    page.setFont("Helvetica-Bold", 10)
    page.drawString(margin, y, "Vehicle")
    page.setFont("Helvetica", 10)
    y -= 14
    page.drawString(margin, y, vehicle_line)
    y -= 12
    page.drawString(margin, y, f"Registration: {registration}")
    y -= 24

    data = [["Description", "Qty", "Rate", "Amount"]]
    for item in lines:
        if item.get("kind") == "TAX":
            continue
        qty = item.get("quantity") or 1
        rate = _rupees(int(item.get("unit_price_minor") or item.get("amount_minor") or 0))
        data.append(
            [
                str(item.get("label") or ""),
                str(qty),
                rate,
                _rupees(int(item.get("amount_minor") or 0)),
            ]
        )
    data.append(["Subtotal", "", "", _rupees(subtotal_minor)])
    data.append(["GST (18%)", "", "", _rupees(tax_minor)])
    data.append(["Total", "", "", _rupees(total_minor)])
    if paid_minor:
        data.append(["Paid", "", "", _rupees(paid_minor)])
        data.append(["Balance due", "", "", _rupees(balance_minor)])

    table = Table(data, colWidths=[90 * mm, 20 * mm, 30 * mm, 30 * mm])
    table.setStyle(
        TableStyle(
            [
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
                ("LINEBELOW", (0, 0), (-1, 0), 0.4, colors.HexColor("#E6E2DC")),
                ("LINEABOVE", (0, -3), (-1, -3), 0.4, colors.HexColor("#E6E2DC")),
                ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
            ]
        )
    )
    _, table_height = table.wrap(width - 2 * margin, y)
    table.drawOn(page, margin, y - table_height)

    footer = y - table_height - 36
    page.setFont("Helvetica", 8)
    page.drawString(margin, footer, "Thank you for choosing CARATOM doorstep service.")
    page.drawString(margin, footer - 12, gst_footer_line(gstin=gstin, sac=sac))
    page.drawString(margin, footer - 24, "Warranty terms apply as per service policy.")
    page.drawString(margin, footer - 36, "This is a computer-generated invoice.")
    page.showPage()
    page.save()
    return buffer.getvalue()


def _rupees(amount_minor: int) -> str:
    return f"Rs {round(amount_minor / 100):,}"
