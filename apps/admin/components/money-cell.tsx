'use client';

import { formatINR } from '../lib/format-inr';

export function MoneyCell({ amountMinor }: { amountMinor: number }) {
  const negative = amountMinor < 0;
  return (
    <span className={`tabular-nums font-semibold ${negative ? 'text-danger' : 'text-strong'}`}>
      {formatINR(amountMinor)}
    </span>
  );
}
