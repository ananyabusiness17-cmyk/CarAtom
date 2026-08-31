'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Banner, PageHeader, PrimaryButton, TextField } from '@/components/ui';
import { apiClient } from '@/lib/admin-api';
import { newIdempotencyKey } from '@/lib/idempotency';
import { problemMessage } from '@/lib/problem';
import { adminKeys } from '@/lib/query-keys';
import { useToast } from '@/components/toast';

export default function ReceiveStockPage() {
  const router = useRouter();
  const toast = useToast();
  const inventory = useQuery({
    queryKey: adminKeys.inventory({}),
    queryFn: () => apiClient.listAdminInventory(),
  });
  const [skuId, setSkuId] = useState('');
  const [location, setLocation] = useState('WH');
  const [quantity, setQuantity] = useState('10');
  const [reason, setReason] = useState('Supplier invoice #4421');
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      apiClient.postAdminMovement(
        {
          movement_type: 'RECEIVE',
          sku_id: skuId,
          location_code: location,
          quantity: Number(quantity),
          reason,
        },
        newIdempotencyKey(),
      ),
    onSuccess: (data) => {
      toast.push(`Received. Audit ${data.audit_id}`);
      router.push('/inventory');
    },
    onError: (err) => setError(problemMessage(err)),
  });

  const skus = inventory.data?.items ?? [];

  return (
    <div className="max-w-lg">
      <PageHeader title="Receive stock" subtitle="Warehouse inbound" />
      {error ? <Banner>{error}</Banner> : null}
      <div className="space-y-4">
        <label className="block text-sm">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">SKU</span>
          <select
            value={skuId}
            onChange={(event) => setSkuId(event.target.value)}
            className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm"
          >
            <option value="">Select SKU</option>
            {skus.map((sku) => (
              <option key={sku.id} value={sku.id}>
                {sku.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Location</span>
          <select
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm"
          >
            <option value="WH">WH</option>
            <option value="VAN_A">Van A</option>
            <option value="VAN_B">Van B</option>
          </select>
        </label>
        <TextField label="Quantity" value={quantity} onChange={(event) => setQuantity(event.target.value)} inputMode="numeric" />
        <TextField label="Reason" value={reason} onChange={(event) => setReason(event.target.value)} />
        <PrimaryButton
          disabled={!skuId || reason.trim().length < 1 || mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending ? 'Receiving…' : 'Receive stock'}
        </PrimaryButton>
      </div>
    </div>
  );
}
