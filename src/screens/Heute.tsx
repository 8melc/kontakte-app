import { useMemo, useState } from 'react';
import { List, Row, Name, Meta, Dot } from '../components/List';
import { Lbl } from '../components/Lbl';
import { Tabs } from '../components/Tabs';
import { SwipeRow } from '../components/SwipeRow';
import { LongPressMenu, type MenuItem } from '../components/LongPressMenu';
import { Empty, SkeletonList } from '../components/Skeleton';
import { useStore } from '../store/store';
import { usePersistedState } from '../hooks/usePersistedState';
import { useLongPress } from '../hooks/useLongPress';
import { haptic } from '../hooks/useHaptic';
import {
  addDays,
  daysSince,
  formatDateGerman,
  formatDateShort,
  formatDaysAgo,
  isoDate,
  parseDate,
  todayDate,
} from '../lib/date';
import { initials, levelLabelLong, urgency } from '../lib/domain';
import { toast } from '../lib/toast';
import type { Anlass, Aktion, Kontakt, Level, Settings } from '../types';
import type { Overlay } from '../App';

type Mode = 'liste' | 'kreis';

interface DayItem {
  type: 'anlass' | 'aktion' | 'birthday' | 'bday-vorlauf';
  anlass?: Anlass;
  aktion?: Aktion;
  kontakt?: Kontakt;
  daysUntil?: number;
}

interface DayBucket {
  i: number;
  date: Date;
  items: DayItem[];
}

function buildTimeline(
  kontakte: Kontakt[],
  anlaesse: Anlass[],
  aktionen: Aktion[],
  bdayVorlauf: number,
  daysAhead = 7
): DayBucket[] {
  const today = todayDate();
  const buckets: DayBucket[] = [];

  for (let i = 0; i < daysAhead; i++) {
    const d = addDays(today, i);
    const dStr = isoDate(d)!;
    const items: DayItem[] = [];

    anlaesse.forEach(a => {
      let matchDate = a.datum;
      if (a.wiederkehrend || a.typ === 'geburtstag') {
        const orig = parseDate(a.datum)!;
        const thisYear = new Date(d.getFullYear(), orig.getMonth(), orig.getDate());
        matchDate = isoDate(thisYear)!;
      }
      if (matchDate === dStr) items.push({ type: 'anlass', anlass: a });
    });

    aktionen.forEach(ak => {
      if (ak.erledigt) return;
      const anlass = anlaesse.find(a => a.id === ak.anlass_id);
      if (!anlass) return;
      let datum = anlass.datum;
      if (anlass.wiederkehrend || anlass.typ === 'geburtstag') {
        const orig = parseDate(datum)!;
        let dy = new Date(today.getFullYear(), orig.getMonth(), orig.getDate());
        if (dy < today) dy = new Date(today.getFullYear() + 1, orig.getMonth(), orig.getDate());
        datum = isoDate(dy)!;
      }
      const due = addDays(parseDate(datum)!, -(ak.vorlauf_tage || 0));
      if (isoDate(due) === dStr) {
        const k = kontakte.find(x => x.id === ak.kontakt_id);
        items.push({ type: 'aktion', aktion: ak, anlass, kontakt: k });
      }
    });

    kontakte.forEach(k => {
      if (!k.bday) return;
      const b = parseDate(k.bday)!;
      const upcoming = new Date(today.getFullYear(), b.getMonth(), b.getDate());
      if (upcoming < today) upcoming.setFullYear(today.getFullYear() + 1);
      const bdayStr = isoDate(upcoming)!;
      const hasMatching = anlaesse.some(
        a =>
          a.typ === 'geburtstag' &&
          a.datum &&
          (() => {
            const o = parseDate(a.datum)!;
            return o.getMonth() === b.getMonth() && o.getDate() === b.getDate();
          })()
      );
      if (bdayStr === dStr && !hasMatching) {
        items.push({ type: 'birthday', kontakt: k });
      }
      const vorl = addDays(upcoming, -bdayVorlauf);
      if (isoDate(vorl) === dStr && bdayStr !== dStr && !hasMatching) {
        items.push({ type: 'bday-vorlauf', kontakt: k, daysUntil: bdayVorlauf });
      }
    });

    if (items.length) buckets.push({ i, date: d, items });
  }
  return buckets;
}

interface Props {
  openOverlay: (o: Overlay) => void;
}

