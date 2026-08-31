import { MoneyCell } from '../money-cell';

export function MoneyTab({
  estimateTotal,
  labourTotal,
  partsTotal,
  billedPercent,
}: {
  estimateTotal?: number | null;
  labourTotal?: number | null;
  partsTotal?: number | null;
  billedPercent?: number | null;
}) {
  return (
    <div className="space-y-3 rounded-md border border-border bg-surface p-4 text-sm">
      <div>
        <p className="text-muted">Submitted estimate</p>
        <p className="mt-1 text-lg">
          {estimateTotal != null ? <MoneyCell amountMinor={estimateTotal} /> : '—'}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-muted">Labour</p>
          <p>{labourTotal != null ? <MoneyCell amountMinor={labourTotal} /> : '—'}</p>
        </div>
        <div>
          <p className="text-muted">Parts</p>
          <p>{partsTotal != null ? <MoneyCell amountMinor={partsTotal} /> : '—'}</p>
        </div>
      </div>
      <p className="text-muted">Billed {billedPercent != null ? `${billedPercent}%` : '—'}</p>
    </div>
  );
}
