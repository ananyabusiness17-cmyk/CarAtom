import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service — CARATOM',
};

export default function TermsPage() {
  return (
    <article className="space-y-4 text-sm leading-6">
      <h1 className="text-xl font-bold text-strong">Terms of Service</h1>
      <p className="text-muted">Doorstep automotive service in Karnataka. Last updated August 2026.</p>
      <p>
        By requesting an OTP you agree to these terms and the Privacy Policy. Bookings, prices, and slots are
        confirmed by the CARATOM server — the app display is not a contract until the booking is confirmed.
      </p>
      <p>
        Estimates may change after inspection. Payment is due as shown on the invoice (including GST). Cancellations
        and warranty follow the service policy stated on the invoice.
      </p>
      <p>
        Technician and admin apps are issued only to authorised staff. Do not share install links.
      </p>
      <p>
        Support: <a className="font-semibold text-brand-strong" href="mailto:support@caratom.in">support@caratom.in</a>
      </p>
    </article>
  );
}
