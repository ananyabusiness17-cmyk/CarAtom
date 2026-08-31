type PartLine = {
  sku_code: string;
  sku_name: string;
  quantity: number;
  visit_label: string;
};

export function PartsTab({ items }: { items: PartLine[] }) {
  if (!items.length) {
    return <p className="text-sm text-muted">No parts fitted on this job yet.</p>;
  }
  return (
    <ul className="grid gap-2">
      {items.map((item) => (
        <li key={`${item.sku_code}-${item.visit_label}`} className="flex h-11 items-center justify-between rounded-md border border-border bg-surface px-3 text-sm">
          <span>
            {item.sku_name} · {item.sku_code}
          </span>
          <span className="text-muted">
            qty {item.quantity} · {item.visit_label}
          </span>
        </li>
      ))}
    </ul>
  );
}
