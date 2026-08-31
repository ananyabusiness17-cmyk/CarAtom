'use client';

import { useQuery } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import type { LedgerResponse } from '@caratom/contracts';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import { DataTable } from '@/components/data-table';
import { MoneyCell } from '@/components/money-cell';
import { Banner, PageHeader } from '@/components/ui';
import { apiClient } from '@/lib/admin-api';
import { downloadCsv } from '@/lib/csv';
import { formatIst, todayIstDateInput } from '@/lib/format-ist';
import { formatINR } from '@/lib/format-inr';
import { problemMessage } from '@/lib/problem';
import { adminKeys } from '@/lib/query-keys';

type LedgerRow = LedgerResponse['items'][number];

const columns: ColumnDef<LedgerRow>[] = [
  { accessorKey: 'job_card_ref', header: 'Job ref' },
  { accessorKey: 'label', header: 'Label' },
  { accessorKey: 'method', header: 'Method' },
  {
    accessorKey: 'amount_minor',
    header: 'Amount',
    cell: ({ row }) => <MoneyCell amountMinor={row.original.amount_minor} />,
  },
  {
    accessorKey: 'created_at',
    header: 'Time',
    cell: ({ row }) => formatIst(row.original.created_at),
  },
];

export default function PaymentsPage() {
  const today = todayIstDateInput();
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const range = useMemo(() => ({ from, to }), [from, to]);
  const query = useQuery({
    queryKey: adminKeys.ledger(range),
    queryFn: () => apiClient.getAdminLedger(range),
  });
  const items = query.data?.items ?? [];
  const total = query.data?.daily_total.total_minor ?? 0;

  return (
    <div>
      <PageHeader
        title="Payments"
        actions={
          <>
            <button
              type="button"
              className="h-10 rounded-md border border-border px-3 text-sm font-semibold"
              onClick={() =>
                downloadCsv(
                  'ledger.csv',
                  ['Job', 'Label', 'Method', 'Amount', 'Time'],
                  items.map((row) => [row.job_card_ref, row.label, row.method, row.amount_minor, row.created_at]),
                )
              }
            >
              Export CSV
            </button>
            <Link
              href="/payments/record"
              className="inline-flex h-10 items-center rounded-md bg-brand-strong px-3 text-sm font-semibold text-white"
            >
              Record offline payment
            </Link>
            <Link href="/payments/refunds" className="text-sm font-semibold text-brand-strong">
              Refunds
            </Link>
          </>
        }
      />
      <section className="mb-4 rounded-md border border-border bg-surface px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Today</p>
        <p className="text-2xl font-bold text-strong">{formatINR(total)}</p>
      </section>
      <div className="mb-4 flex flex-wrap gap-3">
        <label className="text-sm">
          From
          <input
            type="date"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
            className="ml-2 h-10 rounded-md border border-border px-2"
          />
        </label>
        <label className="text-sm">
          To
          <input
            type="date"
            value={to}
            onChange={(event) => setTo(event.target.value)}
            className="ml-2 h-10 rounded-md border border-border px-2"
          />
        </label>
      </div>
      {query.isError ? <Banner>{problemMessage(query.error)}</Banner> : null}
      <DataTable columns={columns} data={items} isLoading={query.isLoading} emptyMessage="No ledger rows for this range." />
    </div>
  );
}
