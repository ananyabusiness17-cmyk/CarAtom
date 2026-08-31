'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';

import { Banner, PageHeader, SecondaryButton } from '@/components/ui';
import { useConfirmReason } from '@/hooks/use-confirm-reason';
import { apiClient } from '@/lib/admin-api';
import { newIdempotencyKey } from '@/lib/idempotency';
import { problemMessage } from '@/lib/problem';
import { adminKeys } from '@/lib/query-keys';
import { useToast } from '@/components/toast';

export default function JobUsedPartsPage() {
  const params = useParams<{ id: string }>();
  const toast = useToast();
  const client = useQueryClient();
  const { ask, dialog } = useConfirmReason();
  const query = useQuery({
    queryKey: adminKeys.jobUsage(params.id),
    queryFn: () => apiClient.getAdminJobUsage(params.id),
  });
  const data = query.data;

  return (
    <div>
      {dialog}
      <PageHeader
        title={`Used · ${data?.job_card_ref ?? ''}`}
        subtitle={`${data?.customer_name ?? ''} · ${data?.vehicle_summary ?? ''} · fitted by ${data?.technician_name ?? '—'}`}
      />
      {query.isError ? <Banner>{problemMessage(query.error)}</Banner> : null}
      <ul className="mb-6 grid gap-2">
        {(data?.items ?? []).map((item) => (
          <li key={item.job_part_id} className="rounded-md border border-border bg-surface px-3 py-3 text-sm">
            {item.sku_name} · SKU {item.sku_code} · qty {item.quantity} · {item.visit_label}
          </li>
        ))}
      </ul>
      <section className="mb-4 rounded-md border border-border bg-surface p-4">
        <h2 className="font-bold text-strong">Warranty trail</h2>
        <p className="mt-1 text-sm text-muted">These lines are what was actually used on this car.</p>
      </section>
      <SecondaryButton
        onClick={() =>
          ask({
            title: 'Correct a SKU',
            description: 'Creates an audited reverse movement. Physical truth only.',
            confirmLabel: 'Correct SKU',
            onConfirm: async (reason) => {
              const first = data?.items[0];
              if (!first) throw new Error('No part to correct.');
              const sku = await apiClient.listAdminInventory({ q: first.sku_code });
              const match = sku.items.find((row) => row.sku_code === first.sku_code);
              if (!match) throw new Error('SKU not in inventory.');
              await apiClient.postAdminMovement(
                {
                  movement_type: 'REVERSE',
                  sku_id: match.id,
                  location_code: 'WH',
                  quantity: 1,
                  reason,
                  job_card_id: params.id,
                },
                newIdempotencyKey(),
              );
              toast.push('Correction recorded');
              void client.invalidateQueries({ queryKey: adminKeys.jobUsage(params.id) });
            },
          })
        }
      >
        Correct a SKU
      </SecondaryButton>
    </div>
  );
}
