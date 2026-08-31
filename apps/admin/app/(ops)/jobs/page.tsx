'use client';

import { useQuery } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { DataTable } from '@/components/data-table';
import { JobStatusBadge } from '@/components/job-status-badge';
import { Banner, PageHeader } from '@/components/ui';
import { apiClient } from '@/lib/admin-api';
import { formatIst } from '@/lib/format-ist';
import { problemMessage } from '@/lib/problem';
import { adminKeys } from '@/lib/query-keys';

type JobRow = {
  id: string;
  public_ref: string;
  customer_name?: string | null;
  status: string;
  technician_name?: string | null;
  locality?: string | null;
  updated_at: string;
};

const columns: ColumnDef<JobRow>[] = [
  { accessorKey: 'public_ref', header: 'Job' },
  { accessorKey: 'customer_name', header: 'Customer', cell: ({ row }) => row.original.customer_name ?? '—' },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => <JobStatusBadge status={row.original.status} />,
  },
  { accessorKey: 'technician_name', header: 'Tech', cell: ({ row }) => row.original.technician_name ?? 'Unassigned' },
  { accessorKey: 'locality', header: 'Area', cell: ({ row }) => row.original.locality ?? '—' },
  { accessorKey: 'updated_at', header: 'Updated', cell: ({ row }) => formatIst(row.original.updated_at) },
];

export default function JobsPage() {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const query = useQuery({
    queryKey: adminKeys.jobs({ q, status }),
    queryFn: () => apiClient.listAdminJobs({ q: q || undefined, status: status || undefined }),
  });

  return (
    <div>
      <PageHeader title="Jobs" subtitle="Desk list · not the mobile board" />
      <div className="mb-4 flex flex-wrap gap-2">
        <input
          data-ops-search
          value={q}
          onChange={(event) => setQ(event.target.value)}
          placeholder="Search JC-1042"
          className="h-10 w-64 rounded-md border border-border px-3 text-sm"
        />
        <select value={status} onChange={(event) => setStatus(event.target.value)} className="h-10 rounded-md border border-border px-3 text-sm">
          <option value="">All statuses</option>
          {['BOOKED', 'ASSIGNED', 'INSPECTING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </div>
      {query.isError ? <Banner>{problemMessage(query.error)}</Banner> : null}
      <DataTable
        columns={columns}
        data={query.data?.items ?? []}
        isLoading={query.isLoading}
        onRowClick={(row) => router.push(`/jobs/${row.id}`)}
        getRowId={(row) => row.id}
        emptyMessage="No jobs match."
      />
    </div>
  );
}
