'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { MoneyCell } from '@/components/money-cell';
import { useToast } from '@/components/toast';
import { Banner, PageHeader, PrimaryButton, SecondaryButton, TextField } from '@/components/ui';
import { useConfirmReason } from '@/hooks/use-confirm-reason';
import { apiClient } from '@/lib/admin-api';
import { newIdempotencyKey } from '@/lib/idempotency';
import { problemMessage } from '@/lib/problem';
import { adminKeys } from '@/lib/query-keys';

type DraftLine = { kind: string; label: string; amountRupees: string };

export default function EstimateEditorPage() {
  const params = useParams<{ id: string }>();
  const toast = useToast();
  const { ask, dialog } = useConfirmReason();
  const job = useQuery({
    queryKey: adminKeys.job(params.id),
    queryFn: () => apiClient.getAdminJobCard(params.id),
  });
  const [lines, setLines] = useState<DraftLine[]>([
    { kind: 'labour', label: 'Labour leak + gas', amountRupees: '1800' },
    { kind: 'part', label: 'Condenser OEM', amountRupees: '4200' },
  ]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const estimate = job.data?.submitted_estimate;
    if (!estimate?.line_items.length) return;
    setLines(
      estimate.line_items.map((line) => ({
        kind: line.kind,
        label: line.label,
        amountRupees: String(line.amount_minor / 100),
      })),
    );
  }, [job.data?.submitted_estimate]);

  function payload() {
    return lines.map((line) => ({
      kind: line.kind,
      label: line.label,
      amount_minor: Math.round(Number(line.amountRupees) * 100),
    }));
  }

  const publish = useMutation({
    mutationFn: (opts: { force: boolean; reason?: string }) =>
      apiClient.publishAdminEstimate(
        params.id,
        {
          lines: payload(),
          advisor_case_id: job.data?.advisor_case_id ?? undefined,
          publish_to_customer: true,
          force_approve: opts.force,
          reason: opts.reason,
        },
        newIdempotencyKey(),
      ),
    onSuccess: () => toast.push('Published to customer'),
    onError: (err) => setError(problemMessage(err)),
  });

  return (
    <div>
      {dialog}
      <PageHeader
        title="Estimate"
        subtitle="Admin edits selling price · technician can propose lines separately"
      />
      {error ? <Banner>{error}</Banner> : null}
      <div className="mb-4 space-y-3">
        {lines.map((line, index) => (
          <div key={index} className="grid gap-2 md:grid-cols-[1fr_140px]">
            <TextField
              label="Line"
              value={line.label}
              onChange={(event) =>
                setLines((prev) => prev.map((row, i) => (i === index ? { ...row, label: event.target.value } : row)))
              }
            />
            <TextField
              label="₹"
              value={line.amountRupees}
              onChange={(event) =>
                setLines((prev) =>
                  prev.map((row, i) => (i === index ? { ...row, amountRupees: event.target.value } : row)),
                )
              }
            />
          </div>
        ))}
      </div>
      <p className="mb-4 text-sm">
        Total{' '}
        <MoneyCell amountMinor={lines.reduce((sum, line) => sum + Math.round(Number(line.amountRupees || 0) * 100), 0)} />
      </p>
      <div className="flex flex-wrap gap-2">
        <PrimaryButton disabled={publish.isPending} onClick={() => publish.mutate({ force: false })}>
          {publish.isPending ? 'Publishing…' : 'Publish to customer'}
        </PrimaryButton>
        <SecondaryButton
          onClick={() =>
            ask({
              title: 'Force-approve this estimate?',
              description: 'Skips customer accept. Reason is audited.',
              confirmLabel: 'Force-approve (on call)',
              onConfirm: async (reason) => {
                await publish.mutateAsync({ force: true, reason });
              },
            })
          }
        >
          Force-approve (on call)
        </SecondaryButton>
      </div>
    </div>
  );
}
