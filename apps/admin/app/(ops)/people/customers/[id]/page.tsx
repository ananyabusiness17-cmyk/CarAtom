'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

import { JobStatusBadge } from '@/components/job-status-badge';
import { useToast } from '@/components/toast';
import { Banner, GhostButton, PageHeader } from '@/components/ui';
import { useConfirmReason } from '@/hooks/use-confirm-reason';
import { apiClient } from '@/lib/admin-api';
import { maskPhone } from '@/lib/mask-phone';
import { problemMessage } from '@/lib/problem';
import { adminKeys } from '@/lib/query-keys';

export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const { ask, dialog } = useConfirmReason();
  const query = useQuery({
    queryKey: adminKeys.customer(params.id),
    queryFn: () => apiClient.getAdminCustomer(params.id),
  });
  const customer = query.data;

  return (
    <div>
      {dialog}
      <PageHeader
        title={customer?.full_name ?? 'Customer'}
        subtitle={customer?.masked_phone ?? maskPhone(customer?.phone_e164)}
        actions={
          <>
            <Link href={`/people/customers/${params.id}/parts`} className="text-sm font-semibold text-brand-strong">
              Parts history
            </Link>
            <GhostButton
              disabled={customer?.is_disabled}
              onClick={() =>
                ask({
                  title: 'Disable this customer?',
                  description: 'They will no longer be able to use customer routes.',
                  confirmLabel: 'Disable',
                  onConfirm: async (reason) => {
                    const result = await apiClient.disableAdminProfile(params.id, reason);
                    toast.push(`Disabled · audit ${result.audit_id}`);
                    router.refresh();
                  },
                })
              }
            >
              Disable access
            </GhostButton>
          </>
        }
      />
      {query.isError ? <Banner>{problemMessage(query.error)}</Banner> : null}
      {customer?.is_disabled ? <Banner tone="muted">This profile is disabled.</Banner> : null}
      <h2 className="mb-2 text-sm font-bold text-strong">Vehicles</h2>
      <ul className="mb-6 grid gap-2 md:grid-cols-2">
        {(customer?.vehicles ?? []).map((vehicle, index) => {
          const rec = vehicle as Record<string, unknown>;
          const vehicleId = String(rec.id ?? rec.vehicle_id ?? '');
          return (
            <li key={vehicleId || String(index)} className="rounded-md border border-border bg-surface px-3 py-2 text-sm">
              <p>{String(rec.label ?? rec.model ?? 'Vehicle')}</p>
              {vehicleId ? <VehicleHistory vehicleId={vehicleId} /> : null}
            </li>
          );
        })}
      </ul>
      <h2 className="mb-2 text-sm font-bold text-strong">Recent jobs</h2>
      <ul className="grid gap-2">
        {(customer?.recent_jobs ?? []).map((job) => {
          const rec = job as Record<string, unknown>;
          return (
            <li key={String(rec.id)}>
              <Link
                href={`/jobs/${String(rec.id)}`}
                className="flex h-11 items-center justify-between rounded-md border border-border bg-surface px-3 text-sm"
              >
                <span className="font-semibold">{String(rec.public_ref)}</span>
                <JobStatusBadge status={String(rec.status)} />
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function VehicleHistory({ vehicleId }: { vehicleId: string }) {
  const query = useQuery({
    queryKey: adminKeys.vehicleHistory(vehicleId),
    queryFn: () => apiClient.getAdminVehicleHistory(vehicleId),
  });
  if (query.isLoading) return <p className="text-xs text-muted">Loading history…</p>;
  if (!query.data?.items.length) return <p className="text-xs text-muted">No service history yet.</p>;
  return (
    <ul className="mt-2 grid gap-1 text-xs text-muted">
      {query.data.items.map((row) => (
        <li key={row.id}>
          {row.offering_slug ?? 'Visit'}
          {row.odometer_km != null ? ` · ${row.odometer_km} km` : ''}
        </li>
      ))}
    </ul>
  );
}