export function Heute({ openOverlay }: Props) {
  const [mode, setMode] = usePersistedState<Mode>('ros_heute_mode', 'liste');
  const kontakte = useStore(s => s.kontakte);

  const sub =
    mode === 'kreis'
      ? `${kontakte.filter(k => k.level === 'inner').length} menschen · inner circle`
      : formatDateGerman(isoDate(todayDate()));

  return (
    <>
      <header className="scr-head">
        <div className="scr-h1">{mode === 'kreis' ? 'Dein Kreis' : 'Heute'}</div>
        <div className="scr-sub">{sub}</div>
        <Tabs<Mode>
          value={mode}
          onChange={setMode}
          items={[
            { key: 'liste', label: 'liste' },
            { key: 'kreis', label: 'kreis' },
          ]}
        />
      </header>
      <div className="scr-body">
        {mode === 'liste' ? (
          <HeuteListe openOverlay={openOverlay} />
        ) : (
          <HeuteKreis openOverlay={openOverlay} />
        )}
      </div>
    </>
  );
}

function HeuteListe({ openOverlay }: Props) {
  const kontakte = useStore(s => s.kontakte);
  const anlaesse = useStore(s => s.anlaesse);
  const aktionen = useStore(s => s.aktionen);
  const settings = useStore(s => s.settings);
  const loaded = useStore(s => s.loaded);
  const markContacted = useStore(s => s.markContacted);
  const toggleAktion = useStore(s => s.toggleAktion);

  const [menu, setMenu] = useState<{ x: number; y: number; person: Kontakt } | null>(null);

  const overdue = useMemo(
    () =>
      kontakte
        .filter(k => urgency(k, settings) === 'urgent' && daysSince(k.last_contact) !== 9999)
        .sort((a, b) => daysSince(b.last_contact) - daysSince(a.last_contact))
        .slice(0, 5),
    [kontakte, settings]
  );

  const buckets = useMemo(
    () => buildTimeline(kontakte, anlaesse, aktionen, settings.bday_vorlauf, 7),
    [kontakte, anlaesse, aktionen, settings.bday_vorlauf]
  );

  const todayBucket = buckets.find(b => b.i === 0);
  const restBuckets = buckets.filter(b => b.i > 0);

  const contactable = useMemo(
    () =>
      kontakte
        .filter(k => {
          const u = urgency(k, settings);
          return (u === 'soon' || u === 'urgent') && daysSince(k.last_contact) !== 9999;
        })
        .sort((a, b) => daysSince(b.last_contact) - daysSince(a.last_contact))
        .slice(0, 4)
        .filter(k => !overdue.some(o => o.id === k.id)),
    [kontakte, settings, overdue]
  );

  const meldungen = useMemo(() => {
    return aktionen
      .filter(a => !a.erledigt && a.anlass_id == null)
      .sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''));
  }, [aktionen]);

  if (!loaded) return <SkeletonList rows={6} />;

  const onPersonTap = (k: Kontakt) => openOverlay({ kind: 'person-detail', id: k.id });
  const onPersonSwipeR = (k: Kontakt) => {
    markContacted(k.id);
    toast(`gemeldet — ${k.name}`);
  };
  const onPersonSwipeL = (k: Kontakt) => {
    markContacted(k.id);
    toast(`dran gedacht — ${k.name}`);
  };
  const onPersonLong = (k: Kontakt, e: React.PointerEvent) =>
    setMenu({ x: e.clientX, y: e.clientY, person: k });

  const showAnything = overdue.length > 0 || buckets.length > 0 || contactable.length > 0;

  return (
    <div className="fade-in">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          paddingBottom: 8,
        }}
      >
        <Lbl>will mich melden</Lbl>
        <button
          onClick={() => {
            haptic('tap');
            openOverlay({ kind: 'meldung-form' });
          }}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            fontFamily: 'var(--mono)',
            fontSize: 11,
            color: 'var(--text-2)',
          }}
        >
          + neu
        </button>
      </div>
      {meldungen.length === 0 ? (
        <div
          className="empty"
          style={{
            cursor: 'pointer',
            padding: '14px 0',
          }}
          onClick={() => {
            haptic('tap');
            openOverlay({ kind: 'meldung-form' });
          }}
        >
          tippen → erste todo eintragen
        </div>
      ) : (
        <List>
          {meldungen.map(ak => {
            const k = kontakte.find(x => x.id === ak.kontakt_id);
            return (
              <Row
                key={ak.id}
                className="tappable"
                onClick={async () => {
                  haptic('success');
                  await toggleAktion(ak.id);
                  if (k) {
                    await markContacted(k.id);
                    toast(`erledigt · ${k.name}`);
                  } else {
                    toast('erledigt');
                  }
                }}
              >
                <Name sub={k ? k.name : '—'}>{ak.was}</Name>
                <Meta>○</Meta>
              </Row>
            );
          })}
        </List>
      )}
      <div className="gap" />

      {overdue.length > 0 && (
        <>
          <Lbl>überfällig</Lbl>
          <List>
            {overdue.map(k => (
              <PersonRow
                key={k.id}
                k={k}
                settings={settings}
                onTap={() => onPersonTap(k)}
                onSwipeRight={() => onPersonSwipeR(k)}
                onSwipeLeft={() => onPersonSwipeL(k)}
                onLongPress={e => onPersonLong(k, e)}
              />
            ))}
          </List>
          <div className="gap" />
        </>
      )}

      {todayBucket && (
        <>
          <Lbl>heute</Lbl>
          <List>
            {todayBucket.items.map((it, i) => (
              <DayItemRow key={i} item={it} onOpen={openOverlay} />
            ))}
          </List>
          <div className="gap" />
        </>
      )}

      {restBuckets.length > 0 && (
        <>
          <Lbl>diese woche</Lbl>
          <List>
            {restBuckets.flatMap(b =>
              b.items.map((it, i) => {
                const dayLbl =
                  b.i === 1
                    ? 'morgen'
                    : ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'][b.date.getDay()];
                return (
                  <DayItemRow
                    key={`${b.i}-${i}`}
                    item={it}
                    prefix={dayLbl + ' · '}
                    dim={b.i > 2}
                    onOpen={openOverlay}
                  />
                );
              })
            )}
          </List>
          <div className="gap" />
        </>
      )}

      {contactable.length > 0 && (
        <>
          <Lbl>heute möglich</Lbl>
          <List>
            {contactable.map(k => (
              <PersonRow
                key={k.id}
                k={k}
                settings={settings}
                onTap={() => onPersonTap(k)}
                onSwipeRight={() => onPersonSwipeR(k)}
                onSwipeLeft={() => onPersonSwipeL(k)}
                onLongPress={e => onPersonLong(k, e)}
              />
            ))}
          </List>
        </>
      )}

      {!showAnything && (
        <Empty>
          alles im rhythmus.
          <br />
          luft holen.
        </Empty>
      )}

      {menu && (
        <LongPressMenu
          x={menu.x}
          y={menu.y}
          onClose={() => setMenu(null)}
          items={personMenu(menu.person, openOverlay, markContacted)}
        />
      )}
    </div>
  );
}

