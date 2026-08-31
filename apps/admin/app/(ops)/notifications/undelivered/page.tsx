'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { useState } from 'react';

import type { OutboxEvent } from '@caratom/contracts';

import { DataTable } from '@/components/data-table';
import { Banner, PageHeader, SecondaryButton } from '@/components/ui';
import { useToast } from '@/components/toast';
import { useConfirmReason } from '@/hooks/use-confirm-reason';
import { apiClient } from '@/lib/admin-api';
import { formatIst } from '@/lib/format-ist';
import { problemMessage } from '@/lib/problem';
import { adminKeys } from '@/lib/query-keys';

const TEMPLATE_PREVIEW = {
  intent: 'slot_confirmed',
  title: 'Visit confirmed',
  body: 'Your Health report visit is booked.',
  deep_link: 'caratom://booking/00000000-0000-4000-8000-000000000099',
};

const columns: ColumnDef<OutboxEvent>[] = [
  { accessorKey: 'channel', header: 'Channel' },
  { accessorKey: 'event_type', header: 'Intent' },
  {
    accessorKey: 'last_error_code',
    header: 'Error',
    cell: ({ row }) => row.original.last_error_code ?? row.original.last_error_message ?? '—',
  },
  {
    accessorKey: 'created_at',
    header: 'Created',
    cell: ({ row }) => formatIst(row.original.created_at),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => (
      <span className="inline-flex h-6 items-center rounded bg-danger-soft px-2 text-xs font-semibold uppercase tracking-wide text-danger">
        {row.original.status.replaceAll('_', ' ')}
      </span>
    ),
  },
];

export default function UndeliveredNotificationsPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { ask, dialog } = useConfirmReason();
  const [selected, setSelected] = useState<OutboxEvent | null>(null);
  const query = useQuery({
    queryKey: adminKeys.outbox('DEAD_LETTER'),
    queryFn: () => apiClient.listAdminOutbox({ status: 'DEAD_LETTER' }),
  });

  const retry = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => apiClient.retryAdminOutbox(id, reason),
    onSuccess: () => {
      toast.push('Queued for retry');
      void queryClient.invalidateQueries({ queryKey: adminKeys.outbox('DEAD_LETTER') });
    },
  });

  return (
    <div>
      {dialog}
      <PageHeader title="Undelivered notifications" subtitle="Dead-letter outbox · retry with a reason" />
      {query.isError ? <Banner>{problemMessage(query.error)}</Banner> : null}
      {retry.isError ? <Banner>{problemMessage(retry.error)}</Banner> : null}
      <DataTable
        columns={columns}
        data={query.data?.items ?? []}
        isLoading={query.isLoading}
        onRowClick={(row) => setSelected(row)}
        getRowId={(row) => row.id}
        emptyMessage="No undelivered notifications."
      />
      {selected ? (
        <div className="mt-4 rounded-md border border-border bg-surface p-4">
          <p className="text-sm font-semibold text-strong">
            {selected.event_type} · {selected.channel}
          </p>
          <p className="mt-1 text-sm text-muted">{selected.last_error_message ?? selected.last_error_code ?? '—'}</p>
          <SecondaryButton
            className="mt-3"
            onClick={() =>
              ask({
                title: 'Retry delivery',
                description: 'Queues this outbox row again. The reason is audited.',
                confirmLabel: 'Retry delivery',
                onConfirm: async (reason) => {
                  await retry.mutateAsync({ id: selected.id, reason });
                  setSelected(null);
                },
              })
            }
          >
            Retry
          </SecondaryButton>
        </div>
      ) : null}
      <section className="mt-6 rounded-md border border-border bg-surface p-4">
        <h2 className="text-sm font-bold text-strong">Template preview</h2>
        <p className="mt-1 text-xs text-muted">Read-only YAML fixture · {TEMPLATE_PREVIEW.intent}</p>
        <p className="mt-3 text-sm font-semibold text-strong">{TEMPLATE_PREVIEW.title}</p>
        <p className="text-sm text-muted">{TEMPLATE_PREVIEW.body}</p>
        <p className="mt-2 font-mono text-xs text-muted">{TEMPLATE_PREVIEW.deep_link}</p>
      </section>
    </div>
  );
}
