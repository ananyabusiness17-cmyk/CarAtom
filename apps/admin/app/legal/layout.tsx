import Link from 'next/link';
import type { ReactNode } from 'react';

export default function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-canvas text-text">
      <header className="border-b border-border bg-surface px-4 py-4">
        <p className="text-sm font-bold tracking-tight text-brand-strong">CARATOM</p>
        <nav className="mt-3 flex flex-wrap gap-4 text-sm font-semibold" aria-label="Legal">
          <Link className="text-brand-strong underline-offset-2 hover:underline" href="/legal/privacy">
            Privacy
          </Link>
          <Link className="text-brand-strong underline-offset-2 hover:underline" href="/legal/terms">
            Terms
          </Link>
          <Link className="text-brand-strong underline-offset-2 hover:underline" href="/legal/grievance">
            Grievance
          </Link>
        </nav>
      </header>
      <main className="mx-auto max-w-2xl px-4 py-8">{children}</main>
    </div>
  );
}
