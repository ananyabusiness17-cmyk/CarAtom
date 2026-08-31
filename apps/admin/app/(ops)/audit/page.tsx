'use client';

import { useQuery } from '@tanstack/react-query';
import { Fragment, Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';

import { Banner, PageHeader } from '@/components/ui';
import { apiClient } from '@/lib/admin-api';
import { formatIst } from '@/lib/format-ist';
import { problemMessage } from '@/lib/problem';
import { adminKeys } from '@/lib/query-keys';

function AuditInner() {
  const params = useSearchParams();
  const [command, setCommand] = useState('');
  const [resourceType, setResourceType] = useState('');
  const resourceId = params.get('resource_id') ?? '';
  const filters = {
    command: command || undefined,
    resource_type: resourceType || undefined,
    resource_id: resourceId || undefined,
  };
  const query = useQuery({
    queryKey: adminKeys.audit(filters),
    queryFn: () => apiClient.getAdminAuditLogs(filters),
  });
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div>
      <PageHeader title="Audit log" />
      <div className="mb-4 flex flex-wrap gap-2">
        <input
          value={resourceType}
          onChange={(event) => setResourceType(event.target.value)}
          placeholder="Resource type"
          className="h-10 rounded-md border border-border px-3 text-sm"
        />
        <input
          value={command}
          onChange={(event) => setCommand(event.target.value)}
          placeholder="Command"
          className="h-10 rounded-md border border-border px-3 text-sm"
        />
      </div>
      {query.isError ? <Banner>{problemMessage(query.error)}</Banner> : null}
      <div className="overflow-x-auto rounded-md border border-border bg-surface">
        <table className="w-full text-left text-sm">
          <thead className="bg-subtle text-muted">
            <tr>
              <th className="h-11 px-3 font-medium">Time</th>
              <th className="h-11 px-3 font-medium">Actor</th>
              <th className="h-11 px-3 font-medium">Command</th>
              <th className="h-11 px-3 font-medium">Resource</th>
              <th className="h-11 px-3 font-medium">Reason</th>
              <th className="h-11 px-3 font-medium">Request ID</th>
            </tr>
          </thead>
          <tbody>
            {(query.data?.items ?? []).map((row) => (
              <Fragment key={row.id}>
                <tr
                  className="h-11 cursor-pointer border-t border-border hover:bg-brand-soft/40"
                  onClick={() => setOpenId((current) => (current === row.id ? null : row.id))}
                >
                  <td className="px-3 whitespace-nowrap">{formatIst(row.created_at)}</td>
                  <td className="px-3">{row.actor_display_name}</td>
                  <td className="px-3 font-semibold">{row.command}</td>
                  <td className="px-3">
                    {row.resource_type} {row.resource_id}
                  </td>
                  <td className="px-3 text-muted">{row.reason ?? '—'}</td>
                  <td className="px-3 font-mono text-xs">{row.request_id ?? '—'}</td>
                </tr>
                {openId === row.id ? (
                  <tr className="border-t border-border bg-subtle">
                    <td colSpan={6} className="px-3 py-3 font-mono text-xs">
                      <pre className="whitespace-pre-wrap">
                        {JSON.stringify({ before: row.before_summary, after: row.after_summary }, null, 2)}
                      </pre>
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function AuditPage() {
  return (
    <Suspense
      fallback={
        <div>
          <PageHeader title="Audit log" />
          <p className="text-sm text-muted">Loading audit…</p>
        </div>
      }
    >
      <AuditInner />
    </Suspense>
  );
}
