import { useMemo } from 'react';
import { List, Row, Name, Meta, Dot } from '../components/List';
import { Lbl } from '../components/Lbl';
import { Tabs, TierPills } from '../components/Tabs';
import { Empty, SkeletonList } from '../components/Skeleton';
import { useStore } from '../store/store';
import { usePersistedState } from '../hooks/usePersistedState';
import { haptic } from '../hooks/useHaptic';
import {
  addDays,
  daysBetween,
  isoDate,
  parseDate,
  todayDate,
  upcomingFromAnlass,
  MONTH_LONG_NAMES,
  DAY_SHORT_NAMES,
} from '../lib/date';
import type { Anlass, AnlassTyp, Kontakt } from '../types';
import type { Overlay } from '../App';

type ViewMode = 'liste' | 'kalender' | 'countdown' | 'typ';

interface UpcomingItem {
  anlass?: Anlass;
  titel: string;
  date: Date;
  daysUntil: number;
  typ: string;
  autoKontakt?: Kontakt;
  id: number | null;
  wiederkehrend: boolean;
}

function buildUpcoming(
  anlaesse: Anlass[],
  kontakte: Kontakt[],
  daysWindow = 90
): UpcomingItem[] {
  const today = todayDate();
  const end = addDays(today, daysWindow);
  const out: UpcomingItem[] = [];

  anlaesse.forEach(a => {
    const date = upcomingFromAnlass(a);
    if (date >= today && date <= end) {
      out.push({
        id: a.id,
        anlass: a,
        titel: a.titel,
        date,
        daysUntil: daysBetween(today, date),
        typ: a.typ,
        wiederkehrend: a.wiederkehrend,
      });
    }
  });

  kontakte.forEach(k => {
    if (!k.bday) return;
    const b = parseDate(k.bday)!;
    let bday = new Date(today.getFullYear(), b.getMonth(), b.getDate());
    if (bday < today) bday = new Date(today.getFullYear() + 1, b.getMonth(), b.getDate());
    if (bday > end) return;
    const covered = out.some(
      u =>
        u.typ === 'geburtstag' &&
        u.date.getMonth() === bday.getMonth() &&
        u.date.getDate() === bday.getDate()
    );
    if (!covered) {
      out.push({
        id: null,
        titel: 'Geburtstag ' + k.name,
        date: bday,
        daysUntil: daysBetween(today, bday),
        typ: 'geburtstag',
        autoKontakt: k,
        wiederkehrend: true,
      });
    }
  });

  out.sort((a, b) => a.date.getTime() - b.date.getTime());
  return out;
}

interface Props {
  openOverlay: (o: Overlay) => void;
}

export function Anlaesse({ openOverlay }: Props) {
  const [mode, setMode] = usePersistedState<ViewMode>('ros_anlaesse_mode', 'liste');
  const loaded = useStore(s => s.loaded);

  return (
    <>
      <header className="scr-head">
        <div className="scr-h1">
          {mode === 'kalender' ? 'Kalender' : mode === 'countdown' ? 'Was kommt' : 'Anlässe'}
        </div>
        <div className="scr-sub">nächste 90 tage</div>
        <Tabs<ViewMode>
          value={mode}
          onChange={setMode}
          items={[
            { key: 'liste', label: 'liste' },
            { key: 'kalender', label: 'kalender' },
            { key: 'countdown', label: 'countdown' },
            { key: 'typ', label: 'typ' },
          ]}
        />
      </header>
      <div className="scr-body">
        {!loaded ? (
          <SkeletonList rows={6} />
        ) : (
          <>
            {mode === 'liste' && <AnLi openOverlay={openOverlay} />}
            {mode === 'kalender' && <AnKal openOverlay={openOverlay} />}
            {mode === 'countdown' && <AnCount openOverlay={openOverlay} />}
            {mode === 'typ' && <AnTyp openOverlay={openOverlay} />}
          </>
        )}
      </div>
    </>
  );
}

