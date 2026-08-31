'use client';

import { useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';

import { useToast } from '@/components/toast';
import { Banner, GhostButton, PageHeader, PrimaryButton, TextAreaField, TextField } from '@/components/ui';
import { apiClient } from '@/lib/admin-api';
import { newIdempotencyKey } from '@/lib/idempotency';
import { problemMessage } from '@/lib/problem';

const COMMANDS = [
  { id: 'FORCE_STATUS', title: 'Force status → invoiced', hint: 'Aliases INVOICED to COMPLETED after an invoice exists.' },
  { id: 'MOVE_SLOT', title: 'Move slot → Thu 9:00', hint: 'Provide a slot_id in payload.' },
  { id: 'RECORD_OFFLINE_PAYMENT', title: 'Cash / offline → ₹2,100', hint: 'Records cash against this job.' },
  { id: 'DESK_COMPLETE', title: 'Desk complete → Tech phone down', hint: 'Completes the job from desk.' },
] as const;

export default function OverridePage() {
  const params = useParams<{ id: string }>();
  const toast = useToast();
  const [command, setCommand] = useState<(typeof COMMANDS)[number]['id']>('FORCE_STATUS');
  const [reason, setReason] = useState('Agreed condenser on WhatsApp');
  const [target, setTarget] = useState('INVOICED');
  const [amount, setAmount] = useState('2100');
  const [error, setError] = useState<string | null>(null);
  const [auditId, setAuditId] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (cmd: string) =>
      apiClient.applyAdminOverride(
        params.id,
        {
          command: cmd,
          target_status: cmd === 'FORCE_STATUS' ? target : undefined,
          reason,
          payload:
            cmd === 'RECORD_OFFLINE_PAYMENT'
              ? { amount_minor: Math.round(Number(amount) * 100), method: 'CASH' }
              : {},
        },
        newIdempotencyKey(),
      ),
    onSuccess: (data) => {
      setAuditId(data.audit_id);
      toast.push(`Override applied · audit ${data.audit_id}`);
    },
    onError: (err) => setError(problemMessage(err)),
  });

  return (
    <div>
      <PageHeader title="Override" subtitle="Omnipotent · reason required · audit log" />
      {error ? <Banner>{error}</Banner> : null}
      {auditId ? (
        <Banner tone="ok">
          Applied.{' '}
          <Link className="font-semibold underline" href={`/audit?resource_id=${params.id}`}>
            Open audit
          </Link>
        </Banner>
      ) : null}
      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        {COMMANDS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setCommand(item.id)}
            className={`rounded-md border p-4 text-left ${
              command === item.id ? 'border-brand bg-brand-soft' : 'border-border bg-surface'
            }`}
          >
            <p className="font-semibold text-strong">{item.title}</p>
            <p className="mt-1 text-sm text-muted">{item.hint}</p>
          </button>
        ))}
      </div>
      {command === 'FORCE_STATUS' ? (
        <TextField label="Target status" value={target} onChange={(event) => setTarget(event.target.value)} className="mb-3 max-w-xs" />
      ) : null}
      {command === 'RECORD_OFFLINE_PAYMENT' ? (
        <TextField label="Amount ₹" value={amount} onChange={(event) => setAmount(event.target.value)} className="mb-3 max-w-xs" />
      ) : null}
      <TextAreaField label="Reason" value={reason} onChange={(event) => setReason(event.target.value)} rows={3} />
      <div className="mt-4 flex flex-wrap gap-2">
        <PrimaryButton disabled={mutation.isPending || reason.trim().length < 10} onClick={() => mutation.mutate(command)}>
          {mutation.isPending ? 'Applying…' : 'Apply override'}
        </PrimaryButton>
        <GhostButton
          onClick={() =>
            mutation.mutate('CANCEL_JOB')
          }
        >
          Cancel job
        </GhostButton>
      </div>
    </div>
  );
}
