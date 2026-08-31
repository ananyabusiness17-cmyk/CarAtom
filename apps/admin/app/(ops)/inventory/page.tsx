'use client';

import { useQuery } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import type { SkuStock } from '@caratom/contracts';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

import { DataTable } from '@/components/data-table';
import { StockLevelCell } from '@/components/stock-level-cell';
import { Banner, PageHeader, SecondaryButton } from '@/components/ui';
import { apiClient } from '@/lib/admin-api';
import { downloadCsv } from '@/lib/csv';
import { problemMessage } from '@/lib/problem';
import { adminKeys } from '@/lib/query-keys';

function locationSummary(sku: SkuStock): string {
  const parts = Object.entries(sku.stock_by_location).map(([code, qty]) => `${code} ${qty}`);
  return parts.join(' · ') || '—';
}

const columns: ColumnDef<SkuStock>[] = [
  {
    accessorKey: 'name',
    header: 'SKU name',
    cell: ({ row }) => (
      <div>
        <p className="font-semibold text-strong">{row.original.name}</p>
        <p className="font-mono text-xs text-muted">{row.original.sku_code}</p>
      </div>
    ),
  },
  {
    id: 'locations',
    header: 'Locations',
    cell: ({ row }) => <span className="text-sm text-muted">{locationSummary(row.original)}</span>,
  },
  {
    accessorKey: 'total_quantity',
    header: 'Total',
    cell: ({ row }) => <StockLevelCell total={row.original.total_quantity} isLow={row.original.is_low_stock} />,
  },
  {
    id: 'status',
    header: 'Status',
    cell: ({ row }) =>
      row.original.is_low_stock ? (
        <span className="text-xs font-semibold text-warning">LOW</span>
      ) : (
        <span className="text-xs font-semibold text-success">OK</span>
      ),
  },
];

export default function InventoryPage() {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [lowStock, setLowStock] = useState(false);
  const [location, setLocation] = useState<string | undefined>(undefined);
  const filters = { q: q.trim() || undefined, low_stock: lowStock || undefined, location };
  const query = useQuery({
    queryKey: adminKeys.inventory(filters),
    queryFn: () => apiClient.listAdminInventory(filters),
    staleTime: 30_000,
  });

  const items = query.data?.items ?? [];
  const lowCount = query.data?.low_stock_count ?? items.filter((row) => row.is_low_stock).length;

  const chips = useMemo(
    () => [
      { id: 'all', label: 'All', active: !lowStock && !location, onClick: () => { setLowStock(false); setLocation(undefined); } },
      { id: 'low', label: 'Low stock', active: lowStock, onClick: () => { setLowStock(true); setLocation(undefined); } },
      { id: 'WH', label: 'Warehouse', active: location === 'WH', onClick: () => { setLowStock(false); setLocation('WH'); } },
      { id: 'VAN_A', label: 'Van A', active: location === 'VAN_A', onClick: () => { setLowStock(false); setLocation('VAN_A'); } },
      { id: 'VAN_B', label: 'Van B', active: location === 'VAN_B', onClick: () => { setLowStock(false); setLocation('VAN_B'); } },
    ],
    [location, lowStock],
  );

  return (
    <div>
      <PageHeader
        title="Inventory"
        subtitle="Warehouse + vans"
        actions={
          <>
            <SecondaryButton
              onClick={() =>
                downloadCsv(
                  'inventory.csv',
                  ['SKU', 'Name', 'Total', 'Low'],
                  items.map((row) => [row.sku_code, row.name, row.total_quantity, row.is_low_stock ? 'LOW' : 'OK']),
                )
              }
            >
              Export CSV
            </SecondaryButton>
            <Link
              href="/inventory/receive"
              className="inline-flex h-10 items-center rounded-md border border-brand-strong px-3 text-sm font-semibold text-brand-strong"
            >
              Receive stock
            </Link>
          </>
        }
      />
      <div className="mb-3 flex max-w-md gap-2">
        <input
          data-ops-search
          value={q}
          onChange={(event) => setQ(event.target.value)}
          placeholder="Search SKU or OEM"
          className="h-10 flex-1 rounded-md border border-border bg-surface px-3 text-sm outline-none ring-brand focus:ring-2"
        />
        <button
          type="button"
          className={`h-10 rounded-md px-3 text-sm font-semibold ${
            lowStock ? 'bg-warning-soft text-warning' : 'bg-subtle text-muted'
          }`}
          onClick={() => setLowStock((value) => !value)}
        >
          {lowCount} low stock
        </button>
      </div>
      <div className="mb-3 flex flex-wrap gap-2">
        {chips.map((chip) => (
          <button
            key={chip.id}
            type="button"
            onClick={chip.onClick}
            className={`h-8 rounded-md px-3 text-xs font-semibold ${
              chip.active ? 'bg-brand-soft text-brand-strong' : 'bg-subtle text-muted'
            }`}
          >
            {chip.label}
          </button>
        ))}
      </div>
      {query.isError ? (
        <Banner>
          {problemMessage(query.error)}{' '}
          <button type="button" className="font-semibold underline" onClick={() => void query.refetch()}>
            Retry
          </button>
        </Banner>
      ) : null}
      <DataTable
        columns={columns}
        data={items}
        isLoading={query.isLoading}
        emptyMessage="No SKUs yet"
        highlightRow={(row) => row.is_low_stock}
        onRowClick={(row) => router.push(`/inventory/${row.id}`)}
        getRowId={(row) => row.id}
      />
    </div>
  );
}
