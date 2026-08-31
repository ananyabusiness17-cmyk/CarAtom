import { MoneyCell } from '../money-cell';

export function MoneyTab({ estimateTotal }: { estimateTotal?: number | null }) {
  return (
    <div className="rounded-md border border-border bg-surface p-4 text-sm">
      <p className="text-muted">Submitted estimate</p>
      <p className="mt-1 text-lg">{estimateTotal != null ? <MoneyCell amountMinor={estimateTotal} /> : '—'}</p>
    </div>
  );
}
