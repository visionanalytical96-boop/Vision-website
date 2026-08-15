interface BarListItem {
  label: string;
  count: number;
}

export function BarList({ items }: { items: BarListItem[] }) {
  const max = Math.max(1, ...items.map((item) => item.count));

  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.label}>
          <div className="flex items-center justify-between text-sm">
            <span className="text-foreground">{item.label}</span>
            <span className="text-muted">{item.count}</span>
          </div>
          <div className="mt-1 h-2 rounded-full bg-surface-muted">
            <div
              className="h-2 rounded-full bg-primary dark:bg-secondary"
              style={{ width: `${(item.count / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
