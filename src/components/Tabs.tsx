interface TabsProps<T extends string> {
  value: T;
  items: { key: T; label: string }[];
  onChange: (v: T) => void;
}

export function Tabs<T extends string>({ value, items, onChange }: TabsProps<T>) {
  return (
    <div className="tabs">
      {items.map(it => (
        <button
          key={it.key}
          className={`t ${value === it.key ? 'on' : ''}`}
          onClick={() => onChange(it.key)}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}

export function TierPills<T extends string>({
  value,
  items,
  onChange,
}: {
  value: T;
  items: { key: T; label: string; count?: number }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="tier-pills">
      {items.map(it => (
        <button
          key={it.key}
          className={`p ${value === it.key ? 'on' : ''}`}
          onClick={() => onChange(it.key)}
        >
          {it.label}
          {typeof it.count === 'number' && value === it.key ? ` ·${it.count}` : ''}
        </button>
      ))}
    </div>
  );
}
