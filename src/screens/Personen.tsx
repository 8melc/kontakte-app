import { useMemo, useState } from 'react';
import { List, Row, Name, Meta, Dot } from '../components/List';
import { Lbl } from '../components/Lbl';
import { Tabs, TierPills } from '../components/Tabs';
import { SwipeRow } from '../components/SwipeRow';
import { LongPressMenu, type MenuItem } from '../components/LongPressMenu';
import { Empty, SkeletonList } from '../components/Skeleton';
import { useStore } from '../store/store';
import { usePersistedState } from '../hooks/usePersistedState';
import { useLongPress } from '../hooks/useLongPress';
import { haptic } from '../hooks/useHaptic';
import { daysSince, formatDateShort, formatDaysAgo } from '../lib/date';
import { LEVELS, levelLabel, levelLabelLong, urgency, URGENCY_ORDER } from '../lib/domain';
import { toast } from '../lib/toast';
import type { Kontakt, Level, Settings } from '../types';
import type { Overlay } from '../App';

type ViewMode = 'liste' | 'tier' | 'karte' | 'pflege';

interface Props {
  openOverlay: (o: Overlay) => void;
}

export function Personen({ openOverlay }: Props) {
  const [mode, setMode] = usePersistedState<ViewMode>('ros_personen_mode', 'liste');
  const [search, setSearch] = useState('');
  const kontakte = useStore(s => s.kontakte);
  const loaded = useStore(s => s.loaded);

  const subtitle = `${kontakte.length} ${kontakte.length === 1 ? 'mensch' : 'menschen'}`;

  return (
    <>
      <header className="scr-head">
        <div className="scr-h1">Personen</div>
        <div className="scr-sub">{subtitle}</div>
        <div style={{ marginTop: 20 }}>
          <input
            className="input mono"
            placeholder="suchen…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Tabs<ViewMode>
          value={mode}
          onChange={setMode}
          items={[
            { key: 'liste', label: 'liste' },
            { key: 'tier', label: 'tier' },
            { key: 'karte', label: 'karte' },
            { key: 'pflege', label: 'pflege' },
          ]}
        />
      </header>
      <div className="scr-body">
        {!loaded ? (
          <SkeletonList rows={8} />
        ) : (
          <>
            {mode === 'liste' && <PersonenListe search={search} openOverlay={openOverlay} />}
            {mode === 'tier' && <PersonenTier search={search} openOverlay={openOverlay} />}
            {mode === 'karte' && <PersonenKarte search={search} openOverlay={openOverlay} />}
            {mode === 'pflege' && <PersonenPflege search={search} openOverlay={openOverlay} />}
          </>
        )}
      </div>
    </>
  );
}

function usePersonenActions(): {
  settings: Settings;
  onTap: (k: Kontakt) => void;
  onR: (k: Kontakt) => void;
  onL: (k: Kontakt) => void;
  menu: { x: number; y: number; person: Kontakt } | null;
  setMenu: (m: { x: number; y: number; person: Kontakt } | null) => void;
  onLong: (k: Kontakt, e: React.PointerEvent) => void;
  closeMenu: () => void;
  menuItems: (k: Kontakt) => MenuItem[];
} {
  const settings = useStore(s => s.settings);
  const markContacted = useStore(s => s.markContacted);
  const [menu, setMenu] = useState<{ x: number; y: number; person: Kontakt } | null>(null);

  return {
    settings,
    onTap: () => {},
    onR: k => {
      markContacted(k.id);
      toast(`gemeldet — ${k.name}`);
    },
    onL: k => {
      markContacted(k.id);
      toast(`dran gedacht — ${k.name}`);
    },
    menu,
    setMenu,
    onLong: (k, e) => setMenu({ x: e.clientX, y: e.clientY, person: k }),
    closeMenu: () => setMenu(null),
    menuItems: () => [],
  };
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
      <Row className="tappable" {...lp} dim={u === 'ok' && k.level === 'loose'}>
        <Name>{k.name}</Name>
        <Meta tone={tone}>{formatDaysAgo(ds)}</Meta>
      </Row>
    </SwipeRow>
  );
}

