import type { Tab } from '../types';

const ITEMS: { key: Tab; label: string }[] = [
  { key: 'heute', label: 'Heute' },
  { key: 'personen', label: 'Personen' },
  { key: 'anlaesse', label: 'Anlässe' },
  { key: 'mehr', label: 'Mehr' },
];

export function BottomNav({ value, onChange }: { value: Tab; onChange: (t: Tab) => void }) {
  return (
    <nav className="nav">
      <div className="nav-inner">
        {ITEMS.map(it => (
          <button
            key={it.key}
            className={`t ${value === it.key ? 'on' : ''}`}
            onClick={() => onChange(it.key)}
          >
            <span className="d" />
            {it.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
