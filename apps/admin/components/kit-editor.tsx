'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { Banner, PrimaryButton, SecondaryButton, TextField } from '@/components/ui';
import { apiClient } from '@/lib/admin-api';
import { problemMessage } from '@/lib/problem';
import { adminKeys } from '@/lib/query-keys';

export function KitEditor({
  ownerType,
  ownerId,
}: {
  ownerType: 'SERVICE_OFFERING' | 'REPAIR_OFFERING';
  ownerId: string;
}) {
  const client = useQueryClient();
  const kitQuery = useQuery({
    queryKey: adminKeys.catalogKit(ownerType, ownerId),
    queryFn: () => apiClient.getAdminCatalogKit(ownerType, ownerId),
    enabled: Boolean(ownerId),
  });
  const skuQuery = useQuery({
    queryKey: adminKeys.inventory({}),
    queryFn: () => apiClient.listAdminInventory(),
  });
  const [skuId, setSkuId] = useState('');
  const [qty, setQty] = useState('1');
  const [kind, setKind] = useState<'PART' | 'LABOUR'>('PART');
  const [error, setError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: (lines: { sku_id: string | null; quantity: number; line_kind: 'PART' | 'LABOUR'; label?: string }[]) =>
      apiClient.putAdminCatalogKit({
        owner_type: ownerType,
        owner_id: ownerId,
        lines: lines.map((line) => ({
          sku_id: line.sku_id,
          quantity: line.quantity,
          line_kind: line.line_kind,
          label: line.label,
        })),
      }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: adminKeys.catalogKit(ownerType, ownerId) });
      setError(null);
    },
    onError: (err) => setError(problemMessage(err)),
  });

  const lines = kitQuery.data?.lines ?? [];

  function addLine() {
    const quantity = Number(qty);
    if (!(quantity > 0)) return;
    const next = [
      ...lines.map((line) => ({
        sku_id: line.sku_id ?? null,
        quantity: line.quantity,
        line_kind: line.line_kind,
        label: line.label ?? undefined,
      })),
      {
        sku_id: kind === 'PART' ? skuId || null : null,
        quantity,
        line_kind: kind,
        label: kind === 'LABOUR' ? 'Labour' : undefined,
      },
    ];
    save.mutate(next);
    setSkuId('');
    setQty('1');
  }

  function removeAt(index: number) {
    save.mutate(
      lines
        .filter((_, i) => i !== index)
        .map((line) => ({
          sku_id: line.sku_id ?? null,
          quantity: line.quantity,
          line_kind: line.line_kind,
          label: line.label ?? undefined,
        })),
    );
  }

  if (!ownerId) return null;

  return (
    <section className="mt-8">
      <h2 className="mb-2 text-sm font-bold text-strong">Parts kit</h2>
      <p className="mb-3 text-sm text-muted">Labour lines never consume stock. Customer catalog labels stay unchanged.</p>
      {error ? <Banner>{error}</Banner> : null}
      {kitQuery.isError ? <Banner>{problemMessage(kitQuery.error)}</Banner> : null}
      <ul className="mb-3 grid gap-2">
        {lines.length === 0 ? <li className="text-sm text-muted">No kit lines yet.</li> : null}
        {lines.map((line, index) => (
          <li key={line.id ?? index} className="flex h-11 items-center justify-between rounded-md border border-border bg-surface px-3 text-sm">
            <span>
              {line.line_kind === 'LABOUR' ? 'Labour' : line.sku_name ?? line.sku_code} · qty {line.quantity}
            </span>
            <SecondaryButton onClick={() => removeAt(index)}>Remove</SecondaryButton>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-sm">
          Kind
          <select
            className="mt-1 block h-10 rounded-md border border-border px-2"
            value={kind}
            onChange={(event) => setKind(event.target.value as 'PART' | 'LABOUR')}
          >
            <option value="PART">Part</option>
            <option value="LABOUR">Labour</option>
          </select>
        </label>
        {kind === 'PART' ? (
          <label className="text-sm">
            SKU
            <select
              className="mt-1 block h-10 min-w-[12rem] rounded-md border border-border px-2"
              value={skuId}
              onChange={(event) => setSkuId(event.target.value)}
            >
              <option value="">Select SKU</option>
              {(skuQuery.data?.items ?? []).map((sku) => (
                <option key={sku.id} value={sku.id}>
                  {sku.name} · {sku.sku_code}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <TextField label="Qty" value={qty} onChange={(event) => setQty(event.target.value)} />
        <PrimaryButton disabled={save.isPending || (kind === 'PART' && !skuId)} onClick={addLine}>
          Add line
        </PrimaryButton>
      </div>
    </section>
  );
}