function AnLi({ openOverlay }: Props) {
  const anlaesse = useStore(s => s.anlaesse);
  const aktionen = useStore(s => s.aktionen);
  const kontakte = useStore(s => s.kontakte);

  const upcoming = useMemo(() => buildUpcoming(anlaesse, kontakte), [anlaesse, kontakte]);

  if (!upcoming.length) return <Empty>keine anlässe geplant.</Empty>;

  // group by month
  const groups = new Map<string, UpcomingItem[]>();
  upcoming.forEach(u => {
    const key = `${MONTH_LONG_NAMES[u.date.getMonth()]} ${u.date.getFullYear()}`;
    const arr = groups.get(key) ?? [];
    arr.push(u);
    groups.set(key, arr);
  });

  return (
    <div className="fade-in">
      {Array.from(groups.entries()).map(([key, list], gi) => (
        <div key={key}>
          {gi > 0 && <div className="gap" />}
          <Lbl>{key.toLowerCase()}</Lbl>
          <List>
            {list.map((u, i) => {
              const open = u.id ? aktionen.filter(ak => ak.anlass_id === u.id && !ak.erledigt).length : 0;
              return (
                <Row
                  key={u.id ?? `auto-${i}`}
                  onClick={() => {
                    haptic('tap');
                    if (u.id) openOverlay({ kind: 'anlass-detail', id: u.id });
                    else if (u.autoKontakt) openOverlay({ kind: 'person-detail', id: u.autoKontakt.id });
                  }}
                  className="tappable"
                >
                  <Meta>{u.date.getDate().toString().padStart(2, '0')}</Meta>
                  <Name sub={open ? `${open} offen` : u.typ}>{u.titel}</Name>
                  <Meta>{u.daysUntil}T</Meta>
                </Row>
              );
            })}
          </List>
        </div>
      ))}
    </div>
  );
}

function AnKal({ openOverlay }: Props) {
  const anlaesse = useStore(s => s.anlaesse);
  const kontakte = useStore(s => s.kontakte);
  const upcoming = useMemo(() => buildUpcoming(anlaesse, kontakte), [anlaesse, kontakte]);

  const today = todayDate();
  const year = today.getFullYear();
  const month = today.getMonth();
  const firstDay = new Date(year, month, 1);
  const startWeekday = (firstDay.getDay() + 6) % 7; // monday-first
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const itemsByDay = new Map<string, UpcomingItem[]>();
  upcoming.forEach(u => {
    const k = isoDate(u.date)!;
    const arr = itemsByDay.get(k) ?? [];
    arr.push(u);
    itemsByDay.set(k, arr);
  });

  const todayStr = isoDate(today)!;

  return (
    <div className="fade-in">
      <Lbl>{MONTH_LONG_NAMES[month].toLowerCase()}</Lbl>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: 6,
          marginTop: 14,
          marginBottom: 18,
        }}
      >
        {['M', 'D', 'M', 'D', 'F', 'S', 'S'].map((d, i) => (
          <div
            key={i}
            style={{
              textAlign: 'center',
              fontFamily: 'var(--mono)',
              fontSize: 9,
              color: 'var(--text-3)',
              letterSpacing: '0.1em',
            }}
          >
            {d}
          </div>
        ))}
        {Array.from({ length: startWeekday }).map((_, i) => (
          <div key={'pad-' + i} />
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => {
          const date = new Date(year, month, d);
          const key = isoDate(date)!;
          const items = itemsByDay.get(key);
          const isToday = key === todayStr;
          const tone = items?.some(u => u.daysUntil <= 3)
            ? 'r'
            : items?.length
            ? 'a'
            : null;
          return (
            <button
              key={d}
              onClick={() => {
                haptic('tap');
                if (items?.[0]?.id) openOverlay({ kind: 'anlass-detail', id: items[0].id });
              }}
              style={{
                aspectRatio: '1',
                background: 'transparent',
                border: 'none',
                cursor: items?.length ? 'pointer' : 'default',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: isToday
                  ? 'var(--text)'
                  : tone === 'r'
                  ? 'var(--red)'
                  : tone === 'a'
                  ? 'var(--amber)'
                  : 'var(--text-2)',
                fontFamily: 'var(--mono)',
                fontSize: 13,
                fontWeight: isToday ? 500 : 400,
              }}
            >
              {d}
              {items?.length ? (
                <span
                  style={{
                    position: 'absolute',
                    bottom: 4,
                    width: 3,
                    height: 3,
                    borderRadius: '50%',
                    background: tone === 'r' ? 'var(--red)' : 'var(--amber)',
                  }}
                />
              ) : null}
            </button>
          );
        })}
      </div>

      <Lbl>kommende</Lbl>
      <List>
        {upcoming.slice(0, 6).map((u, i) => (
          <Row
            key={u.id ?? `a-${i}`}
            className="tappable"
            onClick={() => {
              haptic('tap');
              if (u.id) openOverlay({ kind: 'anlass-detail', id: u.id });
              else if (u.autoKontakt) openOverlay({ kind: 'person-detail', id: u.autoKontakt.id });
            }}
          >
            {u.daysUntil <= 3 && <Dot tone="r" />}
            <Name sub={`${DAY_SHORT_NAMES[u.date.getDay()]} · ${u.date.getDate()}.`}>
              {u.titel}
            </Name>
            <Meta>{u.daysUntil}T</Meta>
          </Row>
        ))}
      </List>
    </div>
  );
}

