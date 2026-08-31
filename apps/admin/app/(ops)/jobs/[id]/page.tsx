'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { JobStatusBadge } from '@/components/job-status-badge';
import { useToast } from '@/components/toast';
import { Banner, PageHeader, PrimaryButton, SecondaryButton, TextAreaField } from '@/components/ui';
import { LinesTab } from '@/components/job-editor/lines-tab';
import { VisitsTab } from '@/components/job-editor/visits-tab';
import { PartsTab } from '@/components/job-editor/parts-tab';
import { MoneyTab } from '@/components/job-editor/money-tab';
import { useConfirmReason } from '@/hooks/use-confirm-reason';
import { apiClient } from '@/lib/admin-api';
import { problemMessage } from '@/lib/problem';
import { adminKeys } from '@/lib/query-keys';

const TABS = ['Lines', 'Visits', 'Advisor', 'Parts', 'Money', 'Audit'] as const;

export default function JobEditorPage() {
  const params = useParams<{ id: string }>();
  const toast = useToast();
  const client = useQueryClient();
  const { ask, dialog } = useConfirmReason();
  const [tab, setTab] = useState<(typeof TABS)[number]>('Lines');
  const jobQuery = useQuery({
    queryKey: adminKeys.job(params.id),
    queryFn: () => apiClient.getAdminJobCard(params.id),
  });
  const usage = useQuery({
    queryKey: adminKeys.jobUsage(params.id),
    queryFn: () => apiClient.getAdminJobUsage(params.id),
  });
  const audit = useQuery({
    queryKey: adminKeys.audit({ resource_id: params.id }),
    queryFn: () => apiClient.getAdminAuditLogs({ resource_id: params.id }),
  });
  const card = jobQuery.data?.job_card;
  const canMarkPartsReady = card?.status === 'PARTS_PENDING';
  const markPartsReady = useMutation({
    mutationFn: () => apiClient.adminMarkPartsReady(params.id),
    onSuccess: (result) => {
      toast.push(`Parts marked ready · ${result.status}`);
      void client.invalidateQueries({ queryKey: adminKeys.job(params.id) });
      void client.invalidateQueries({ queryKey: adminKeys.jobUsage(params.id) });
    },
  });
  const [concerns, setConcerns] = useState('');
  useEffect(() => {
    if (card) setConcerns(card.concerns.map((row) => row.text).join('\n'));
  }, [card]);

  const patch = useMutation({
    mutationFn: () =>
      apiClient.patchAdminJob(params.id, {
        concerns: concerns
          .split('\n')
          .map((text) => text.trim())
          .filter(Boolean)
          .map((text) => ({ text })),
      }),
    onSuccess: () => {
      toast.push('Job saved');
      void client.invalidateQueries({ queryKey: adminKeys.job(params.id) });
    },
  });

  return (
    <div>
      {dialog}
      <PageHeader
        title={card?.public_ref ?? 'Job'}
        subtitle="Full edit · admin"
        actions={
          <>
            <Link href={`/jobs/${params.id}/estimate`} className="text-sm font-semibold text-brand-strong">
              Open estimate
            </Link>
            <Link href={`/jobs/${params.id}/used`} className="text-sm font-semibold text-brand-strong">
              Parts used on this job
            </Link>
            <Link href={`/jobs/${params.id}/override`} className="text-sm font-semibold text-brand-strong">
              Override
            </Link>
          </>
        }
      />
      {jobQuery.isError ? <Banner>{problemMessage(jobQuery.error)}</Banner> : null}
      <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="space-y-3 rounded-md border border-border bg-surface p-4">
          {card ? <JobStatusBadge status={card.status} /> : null}
          <p className="text-sm">
            Customer {jobQuery.data?.customer_name ?? '—'}
          </p>
          <p className="text-sm text-muted">
            Vehicle {card ? `${card.vehicle_context.make} ${card.vehicle_context.model} ${card.vehicle_context.year}` : '—'}
          </p>
          <p className="text-xs text-muted">Quick links in the header.</p>
        </aside>
        <section>
          <div className="mb-3 flex flex-wrap gap-1 border-b border-border">
            {TABS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setTab(item)}
                className={`h-10 px-3 text-sm font-semibold ${
                  tab === item ? 'border-b-2 border-brand-strong text-brand-strong' : 'text-muted'
                }`}
              >
                {item}
              </button>
            ))}
          </div>
          {tab === 'Lines' ? (
            <div className="space-y-4">
              <TextAreaField
                label="Concerns"
                value={concerns}
                onChange={(event) => setConcerns(event.target.value)}
                rows={3}
              />
              <LinesTab items={card?.items ?? []} />
              <div className="flex flex-wrap gap-2">
                <SecondaryButton disabled={patch.isPending} onClick={() => patch.mutate()}>
                  Confirm bill (called)
                </SecondaryButton>
              </div>
            </div>
          ) : null}
          {tab === 'Visits' ? <VisitsTab jobCardId={params.id} /> : null}
          {tab === 'Advisor' ? (
            <div className="rounded-md border border-border bg-surface p-4 text-sm">
              <p>Advisor case {jobQuery.data?.advisor_case_id ?? 'none'} · {jobQuery.data?.advisor_case_status ?? '—'}</p>
              <p className="mt-2 text-muted">Open in admin mobile</p>
            </div>
          ) : null}
          {tab === 'Parts' ? (
            <div className="space-y-4">
              <PartsTab items={usage.data?.items ?? []} />
              {canMarkPartsReady ? (
                <PrimaryButton
                  disabled={markPartsReady.isPending}
                  onClick={() =>
                    ask({
                      title: 'Mark parts ready?',
                      description:
                        'Customer visit 2 stays blocked until parts are ready. This writes an audited PARTS_READY event.',
                      confirmLabel: 'Mark parts ready',
                      onConfirm: async () => {
                        await markPartsReady.mutateAsync();
                      },
                    })
                  }
                >
                  Mark parts ready
                </PrimaryButton>
              ) : null}
              {markPartsReady.isError ? <Banner>{problemMessage(markPartsReady.error)}</Banner> : null}
            </div>
          ) : null}
          {tab === 'Money' ? (
            <MoneyTab
              estimateTotal={jobQuery.data?.submitted_estimate?.total.amount_minor}
              labourTotal={jobQuery.data?.labour_total_minor}
              partsTotal={jobQuery.data?.parts_total_minor}
              billedPercent={jobQuery.data?.billed_percent}
            />
          ) : null}
          {tab === 'Audit' ? (
            <ul className="grid gap-2 text-sm">
              {(audit.data?.items ?? []).map((row) => (
                <li key={row.id} className="rounded-md border border-border bg-surface px-3 py-2">
                  <p className="font-semibold">{row.command}</p>
                  <p className="text-muted">{row.reason}</p>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      </div>
    </div>
  );
}