function PersonenListe({ search, openOverlay }: { search: string; openOverlay: (o: Overlay) => void }) {
  const kontakte = useStore(s => s.kontakte);
  const markContacted = useStore(s => s.markContacted);
  const ctx = usePersonenActions();

  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? kontakte.filter(k => k.name.toLowerCase().includes(q)) : kontakte;
  }, [kontakte, search]);

  if (search) {
    if (!list.length) return <Empty>niemand gefunden.</Empty>;
    return (
      <div className="fade-in">
        <Lbl>{list.length} ergebnisse</Lbl>
        <List>
          {list.map(k => (
            <PersonRow
              key={k.id}
              k={k}
              settings={ctx.settings}
              onTap={() => openOverlay({ kind: 'person-detail', id: k.id })}
              onSwipeRight={() => ctx.onR(k)}
              onSwipeLeft={() => ctx.onL(k)}
              onLongPress={e => ctx.onLong(k, e)}
            />
          ))}
        </List>
        {ctx.menu && (
          <LongPressMenu
            x={ctx.menu.x}
            y={ctx.menu.y}
            onClose={ctx.closeMenu}
            items={pMenu(ctx.menu.person, openOverlay, markContacted)}
          />
        )}
      </div>
    );
  }

  const groups: { key: Level; list: Kontakt[] }[] = LEVELS.map(lvl => ({
    key: lvl,
    list: list
      .filter(k => k.level === lvl)
      .sort((a, b) => {
        const ua = URGENCY_ORDER[urgency(a, ctx.settings)];
        const ub = URGENCY_ORDER[urgency(b, ctx.settings)];
        if (ua !== ub) return ua - ub;
        return a.name.localeCompare(b.name, 'de');
      }),
  }));

  return (
    <div className="fade-in">
      {groups.map((g, gi) => {
        if (!g.list.length) return null;
        return (
          <div key={g.key}>
            {gi > 0 && <div className="gap" />}
            <Lbl>
              {levelLabel(g.key)} · {g.list.length}
            </Lbl>
            <List>
              {g.list.map(k => (
                <PersonRow
                  key={k.id}
                  k={k}
                  settings={ctx.settings}
                  onTap={() => openOverlay({ kind: 'person-detail', id: k.id })}
                  onSwipeRight={() => ctx.onR(k)}
                  onSwipeLeft={() => ctx.onL(k)}
                  onLongPress={e => ctx.onLong(k, e)}
                />
              ))}
            </List>
          </div>
        );
      })}
      {!kontakte.length && <Empty>noch keine person.</Empty>}
      {ctx.menu && (
        <LongPressMenu
          x={ctx.menu.x}
          y={ctx.menu.y}
          onClose={ctx.closeMenu}
          items={pMenu(ctx.menu.person, openOverlay, markContacted)}
        />
      )}
    </div>
  );
}

function PersonenTier({ search, openOverlay }: { search: string; openOverlay: (o: Overlay) => void }) {
  const [tier, setTier] = usePersistedState<Level>('ros_personen_tier', 'close');
  const kontakte = useStore(s => s.kontakte);
  const markContacted = useStore(s => s.markContacted);
  const ctx = usePersonenActions();

  const counts = LEVELS.reduce(
    (acc, l) => {
      acc[l] = kontakte.filter(k => k.level === l).length;
      return acc;
    },
    { inner: 0, close: 0, mid: 0, loose: 0 } as Record<Level, number>
  );

  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    return kontakte
      .filter(k => k.level === tier && (!q || k.name.toLowerCase().includes(q)))
      .sort((a, b) => {
        const ua = URGENCY_ORDER[urgency(a, ctx.settings)];
        const ub = URGENCY_ORDER[urgency(b, ctx.settings)];
        if (ua !== ub) return ua - ub;
        return daysSince(b.last_contact) - daysSince(a.last_contact);
      });
  }, [kontakte, tier, search, ctx.settings]);

  return (
    <div className="fade-in">
      <TierPills<Level>
        value={tier}
        onChange={setTier}
        items={LEVELS.map(l => ({ key: l, label: levelLabel(l), count: counts[l] }))}
      />
      <div className="gap" />
      <Lbl>{levelLabelLong(tier)} · nach kontaktbedarf</Lbl>
      {list.length === 0 ? (
        <Empty>niemand in dieser gruppe.</Empty>
      ) : (
        <List>
          {list.map(k => {
            const u = urgency(k, ctx.settings);
            return (
              <SwipeRow
                key={k.id}
                onSwipeRight={() => ctx.onR(k)}
                onSwipeLeft={() => ctx.onL(k)}
              >
                <Row
                  className="tappable"
                  onClick={() => {
                    haptic('tap');
                    openOverlay({ kind: 'person-detail', id: k.id });
                  }}
                >
                  {u === 'urgent' && <Dot tone="r" />}
                  {u === 'soon' && <Dot tone="a" />}
                  <Name sub={k.last_contact ? 'zuletzt ' + formatDateShort(k.last_contact) : 'noch nie'}>
                    {k.name}
                  </Name>
                  <Meta tone={u === 'urgent' ? 'r' : u === 'soon' ? 'a' : undefined}>
                    {formatDaysAgo(daysSince(k.last_contact))}
                  </Meta>
                </Row>
              </SwipeRow>
            );
          })}
        </List>
      )}
      {ctx.menu && (
        <LongPressMenu
          x={ctx.menu.x}
          y={ctx.menu.y}
          onClose={ctx.closeMenu}
          items={pMenu(ctx.menu.person, openOverlay, markContacted)}
        />
      )}
    </div>
  );
}

