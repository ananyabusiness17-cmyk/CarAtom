'use client';

import { useQuery } from '@tanstack/react-query';
import type { CloseoutQueue } from '@caratom/contracts';
import Link from 'next/link';
import { useState } from 'react';

import { Banner, PageHeader } from '@/components/ui';
import { apiClient } from '@/lib/admin-api';
import { problemMessage } from '@/lib/problem';
import { adminKeys } from '@/lib/query-keys';

const QUEUES: { id: CloseoutQueue; label: string }[] = [
  { id: 'estimate_unpublished', label: 'Estimate unpublished' },
  { id: 'invoice_missing', label: 'Invoice missing' },
  { id: 'payment_missing', label: 'Payment missing' },
  { id: 'consume_gap', label: 'Parts without consume' },
  { id: 'qc_incomplete', label: 'QC incomplete' },
];

export default function CloseoutPage() {
  const [queue, setQueue] = useState<CloseoutQueue>('estimate_unpublished');
  const query = useQuery({
    queryKey: adminKeys.closeout(queue),
    queryFn: () => apiClient.getAdminCloseout(queue),
  });

  return (
    <div>
      <PageHeader title="Closeout" subtitle="Office work after the van" />
      <div className="mb-4 flex flex-wrap gap-1">
        {QUEUES.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setQueue(item.id)}
            className={`h-11 px-3 text-sm font-semibold ${
              queue === item.id ? 'border-b-2 border-brand-strong text-brand-strong' : 'text-muted'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
      {query.isError ? <Banner>{problemMessage(query.error)}</Banner> : null}
      {query.isLoading ? <p className="text-sm text-muted">Loading queue…</p> : null}
      {!query.isLoading && (query.data?.items.length ?? 0) === 0 ? (
        <p className="text-sm text-muted">Nothing in this queue.</p>
      ) : null}
      <ul className="grid gap-2">
        {(query.data?.items ?? []).map((item) => (
          <li key={`${item.job_card_id}-${item.queue}-${item.visit_id ?? ''}`}>
            <Link
              href={item.href}
              className="flex h-12 items-center justify-between rounded-md border border-border bg-surface px-3 text-sm"
            >
              <span className="font-semibold text-strong">{item.job_card_ref}</span>
              <span className="text-muted">{item.summary}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
