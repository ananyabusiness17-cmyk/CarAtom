const formatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

export function formatINR(amountMinor: number): string {
  const rupees = amountMinor / 100;
  const formatted = formatter.format(Math.abs(rupees));
  return amountMinor < 0 ? `-${formatted}` : formatted;
}
