'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';

import { Banner, PageHeader } from '@/components/ui';
import { apiClient } from '@/lib/admin-api';
import { problemMessage } from '@/lib/problem';
import { adminKeys } from '@/lib/query-keys';

function PeopleInner() {
  const params = useSearchParams();
  const router = useRouter();
  const filter = params.get('filter');
  const [q, setQ] = useState('');
  const query = useQuery({
    queryKey: adminKeys.people(q),
    queryFn: () => apiClient.searchAdminPeople(q || undefined),
  });
  const items = (query.data?.items ?? []).filter((row) => {
    if (filter === 'technicians') return row.kind === 'technician';
    return true;
  });

  return (
    <div>
      <PageHeader
        title="People"
        actions={
          <Link
            href="/people/technicians/new"
            className="inline-flex h-10 items-center rounded-md bg-brand-strong px-3 text-sm font-semibold text-white"
          >
            Create technician
          </Link>
        }
      />
      <input
        data-ops-search
        value={q}
        onChange={(event) => setQ(event.target.value)}
        placeholder="Search name or phone"
        className="mb-4 h-10 w-full max-w-md rounded-md border border-border bg-surface px-3 text-sm outline-none ring-brand focus:ring-2"
      />
      {query.isError ? <Banner>{problemMessage(query.error)}</Banner> : null}
      <ul className="grid gap-3 md:grid-cols-2">
        {items.map((row) => {
          const href =
            row.kind === 'technician' && row.technician_id
              ? `/technicians/${row.technician_id}`
              : `/people/customers/${row.id}`;
          return (
            <li key={`${row.kind}-${row.id}`}>
              <button
                type="button"
                onClick={() => router.push(href)}
                className="flex h-full w-full flex-col items-start rounded-md border border-border bg-surface px-4 py-3 text-left hover:bg-brand-soft/50"
              >
                <div className="flex w-full items-center justify-between gap-2">
                  <p className="font-semibold text-strong">{row.display_name}</p>
                  {row.kind === 'technician' ? (
                    <span className="rounded bg-success-soft px-2 py-0.5 text-xs font-semibold text-success">
                      {row.status_chip ?? 'Tech · active'}
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-muted">Customer</span>
                  )}
                </div>
                <p className="mt-1 text-sm text-muted">{row.subtitle}</p>
                {row.masked_phone ? <p className="mt-1 font-mono text-xs text-muted">{row.masked_phone}</p> : null}
              </button>
            </li>
          );
        })}
      </ul>
      {!query.isLoading && items.length === 0 ? <p className="text-sm text-muted">No people match that search.</p> : null}
    </div>
  );
}

export default function PeoplePage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Loading people…</p>}>
      <PeopleInner />
    </Suspense>
  );
}