function PersonenKarte({ search, openOverlay }: { search: string; openOverlay: (o: Overlay) => void }) {
  const kontakte = useStore(s => s.kontakte);
  const settings = useStore(s => s.settings);

  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? kontakte.filter(k => k.name.toLowerCase().includes(q)) : kontakte;
  }, [kontakte, search]);

  // pseudo-random but stable positions seeded by id
  const positions = useMemo(() => {
    return list.map(k => {
      const seed = k.id || k.name.charCodeAt(0);
      const x = 8 + ((seed * 9301 + 49297) % 84);
      const y = 4 + (((seed * 7) >> 1) % 80);
      const sizeBase = k.level === 'inner' ? 60 : k.level === 'close' ? 48 : k.level === 'mid' ? 38 : 28;
      return { x, y, sz: sizeBase, k };
    });
  }, [list]);

  return (
    <div className="fade-in">
      <div className="scr-sub" style={{ marginBottom: 24 }}>
        größe = nähe · rot = überfällig
      </div>
      {list.length === 0 ? (
        <Empty>niemand gefunden.</Empty>
      ) : (
        <div style={{ position: 'relative', height: 480 }}>
          {positions.map(({ x, y, sz, k }) => {
            const u = urgency(k, settings);
            const isUrgent = u === 'urgent';
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
                  width: sz,
                  height: sz,
                  borderRadius: '50%',
                  border: `1.5px solid ${isUrgent ? 'var(--red)' : 'var(--hair-strong)'}`,
                  background: 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  padding: 0,
                  color: isUrgent ? 'var(--red)' : 'var(--text-2)',
                  fontFamily: 'var(--mono)',
                  fontSize: Math.max(9, sz / 5),
                }}
              >
                {k.name.split(' ')[0].slice(0, 4).toLowerCase()}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PersonenPflege({ search, openOverlay }: { search: string; openOverlay: (o: Overlay) => void }) {
  const kontakte = useStore(s => s.kontakte);
  const settings = useStore(s => s.settings);
  const markContacted = useStore(s => s.markContacted);

  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    return kontakte
      .filter(k => k.level !== 'loose' && (!q || k.name.toLowerCase().includes(q)))
      .map(k => {
        const ds = daysSince(k.last_contact);
        const t =
          k.level === 'inner'
            ? settings.freq_inner
            : k.level === 'close'
            ? settings.freq_close
            : settings.freq_mid;
        const u = urgency(k, settings);
        return { k, ds: ds === 9999 ? 0 : ds, th: t, u };
      })
      .sort((a, b) => b.ds / b.th - a.ds / a.th);
  }, [kontakte, search, settings]);

  if (list.length === 0) {
    return <Empty>niemand mit pflegeziel.</Empty>;
  }

  return (
    <div className="fade-in">
      <div className="scr-sub" style={{ marginBottom: 24 }}>
        balken voll = zeit zu melden
      </div>
      {list.map(({ k, ds, th, u }) => {
        const pct = Math.min(100, (ds / th) * 100);
        const col = u === 'urgent' ? 'var(--red)' : u === 'soon' ? 'var(--amber)' : 'var(--text-2)';
        return (
          <SwipeRow
            key={k.id}
            onSwipeRight={() => {
              markContacted(k.id);
              toast(`gemeldet — ${k.name}`);
            }}
            onSwipeLeft={() => {
              markContacted(k.id);
              toast(`dran gedacht — ${k.name}`);
            }}
          >
            <div
              style={{
                padding: '14px 0',
                borderTop: '1px solid var(--hair)',
                cursor: 'pointer',
              }}
              onClick={() => {
                haptic('tap');
                openOverlay({ kind: 'person-detail', id: k.id });
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  marginBottom: 10,
                }}
              >
                <span style={{ fontSize: 15 }}>{k.name}</span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: col }}>
                  {ds} / {th}T
                </span>
              </div>
              <div style={{ height: 2, background: 'var(--hair)' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: col }} />
              </div>
            </div>
          </SwipeRow>
        );
      })}
    </div>
  );
}

function pMenu(
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
    {
      label: 'Bearbeiten',
      onClick: () => openOverlay({ kind: 'person-form', id: k.id }),
    },
  ];
}
