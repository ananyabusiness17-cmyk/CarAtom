'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';

import { useToast } from '@/components/toast';
import { Banner, GhostButton, PageHeader, SecondaryButton } from '@/components/ui';
import { useConfirmReason } from '@/hooks/use-confirm-reason';
import { apiClient } from '@/lib/admin-api';
import { formatIst } from '@/lib/format-ist';
import { problemMessage } from '@/lib/problem';
import { adminKeys } from '@/lib/query-keys';

function pingFresh(iso: string | null | undefined): boolean {
  if (!iso) return false;
  return Date.now() - new Date(iso).getTime() < 5 * 60 * 1000;
}

export default function TechnicianDossierPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const { ask, dialog } = useConfirmReason();
  const query = useQuery({
    queryKey: adminKeys.dossier(params.id),
    queryFn: () => apiClient.getAdminDossier(params.id),
    staleTime: 10_000,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });
  const data = query.data;
  const tech = data?.technician;
  const live = pingFresh(data?.location.last_ping_at);

  return (
    <div>
      {dialog}
      <PageHeader
        title={tech?.display_name ?? 'Technician'}
        actions={
          <>
            <SecondaryButton onClick={() => router.push('/jobs')}>Reassign current job</SecondaryButton>
            <GhostButton
              onClick={() =>
                ask({
                  title: 'Disable technician?',
                  description: 'They will be taken off duty and cannot use technician routes.',
                  confirmLabel: 'Disable technician',
                  onConfirm: async (reason) => {
                    const profileId = tech?.profile_id ?? params.id;
                    const result = await apiClient.disableAdminProfile(profileId, reason);
                    toast.push(`Disabled · audit ${result.audit_id}`);
                  },
                })
              }
            >
              Disable technician
            </GhostButton>
          </>
        }
      />
      {query.isError ? <Banner>{problemMessage(query.error)}</Banner> : null}
      {tech ? (
        <section className="mb-6 rounded-md border border-border bg-surface p-4">
          <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${live ? 'animate-pulse bg-success' : 'bg-muted'}`} aria-hidden />
            <p className="font-bold text-strong">
              {tech.on_duty ? 'On duty' : 'Off duty'} · {tech.van_code ?? 'Van'}
            </p>
          </div>
          <p className="mt-1 text-sm text-muted">
            {(tech.skills ?? []).join(' · ') || 'AC · electrics'} · last ping {formatIst(data?.location.last_ping_at)} ·{' '}
            {data?.location.locality ?? '—'}
          </p>
        </section>
      ) : null}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Today" value={`${data?.today.completed_count ?? 0} / ${data?.today.assigned_count ?? 0} jobs`} />
        <Stat label="Week" value={`${data?.week_stats.jobs_done ?? 0} done`} />
        <Stat label="Rating" value={data?.week_stats.avg_rating != null ? String(data.week_stats.avg_rating) : '—'} />
        <Stat label="On site" value={data?.today.current_job_ref ?? '—'} />
      </div>
      <h2 className="mb-2 text-sm font-bold text-strong">Today</h2>
      <ul className="mb-6 grid gap-2">
        {(data?.today.jobs ?? []).map((job, index) => {
          const rec = job as Record<string, unknown>;
          return (
            <li key={String(rec.visit_id ?? index)} className="flex h-11 items-center justify-between rounded-md border border-border bg-surface px-3 text-sm">
              <span>{String(rec.label ?? rec.job_card_ref)}</span>
              <span className="text-xs font-semibold text-muted">{String(rec.status ?? '')}</span>
            </li>
          );
        })}
      </ul>
      <h2 className="mb-2 text-sm font-bold text-strong">Parts fitted (week)</h2>
      <ul className="grid gap-2">
        {(data?.parts_fitted_week ?? []).map((row) => (
          <li key={row.sku_name} className="flex h-11 items-center justify-between rounded-md border border-border bg-surface px-3 text-sm">
            <span>{row.sku_name}</span>
            <span className="font-semibold tabular-nums">{row.quantity}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-surface px-3 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 text-lg font-bold text-strong">{value}</p>
    </div>
  );
}
