'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';

import { MoneyCell } from '@/components/money-cell';
import { Banner, PageHeader } from '@/components/ui';
import { apiClient } from '@/lib/admin-api';
import { problemMessage } from '@/lib/problem';
import { adminKeys } from '@/lib/query-keys';

export default function CatalogPage() {
  const query = useQuery({
    queryKey: adminKeys.catalog,
    queryFn: () => apiClient.getAdminCatalogOverview(),
  });
  const data = query.data;
  return (
    <div>
      <PageHeader
        title="Catalog"
        actions={
          <Link href="/catalog/settings" className="text-sm font-semibold text-brand-strong">
            Settings
          </Link>
        }
      />
      {query.isError ? <Banner>{problemMessage(query.error)}</Banner> : null}
      <div className="overflow-x-auto rounded-md border border-border bg-surface">
        <table className="w-full text-left text-sm">
          <thead className="bg-subtle text-muted">
            <tr>
              <th className="h-11 px-3 font-medium">Offering</th>
              <th className="h-11 px-3 font-medium">Price display</th>
              <th className="h-11 px-3 font-medium">Policy</th>
              <th className="h-11 px-3 font-medium">Active</th>
            </tr>
          </thead>
          <tbody>
            {(data?.offerings ?? []).map((row) => (
              <tr key={row.slug} className="h-11 border-t border-border">
                <td className="px-3">
                  <Link href={`/catalog/offerings/${row.slug}`} className="font-semibold text-strong hover:text-brand-strong">
                    {row.name}
                  </Link>
                </td>
                <td className="px-3 font-semibold text-strong">
                  {row.display_price_minor != null ? <MoneyCell amountMinor={row.display_price_minor} /> : row.display_label}
                </td>
                <td className="px-3 text-muted">{row.flow_policy ?? row.kind}</td>
                <td className="px-3">{row.is_active ? 'On' : 'Off'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data ? (
        <div className="mt-6 grid max-w-xl gap-2 text-sm">
          <p>
            2nd car discount · <strong>{data.second_vehicle_discount_percent}%</strong>
          </p>
          <p>
            Parts advance · <strong>{data.parts_advance_percent}%</strong>
          </p>
          <p className="text-[13px] text-muted">{data.note ?? 'Customer app reads these live. No hardcoded prices.'}</p>
        </div>
      ) : null}
    </div>
  );
}
