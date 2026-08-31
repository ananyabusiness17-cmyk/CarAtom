'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams } from 'next/navigation';

import { Banner, PageHeader } from '@/components/ui';
import { apiClient } from '@/lib/admin-api';
import { formatIst } from '@/lib/format-ist';
import { problemMessage } from '@/lib/problem';
import { adminKeys } from '@/lib/query-keys';

export default function CustomerPartsPage() {
  const params = useParams<{ id: string }>();
  const query = useQuery({
    queryKey: adminKeys.partsHistory(params.id),
    queryFn: () => apiClient.getAdminPartsHistory(params.id),
  });
  return (
    <div>
      <PageHeader title={`${query.data?.customer_name ?? 'Customer'} · parts`} subtitle="All cars · all jobs" />
      {query.isError ? <Banner>{problemMessage(query.error)}</Banner> : null}
      <div className="space-y-6">
        {(query.data?.vehicles ?? []).map((vehicle) => (
          <section key={vehicle.vehicle_id ?? vehicle.vehicle_label}>
            <h2 className="mb-2 text-sm font-bold text-strong">{vehicle.vehicle_label}</h2>
            {vehicle.jobs.length === 0 ? (
              <p className="rounded-md border border-border bg-surface px-3 py-3 text-sm text-muted">No parts yet</p>
            ) : (
              <ul className="grid gap-2">
                {vehicle.jobs.map((job) => (
                  <li key={job.job_card_id}>
                    <Link
                      href={`/jobs/${job.job_card_id}/used`}
                      className="block rounded-md border border-border bg-surface px-3 py-3 text-sm hover:bg-brand-soft/40"
                    >
                      <p className="font-semibold text-strong">
                        {job.job_card_ref} · {job.sku_labels}
                      </p>
                      <p className="text-muted">{formatIst(job.completed_at, 'd MMM')}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
