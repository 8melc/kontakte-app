import { useMemo, useState } from 'react';
import { BottomSheet } from '../components/BottomSheet';
import { List, Row, Name, Meta, Dot } from '../components/List';
import { Lbl } from '../components/Lbl';
import { PrimaryButton } from '../components/Buttons';
import { useStore } from '../store/store';
import { haptic } from '../hooks/useHaptic';
import { daysSince, formatDaysAgo } from '../lib/date';
import { levelLabelLong, urgency } from '../lib/domain';
import { toast } from '../lib/toast';
import type { Overlay } from '../App';
import type { Kontakt } from '../types';

type Mode = 'menu' | 'gemeldet' | 'gedacht';

interface Props {
  open: boolean;
  onClose: () => void;
  openOverlay: (o: Overlay) => void;
}

export function QuickAdd({ open, onClose, openOverlay }: Props) {
  const [mode, setMode] = useState<Mode>('menu');

  // Reset mode when sheet closes
  const close = () => {
    onClose();
    setTimeout(() => setMode('menu'), 320);
  };

  const title =
    mode === 'menu'
      ? 'Was hinzufügen?'
      : mode === 'gemeldet'
      ? 'Gemeldet bei…'
      : 'An wen gedacht?';

  const sub =
    mode === 'menu'
      ? 'tippen zum auswählen'
      : mode === 'gemeldet'
      ? 'tippen markiert heute als kontakt'
      : 'kurzer dopamin-hit';

  return (
    <BottomSheet open={open} onClose={close} title={title} subtitle={sub}>
      {mode === 'menu' && (
        <Menu
          onPick={(k) => {
            if (k === 'gemeldet') setMode('gemeldet');
            else if (k === 'gedacht') setMode('gedacht');
            else if (k === 'person') {
              close();
              openOverlay({ kind: 'person-form', id: null });
            } else if (k === 'anlass') {
              close();
              openOverlay({ kind: 'anlass-form', id: null });
            }
          }}
        />
      )}
      {(mode === 'gemeldet' || mode === 'gedacht') && (
        <PersonPicker mode={mode} onClose={close} onBack={() => setMode('menu')} />
      )}
    </BottomSheet>
  );
}

function Menu({ onPick }: { onPick: (k: 'gemeldet' | 'gedacht' | 'person' | 'anlass') => void }) {
  return (
    <List>
      <Row
        className="tappable"
        onClick={() => {
          haptic('tap');
          onPick('gemeldet');
        }}
      >
        <Name sub="ich hab grad…">Gemeldet bei jemandem</Name>
        <Meta>›</Meta>
      </Row>
      <Row
        className="tappable"
        onClick={() => {
          haptic('tap');
          onPick('gedacht');
        }}
      >
        <Name sub="kurzer gedanke">An jemanden gedacht</Name>
        <Meta>›</Meta>
      </Row>
      <Row
        className="tappable"
        onClick={() => {
          haptic('tap');
          onPick('person');
        }}
      >
        <Name sub="jemand neuen anlegen">Person eintragen</Name>
        <Meta>›</Meta>
      </Row>
      <Row
        className="tappable"
        onClick={() => {
          haptic('tap');
          onPick('anlass');
        }}
      >
        <Name sub="geburtstag, treffen…">Anlass anlegen</Name>
        <Meta>›</Meta>
      </Row>
    </List>
  );
}

