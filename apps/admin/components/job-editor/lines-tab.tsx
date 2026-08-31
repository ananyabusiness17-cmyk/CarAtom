import { MoneyCell } from '../money-cell';

type Line = {
  id: string;
  label: string;
  unit_price_minor: number;
};

export function LinesTab({ items }: { items: Line[] }) {
  return (
    <div className="overflow-x-auto rounded-md border border-border bg-surface">
      <table className="w-full text-left text-sm">
        <thead className="bg-subtle text-muted">
          <tr>
            <th className="h-11 px-3 font-medium">Line</th>
            <th className="h-11 px-3 font-medium">Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="h-11 border-t border-border">
              <td className="px-3">{item.label}</td>
              <td className="px-3">
                <MoneyCell amountMinor={item.unit_price_minor} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
