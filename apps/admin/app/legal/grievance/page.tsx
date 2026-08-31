import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Grievance officer — CARATOM',
};

export default function GrievancePage() {
  return (
    <article className="space-y-4 text-sm leading-6">
      <h1 className="text-xl font-bold text-strong">Grievance officer</h1>
      <p>
        For DPDP Act complaints, access, correction, or erasure requests, write to the grievance officer.
        Replace the name below with the appointed officer before launch.
      </p>
      <p>
        <span className="font-semibold text-strong">[GRIEVANCE OFFICER NAME]</span>
        <br />
        [LEGAL ENTITY NAME]
        <br />
        [REGISTERED OFFICE, BENGALURU]
      </p>
      <p>
        Email:{' '}
        <a className="font-semibold text-brand-strong" href="mailto:grievance@caratom.in">
          grievance@caratom.in
        </a>
      </p>
      <p className="text-muted">We acknowledge grievances and respond within a reasonable period.</p>
    </article>
  );
}