function PersonPicker({
  mode,
  onClose,
  onBack,
}: {
  mode: 'gemeldet' | 'gedacht';
  onClose: () => void;
  onBack: () => void;
}) {
  const kontakte = useStore(s => s.kontakte);
  const settings = useStore(s => s.settings);
  const markContacted = useStore(s => s.markContacted);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const overdue = useMemo(
    () =>
      kontakte
        .filter(k => urgency(k, settings) === 'urgent' && daysSince(k.last_contact) !== 9999)
        .sort((a, b) => daysSince(b.last_contact) - daysSince(a.last_contact))
        .slice(0, 4),
    [kontakte, settings]
  );

  const inner = useMemo(
    () =>
      kontakte
        .filter(k => k.level === 'inner')
        .filter(k => !overdue.some(o => o.id === k.id))
        .sort((a, b) => a.name.localeCompare(b.name, 'de'))
        .slice(0, 6),
    [kontakte, overdue]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return kontakte.filter(k => k.name.toLowerCase().includes(q)).slice(0, 12);
  }, [kontakte, search]);

  const verb = mode === 'gemeldet' ? 'gemeldet' : 'dran gedacht';

  const toggle = (k: Kontakt) => {
    haptic('tap');
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(k.id)) next.delete(k.id);
      else next.add(k.id);
      return next;
    });
  };

  const commit = async () => {
    if (selected.size === 0) return;
    haptic('success');
    const ids = Array.from(selected);
    const names = ids
      .map(id => kontakte.find(k => k.id === id)?.name)
      .filter(Boolean) as string[];
    await Promise.all(ids.map(id => markContacted(id)));
    if (ids.length === 1) {
      toast(`${verb} — ${names[0]}`);
    } else {
      toast(`${verb} — ${ids.length} personen`);
    }
    onClose();
  };

  return (
    <div>
      <input
        className="input mono"
        placeholder="suchen…"
        value={search}
        autoFocus
        onChange={e => setSearch(e.target.value)}
        style={{ marginBottom: 14 }}
      />

      {search ? (
        filtered.length === 0 ? (
          <div className="empty">niemand gefunden.</div>
        ) : (
          <PickList list={filtered} selected={selected} onToggle={toggle} settings={settings} />
        )
      ) : (
        <>
          {overdue.length > 0 && (
            <>
              <Lbl tone="r">überfällig</Lbl>
              <PickList list={overdue} selected={selected} onToggle={toggle} settings={settings} />
              <div className="gap" />
            </>
          )}
          {inner.length > 0 && (
            <>
              <Lbl>inner circle</Lbl>
              <PickList list={inner} selected={selected} onToggle={toggle} settings={settings} />
            </>
          )}
          {overdue.length === 0 && inner.length === 0 && (
            <div className="empty">noch keine personen.</div>
          )}
        </>
      )}

      <div className="gap" />

      {selected.size > 0 ? (
        <PrimaryButton onClick={commit}>
          {verb} {selected.size === 1 ? '· 1 person' : `· ${selected.size} personen`}
        </PrimaryButton>
      ) : (
        <div
          className="scr-sub"
          style={{ textAlign: 'center', padding: '12px 0', fontSize: 11 }}
        >
          tippen zum auswählen · mehrfach möglich
        </div>
      )}

      <button className="btn-ghost center" onClick={onBack}>
        ‹ zurück
      </button>
    </div>
  );
}

function PickList({
  list,
  selected,
  onToggle,
  settings,
}: {
  list: Kontakt[];
  selected: Set<number>;
  onToggle: (k: Kontakt) => void;
  settings: { freq_inner: number; freq_close: number; freq_mid: number; freq_loose: number };
}) {
  return (
    <List>
      {list.map(k => {
        const u = urgency(k, settings as Parameters<typeof urgency>[1]);
        const ds = daysSince(k.last_contact);
        const isSelected = selected.has(k.id);
        return (
          <Row key={k.id} className="tappable" onClick={() => onToggle(k)}>
            {u === 'urgent' && <Dot tone="r" />}
            {u === 'soon' && <Dot tone="a" />}
            <Name sub={levelLabelLong(k.level)}>{k.name}</Name>
            {isSelected ? (
              <Meta tone="g">✓</Meta>
            ) : (
              <Meta tone={u === 'urgent' ? 'r' : u === 'soon' ? 'a' : undefined}>
                {formatDaysAgo(ds)}
              </Meta>
            )}
          </Row>
        );
      })}
    </List>
  );
}
