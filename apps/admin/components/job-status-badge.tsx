const STATUS_CLASS: Record<string, string> = {
  DRAFT: 'bg-subtle text-muted',
  PRICED: 'bg-brand-soft text-brand-strong',
  ACCEPTED: 'bg-brand-soft text-brand-strong',
  BOOKED: 'bg-brand-soft text-brand-strong',
  ASSIGNED: 'bg-warning-soft text-warning',
  INSPECTING: 'bg-warning-soft text-warning',
  IN_PROGRESS: 'bg-warning-soft text-warning',
  COMPLETED: 'bg-success-soft text-success',
  CANCELLED: 'bg-danger-soft text-danger',
};

export function JobStatusBadge({ status }: { status: string }) {
  const cls = STATUS_CLASS[status] ?? 'bg-subtle text-muted';
  return (
    <span className={`inline-flex h-6 items-center rounded px-2 text-xs font-semibold uppercase tracking-wide ${cls}`}>
      {status.replaceAll('_', ' ')}
    </span>
  );
}