function PersonRow({
  k,
  settings,
  onTap,
  onSwipeRight,
  onSwipeLeft,
  onLongPress,
}: {
  k: Kontakt;
  settings: Settings;
  onTap: () => void;
  onSwipeRight: () => void;
  onSwipeLeft: () => void;
  onLongPress: (e: React.PointerEvent) => void;
}) {
  const ds = daysSince(k.last_contact);
  const u = urgency(k, settings);
  const lp = useLongPress({
    onLongPress: e => onLongPress(e as React.PointerEvent),
    onClick: () => {
      haptic('tap');
      onTap();
    },
  });
  const tone: 'r' | 'a' | undefined = u === 'urgent' ? 'r' : u === 'soon' ? 'a' : undefined;
  return (
    <SwipeRow onSwipeRight={onSwipeRight} onSwipeLeft={onSwipeLeft}>
      <Row className="tappable" {...lp}>
        {u === 'urgent' && <Dot tone="r" />}
        {u === 'soon' && <Dot tone="a" />}
        <Name
          sub={`${levelLabelLong(k.level)}${
            k.last_contact ? ' · zuletzt ' + formatDateShort(k.last_contact) : ''
          }`}
        >
          {k.name}
        </Name>
        <Meta tone={tone}>{formatDaysAgo(ds)}</Meta>
      </Row>
    </SwipeRow>
  );
}

