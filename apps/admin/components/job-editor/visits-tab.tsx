'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams } from 'next/navigation';

import { Banner } from '../ui';
import { apiClient } from '@/lib/admin-api';
import { formatIst } from '@/lib/format-ist';
import { problemMessage } from '@/lib/problem';
import { adminKeys } from '@/lib/query-keys';

export function VisitsTab({ jobCardId }: { jobCardId: string }) {
  const dispatch = useQuery({
    queryKey: adminKeys.dispatch,
    queryFn: () => apiClient.getDispatchBoard(),
  });
  const kit = useQuery({
    queryKey: adminKeys.jobKit(jobCardId),
    queryFn: () => apiClient.getAdminJobKit(jobCardId),
  });
  const visits = [
    ...(dispatch.data?.unassigned_jobs ?? []).filter((row) => row.job_card_id === jobCardId),
    ...(dispatch.data?.technicians ?? []).flatMap((tech) =>
      (tech.assigned_visits ?? [])
        .filter((row) => row.job_card_id === jobCardId)
        .map((row) => ({ ...row, tech: tech.name })),
    ),
  ];

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        Assign on the{' '}
        <Link href="/dispatch" className="font-semibold text-brand-strong">
          dispatch board
        </Link>
        . Dropping a visit only changes technician — slot holds stay the booking.
      </p>
      {dispatch.isError ? <Banner>{problemMessage(dispatch.error)}</Banner> : null}
      {visits.length === 0 ? <p className="text-sm text-muted">No visit on the board for this job yet.</p> : null}
      <ul className="grid gap-2">
        {visits.map((visit) => (
          <li key={visit.visit_id} className="rounded-md border border-border bg-surface px-3 py-2 text-sm">
            <p className="font-semibold">{visit.visit_window_label ?? 'Window'}</p>
            <p className="text-muted">
              {'status' in visit ? String(visit.status) : 'Unassigned'}
              {'tech' in visit ? ` · ${visit.tech}` : ''}
            </p>
            {'scheduled_start_at' in visit && visit.scheduled_start_at ? (
              <p className="text-xs text-muted">Scheduled {formatIst(visit.scheduled_start_at)}</p>
            ) : null}
          </li>
        ))}
      </ul>
      <div>
        <h3 className="mb-2 text-sm font-bold text-strong">Expected kit</h3>
        {kit.isError ? <Banner>{problemMessage(kit.error)}</Banner> : null}
        {(kit.data?.warnings ?? []).map((warn) => (
          <Banner key={warn} tone="muted">
            {warn}
          </Banner>
        ))}
        {(kit.data?.lines ?? []).length === 0 ? (
          <p className="text-sm text-muted">No catalog kit on this offering.</p>
        ) : (
          <ul className="grid gap-1 text-sm">
            {kit.data?.lines.map((line) => (
              <li key={`${line.sku_code ?? line.label}-${line.line_kind}`}>
                {line.label} · {line.line_kind.toLowerCase()} · qty {line.quantity}
                {line.availability !== 'LABOUR' ? ` · ${line.availability.replace('_', ' ').toLowerCase()}` : ''}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
