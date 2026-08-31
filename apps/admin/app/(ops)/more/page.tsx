import Link from 'next/link';

import { PageHeader } from '@/components/ui';

const ROWS = [
  { href: '/inventory', label: 'Inventory', note: null },
  { href: '/dispatch', label: 'Dispatch board', note: null },
  { href: '/closeout', label: 'Closeout queues', note: null },
  { href: '/catalog', label: 'Landing photos / copy', note: 'CMS stub' },
  { href: '/notifications/undelivered', label: 'Undelivered notifications', note: null },
  { href: '/catalog/settings', label: 'Service hours & radius', note: null },
  { href: '/audit', label: 'Audit log', note: null },
];

export default function MorePage() {
  return (
    <div>
      <PageHeader title="More" />
      <ul className="divide-y divide-border rounded-md border border-border bg-surface">
        {ROWS.map((row) => (
          <li key={row.label}>
            <Link href={row.href} className="flex h-12 items-center justify-between px-4 text-sm font-semibold text-strong hover:bg-brand-soft/50">
              <span>{row.label}</span>
              <span className="text-muted">{row.note ?? '›'}</span>
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-6 text-sm text-muted">Admin controls the entire company from this app.</p>
      <p className="text-xs text-muted">Desk ops · admin web</p>
    </div>
  );
}