function DayItemRow({
  item,
  prefix = '',
  dim,
  onOpen,
}: {
  item: DayItem;
  prefix?: string;
  dim?: boolean;
  onOpen: (o: Overlay) => void;
}) {
  if (item.type === 'anlass' && item.anlass) {
    const a = item.anlass;
    return (
      <Row dim={dim} onClick={() => onOpen({ kind: 'anlass-detail', id: a.id })}>
        <Name sub={a.typ}>{prefix + a.titel}</Name>
        <Meta>{a.typ === 'geburtstag' ? '🎂' : ''}</Meta>
      </Row>
    );
  }
  if (item.type === 'aktion' && item.aktion) {
    const k = item.kontakt;
    const a = item.anlass;
    return (
      <Row dim={dim} onClick={() => k && onOpen({ kind: 'person-detail', id: k.id })}>
        <Name sub={`${k?.name ?? ''}${a ? ' · ' + a.titel : ''}`}>{prefix + item.aktion.was}</Name>
        <Meta tone="a">vorlauf</Meta>
      </Row>
    );
  }
  if (item.type === 'birthday' && item.kontakt) {
    const k = item.kontakt;
    return (
      <Row dim={dim} onClick={() => onOpen({ kind: 'person-detail', id: k.id })}>
        <Name sub="geburtstag">{prefix + k.name}</Name>
        <Meta>🎂</Meta>
      </Row>
    );
  }
  if (item.type === 'bday-vorlauf' && item.kontakt) {
    const k = item.kontakt;
    return (
      <Row dim={dim} onClick={() => onOpen({ kind: 'person-detail', id: k.id })}>
        <Name sub={`geburtstag in ${item.daysUntil ?? 0}T`}>{prefix + k.name}</Name>
        <Meta tone="a">vorlauf</Meta>
      </Row>
    );
  }
  return null;
}

function personMenu(
  k: Kontakt,
  openOverlay: (o: Overlay) => void,
  markContacted: (id: number) => Promise<void>
): MenuItem[] {
  return [
    {
      label: 'Heute gemeldet',
      onClick: () => {
        markContacted(k.id);
        toast(`gemeldet — ${k.name}`);
      },
    },
    {
      label: 'Dran gedacht',
      onClick: () => {
        markContacted(k.id);
        toast(`dran gedacht — ${k.name}`);
      },
    },
    {
      label: 'Notiz bearbeiten',
      onClick: () => openOverlay({ kind: 'note-form', personId: k.id }),
    },
    {
      label: 'Details öffnen',
      onClick: () => openOverlay({ kind: 'person-detail', id: k.id }),
    },
  ];
}

// ─── Kreis-Mode ───
function HeuteKreis({ openOverlay }: Props) {
  const [level, setLevel] = usePersistedState<Level | 'all'>('ros_kreis_level', 'inner');
  const kontakte = useStore(s => s.kontakte);
  const settings = useStore(s => s.settings);
  const loaded = useStore(s => s.loaded);

  if (!loaded) return <SkeletonList rows={5} />;

  const filtered = level === 'all' ? kontakte : kontakte.filter(k => k.level === level);
  const ring = filtered.slice(0, 12);

  return (
    <div className="fade-in">
      <Tabs<Level | 'all'>
        value={level}
        onChange={setLevel}
        items={[
          { key: 'inner', label: 'inner' },
          { key: 'close', label: 'eng' },
          { key: 'mid', label: 'mittel' },
          { key: 'loose', label: 'locker' },
          { key: 'all', label: 'alle' },
        ]}
      />
      <div className="gap" />
      {ring.length === 0 ? (
        <Empty>noch niemand auf diesem ring.</Empty>
      ) : (
        <div
          style={{
            position: 'relative',
            width: '100%',
            aspectRatio: '1',
            maxWidth: 320,
            margin: '0 auto',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              border: '1px solid var(--hair-strong)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: '32%',
              borderRadius: '50%',
              border: '1px solid var(--hair-strong)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'var(--mono)',
              fontSize: 10,
              color: 'var(--text-3)',
              letterSpacing: '0.1em',
            }}
          >
            DU
          </div>
          {ring.map((k, idx) => {
            const a = (idx / ring.length) * Math.PI * 2 - Math.PI / 2;
            const r = 0.42;
            const x = 50 + Math.cos(a) * r * 100;
            const y = 50 + Math.sin(a) * r * 100;
            const u = urgency(k, settings);
            const sz = k.level === 'inner' ? 32 : k.level === 'close' ? 28 : 24;
            return (
              <button
                key={k.id}
                onClick={() => {
                  haptic('tap');
                  openOverlay({ kind: 'person-detail', id: k.id });
                }}
                style={{
                  position: 'absolute',
                  left: `${x}%`,
                  top: `${y}%`,
                  transform: 'translate(-50%, -50%)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                <span
                  style={{
                    width: sz,
                    height: sz,
                    borderRadius: '50%',
                    border: `1.5px solid ${u === 'urgent' ? 'var(--red)' : 'var(--hair-strong)'}`,
                    color: u === 'urgent' ? 'var(--red)' : 'var(--text)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'var(--mono)',
                    fontSize: 11,
                  }}
                >
                  {initials(k.name)}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--mono)',
                    fontSize: 9,
                    color: 'var(--text-2)',
                    maxWidth: 60,
                    textAlign: 'center',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {k.name.split(' ')[0]}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
