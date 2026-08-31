export function StockLevelCell({ total, isLow }: { total: number; isLow: boolean }) {
  if (isLow) {
    return (
      <span className="inline-flex h-6 items-center rounded bg-warning-soft px-2 text-xs font-semibold text-warning">
        {total}
      </span>
    );
  }
  return <span className="font-semibold tabular-nums text-strong">{total}</span>;
}
