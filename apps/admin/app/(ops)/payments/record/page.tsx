'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { useToast } from '@/components/toast';
import { Banner, PageHeader, PrimaryButton, TextAreaField, TextField } from '@/components/ui';
import { apiClient } from '@/lib/admin-api';
import { problemMessage } from '@/lib/problem';

export default function RecordOfflinePage() {
  const router = useRouter();
  const toast = useToast();
  const [jobRef, setJobRef] = useState('');
  const [amount, setAmount] = useState('399');
  const [method, setMethod] = useState('CASH');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: () =>
      apiClient.recordAdminOffline({
        job_card_ref: jobRef,
        amount_minor: Math.round(Number(amount) * 100),
        method,
        reason,
      }),
    onSuccess: (data) => {
      toast.push(`Recorded · audit ${data.audit_id}`);
      router.push('/payments');
    },
    onError: (err) => setError(problemMessage(err)),
  });

  return (
    <div className="max-w-lg">
      <PageHeader title="Record offline payment" />
      {error ? <Banner>{error}</Banner> : null}
      <div className="space-y-4">
        <TextField label="Job card ref" value={jobRef} onChange={(event) => setJobRef(event.target.value)} placeholder="JC-0991" />
        <TextField label="Amount (₹)" value={amount} onChange={(event) => setAmount(event.target.value)} />
        <label className="block text-sm">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Method</span>
          <select value={method} onChange={(event) => setMethod(event.target.value)} className="h-10 w-full rounded-md border border-border px-3">
            <option value="CASH">Cash</option>
            <option value="UPI">UPI</option>
            <option value="BANK">Bank</option>
          </select>
        </label>
        <TextAreaField label="Reason" value={reason} onChange={(event) => setReason(event.target.value)} rows={3} />
        <PrimaryButton disabled={mutation.isPending || reason.trim().length < 10} onClick={() => mutation.mutate()}>
          {mutation.isPending ? 'Recording…' : 'Record payment'}
        </PrimaryButton>
      </div>
    </div>
  );
}
