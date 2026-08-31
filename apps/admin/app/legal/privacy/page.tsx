import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy — CARATOM',
};

export default function PrivacyPage() {
  return (
    <article className="space-y-4 text-sm leading-6">
      <h1 className="text-xl font-bold text-strong">Privacy Policy</h1>
      <p className="text-muted">India · Digital Personal Data Protection Act, 2023. Last updated August 2026.</p>
      <p>
        CARATOM ([LEGAL ENTITY NAME], Bengaluru) provides doorstep automotive service. We collect your phone
        number to create an account and send OTP, and your name, address, and vehicle details to fulfil a
        booking. We do not store card PAN; payments are processed by Razorpay.
      </p>
      <p>
        Technician location pings are kept 90 days. In-app notifications are kept 180 days. Financial invoices
        and audit logs are retained as required for GST. You can correct your name in the app and request
        erasure via the grievance officer.
      </p>
      <p>
        We do not sell personal data. Service providers (Supabase, Railway, Razorpay, Expo Push, SMS if DLT
        registered) process data to run the service. CARATOM is not directed at children under 18.
      </p>
      <p>
        Contact: <a className="font-semibold text-brand-strong" href="mailto:grievance@caratom.in">grievance@caratom.in</a>
      </p>
    </article>
  );
}