function AnCount({ openOverlay }: Props) {
  const anlaesse = useStore(s => s.anlaesse);
  const kontakte = useStore(s => s.kontakte);
  const upcoming = useMemo(() => buildUpcoming(anlaesse, kontakte), [anlaesse, kontakte]);

  if (!upcoming.length) return <Empty>nichts in sicht.</Empty>;

  return (
    <div className="fade-in">
      {upcoming.slice(0, 12).map((u, i) => {
        const tone =
          u.daysUntil <= 3 ? 'var(--red)' : u.daysUntil <= 14 ? 'var(--amber)' : 'var(--text)';
        return (
          <button
            key={u.id ?? `c-${i}`}
            onClick={() => {
              haptic('tap');
              if (u.id) openOverlay({ kind: 'anlass-detail', id: u.id });
              else if (u.autoKontakt) openOverlay({ kind: 'person-detail', id: u.autoKontakt.id });
            }}
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 20,
              padding: '18px 0',
              width: '100%',
              background: 'transparent',
              border: 'none',
              borderTop: i === 0 ? 'none' : '1px solid var(--hair)',
              textAlign: 'left',
              cursor: 'pointer',
              color: 'inherit',
            }}
          >
            <span style={{ width: 64, flexShrink: 0 }}>
              <span
                style={{
                  fontFamily: 'var(--mono)',
                  fontSize: 38,
                  fontWeight: 300,
                  color: tone,
                  letterSpacing: '-1px',
                }}
              >
                {u.daysUntil}
              </span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-3)', marginLeft: 4 }}>
                T
              </span>
            </span>
            <span style={{ flex: 1 }}>
              <span style={{ fontSize: 16, display: 'block' }}>{u.titel}</span>
              <span style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 3, display: 'block' }}>
                {u.typ}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

function AnTyp({ openOverlay }: Props) {
  type Filter = 'alle' | AnlassTyp;
  const [filter, setFilter] = usePersistedState<Filter>('ros_anlaesse_typ', 'alle');
  const anlaesse = useStore(s => s.anlaesse);
  const kontakte = useStore(s => s.kontakte);
  const upcoming = useMemo(() => buildUpcoming(anlaesse, kontakte), [anlaesse, kontakte]);

  const TYPES: { key: Filter; label: string }[] = [
    { key: 'alle', label: 'alle' },
    { key: 'geburtstag', label: 'geburtstag' },
    { key: 'feiertag', label: 'feiertag' },
    { key: 'einmalig', label: 'einmalig' },
  ];

  const filtered = filter === 'alle' ? upcoming : upcoming.filter(u => u.typ === filter);

  // group by typ when alle
  const byTyp = new Map<string, UpcomingItem[]>();
  filtered.forEach(u => {
    const arr = byTyp.get(u.typ) ?? [];
    arr.push(u);
    byTyp.set(u.typ, arr);
  });

  return (
    <div className="fade-in">
      <TierPills<Filter>
        value={filter}
        onChange={setFilter}
        items={TYPES.map(t => ({ key: t.key, label: t.label }))}
      />
      <div className="gap" />
      {filtered.length === 0 ? (
        <Empty>kein anlass dieser art.</Empty>
      ) : (
        Array.from(byTyp.entries()).map(([typ, list], gi) => (
          <div key={typ}>
            {gi > 0 && <div className="gap" />}
            <Lbl>{typ}</Lbl>
            <List>
              {list.map((u, i) => (
                <Row
                  key={u.id ?? `t-${i}`}
                  className="tappable"
                  onClick={() => {
                    haptic('tap');
                    if (u.id) openOverlay({ kind: 'anlass-detail', id: u.id });
                    else if (u.autoKontakt)
                      openOverlay({ kind: 'person-detail', id: u.autoKontakt.id });
                  }}
                >
                  <Meta>
                    {u.date.getDate()}.{u.date.getMonth() + 1}
                  </Meta>
                  <Name>{u.titel}</Name>
                  <Meta>{u.daysUntil}T</Meta>
                </Row>
              ))}
            </List>
          </div>
        ))
      )}
    </div>
  );
}
