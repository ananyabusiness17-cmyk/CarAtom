'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';

import { StockLevelCell } from '@/components/stock-level-cell';
import { Banner, PageHeader } from '@/components/ui';
import { apiClient } from '@/lib/admin-api';
import { formatIst } from '@/lib/format-ist';
import { problemMessage } from '@/lib/problem';
import { adminKeys } from '@/lib/query-keys';

export default function SkuDetailPage() {
  const params = useParams<{ skuId: string }>();
  const query = useQuery({
    queryKey: adminKeys.sku(params.skuId),
    queryFn: () => apiClient.getAdminSkuStock(params.skuId),
  });
  const sku = query.data?.sku;
  return (
    <div>
      <PageHeader title={sku?.name ?? 'SKU'} subtitle={sku?.sku_code} />
      {query.isError ? <Banner>{problemMessage(query.error)}</Banner> : null}
      {sku ? (
        <div className="mb-6 flex items-center gap-3">
          <StockLevelCell total={sku.total_quantity} isLow={sku.is_low_stock} />
          <span className="text-sm text-muted">Threshold {sku.low_stock_threshold}</span>
        </div>
      ) : null}
      <h2 className="mb-2 text-sm font-bold text-strong">Stock by location</h2>
      <ul className="mb-6 grid max-w-md gap-2">
        {(query.data?.stock ?? []).map((row) => (
          <li key={row.location_code} className="flex h-11 items-center justify-between rounded-md border border-border bg-surface px-3 text-sm">
            <span>{row.location_code}</span>
            <span className="font-semibold tabular-nums">{row.quantity}</span>
          </li>
        ))}
      </ul>
      <h2 className="mb-2 text-sm font-bold text-strong">Used by offerings</h2>
      <ul className="mb-6 grid gap-1 text-sm">
        {(query.data?.used_by ?? []).length === 0 ? (
          <li className="text-muted">Not on a catalog kit.</li>
        ) : (
          (query.data?.used_by ?? []).map((row) => (
            <li key={`${row.owner_type}-${row.owner_slug}`}>
              {row.owner_name} · {row.owner_slug}
            </li>
          ))
        )}
      </ul>
      <h2 className="mb-2 text-sm font-bold text-strong">Movements</h2>
      <div className="overflow-x-auto rounded-md border border-border bg-surface">
        <table className="w-full text-left text-sm">
          <thead className="bg-subtle text-muted">
            <tr>
              <th className="h-11 px-3 font-medium">Time</th>
              <th className="h-11 px-3 font-medium">Type</th>
              <th className="h-11 px-3 font-medium">Qty</th>
              <th className="h-11 px-3 font-medium">Reason</th>
            </tr>
          </thead>
          <tbody>
            {(query.data?.movements ?? []).map((row) => {
              const rec = row as Record<string, unknown>;
              return (
                <tr key={String(rec.id)} className="h-11 border-t border-border">
                  <td className="px-3">{formatIst(String(rec.created_at ?? ''))}</td>
                  <td className="px-3">{String(rec.movement_type ?? '')}</td>
                  <td className="px-3 tabular-nums">{String(rec.quantity ?? '')}</td>
                  <td className="px-3 text-muted">{String(rec.reason ?? '')}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
