'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { useToast } from '@/components/toast';
import { Banner, PageHeader, PrimaryButton, TextAreaField, TextField } from '@/components/ui';
import { apiClient } from '@/lib/admin-api';
import { todayIstDateInput } from '@/lib/format-ist';
import { problemMessage } from '@/lib/problem';
import { adminKeys } from '@/lib/query-keys';

export default function RefundsPage() {
  const toast = useToast();
  const today = todayIstDateInput();
  const ledger = useQuery({
    queryKey: adminKeys.ledger({ from: today, to: today }),
    queryFn: () => apiClient.getAdminLedger({ from: today, to: today }),
  });
  const [paymentId, setPaymentId] = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const payments = (ledger.data?.items ?? []).filter((row) => row.payment_id && row.amount_minor > 0);
  const mutation = useMutation({
    mutationFn: () =>
      apiClient.refundAdminPayment(paymentId, {
        amount_minor: amount ? Math.round(Number(amount) * 100) : undefined,
        reason,
      }),
    onSuccess: (data) => toast.push(`Refund ${data.refund_id} · audit ${data.audit_id}`),
    onError: (err) => setError(problemMessage(err)),
  });

  return (
    <div className="max-w-lg">
      <PageHeader title="Refund" subtitle="Reason required. Ledger shows a negative amount." />
      {error ? <Banner>{error}</Banner> : null}
      <div className="space-y-4">
        <label className="block text-sm">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Payment</span>
          <select
            value={paymentId}
            onChange={(event) => setPaymentId(event.target.value)}
            className="h-10 w-full rounded-md border border-border px-3"
          >
            <option value="">Select payment</option>
            {payments.map((row) => (
              <option key={row.id} value={row.payment_id ?? row.id}>
                {row.job_card_ref} · {row.label}
              </option>
            ))}
          </select>
        </label>
        <TextField label="Amount (₹, optional)" value={amount} onChange={(event) => setAmount(event.target.value)} />
        <TextAreaField label="Reason" value={reason} onChange={(event) => setReason(event.target.value)} rows={3} />
        <PrimaryButton disabled={mutation.isPending || !paymentId || reason.trim().length < 10} onClick={() => mutation.mutate()}>
          {mutation.isPending ? 'Refunding…' : 'Issue refund'}
        </PrimaryButton>
      </div>
    </div>
  );
}
