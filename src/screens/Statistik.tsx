import { useMemo } from 'react';
import { List, Row, Name, Meta } from '../components/List';
import { Lbl } from '../components/Lbl';
import { useStore } from '../store/store';
import { haptic } from '../hooks/useHaptic';
import { formatDateShort, todayDate, addDays, isoDate } from '../lib/date';
import {
  rhythmusBreakdown,
  levelStats,
  streak,
  activeDaysIn,
  weeklyBuckets,
  thisWeekContacts,
  dayOfWeekDistribution,
  topPeople,
  upcomingAnlaesse,
} from '../lib/stats';
import { levelLabel } from '../lib/domain';

interface Props {
  onClose: () => void;
}

export function Statistik({ onClose }: Props) {
  const kontakte = useStore(s => s.kontakte);
  const anlaesse = useStore(s => s.anlaesse);
  const events = useStore(s => s.events);
  const settings = useStore(s => s.settings);
  const eventsTableMissing = useStore(s => s.eventsTableMissing);

  const breakdown = useMemo(() => rhythmusBreakdown(kontakte, settings), [kontakte, settings]);
  const lvls = useMemo(() => levelStats(kontakte, settings), [kontakte, settings]);
  const myStreak = useMemo(() => streak(events), [events]);
  const last7Days = useMemo(() => activeDaysIn(events, 7), [events]);
  const last30Days = useMemo(() => activeDaysIn(events, 30), [events]);
  const weekly = useMemo(() => weeklyBuckets(events, 12), [events]);
  const thisWeek = useMemo(() => thisWeekContacts(events, kontakte), [events, kontakte]);
  const dow = useMemo(() => dayOfWeekDistribution(events), [events]);
  const top = useMemo(() => topPeople(events, kontakte, 90, 5), [events, kontakte]);
  const upcoming = useMemo(() => upcomingAnlaesse(anlaesse, kontakte, 30), [anlaesse, kontakte]);

  // Sparkline scaling
  const maxWeek = Math.max(1, ...weekly.map(w => w.count));

  const dowMax = Math.max(1, ...dow.map(d => d.count));
  const sortedDow = [...dow].sort((a, b) => b.count - a.count);
  const mostActive = sortedDow[0]?.count > 0 ? sortedDow[0].day : '—';
  const leastActive = sortedDow.filter(d => d.count > 0).slice(-1)[0]?.day ?? '—';

  const totalEvents = events.length;
  const avgPerWeek =
    weekly.length > 0
      ? (weekly.slice(-4).reduce((sum, w) => sum + w.count, 0) / Math.min(4, weekly.length)).toFixed(1)
      : '0.0';

  return (
    <div className="full">
      <div className="full-inner">
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-start',
            alignItems: 'center',
            marginBottom: 16,
          }}
        >
          <button
            onClick={() => {
              haptic('tap');
              onClose();
            }}
            style={{
              background: 'none',
              border: 'none',
              padding: 4,
              cursor: 'pointer',
              fontFamily: 'var(--mono)',
              fontSize: 11,
              color: 'var(--text-2)',
            }}
          >
            ‹ zurück
          </button>
        </div>

        <div className="scr-h1" style={{ marginBottom: 4 }}>
          Statistik
        </div>
        <div className="scr-sub">wie läuft's mit dem pflegen</div>

        <div className="gap" />

        {eventsTableMissing && (
          <>
            <div
              style={{
                background: 'transparent',
                border: '1px solid var(--hair-strong)',
                borderRadius: 12,
                padding: 14,
                marginBottom: 24,
                fontFamily: 'var(--mono)',
                fontSize: 11,
                color: 'var(--text-2)',
                lineHeight: 1.6,
              }}
            >
              <div style={{ color: 'var(--amber)', marginBottom: 6 }}>migration fehlt</div>
              die kontakt_events-tabelle gibt's noch nicht. snapshot-stats unten
              funktionieren trotzdem. für streaks und wöchentlichen verlauf:
              <br />
              <br />
              datei <span style={{ color: 'var(--text)' }}>supabase/migrations/0001_kontakt_events.sql</span>
              {' '}im supabase sql-editor einmal ausführen.
            </div>
          </>
        )}

        <Lbl>jetzt</Lbl>
        <List>
          <Row>
            <Name>im rhythmus</Name>
            <Meta tone="g">{breakdown.inRhythmus}</Meta>
          </Row>
          <Row>
            <Name>am driften</Name>
            <Meta tone="a">{breakdown.driften}</Meta>
          </Row>
          <Row>
            <Name>überfällig</Name>
            <Meta tone={breakdown.ueberfaellig > 0 ? 'r' : undefined}>{breakdown.ueberfaellig}</Meta>
          </Row>
          <Row>
            <Name>noch nie gemeldet</Name>
            <Meta>{breakdown.nochNie}</Meta>
          </Row>
        </List>

        <div className="gap" />

        <Lbl>diese woche</Lbl>
        {thisWeek.count === 0 ? (
          <div className="empty" style={{ padding: '14px 0' }}>
            noch keine meldung diese woche.
          </div>
        ) : (
          <>
            <div
              style={{
                fontSize: 28,
                fontFamily: 'var(--mono)',
                fontWeight: 300,
                marginTop: 10,
                marginBottom: 4,
              }}
            >
              {thisWeek.count}
              <span
                style={{
                  fontSize: 14,
                  color: 'var(--text-3)',
                  marginLeft: 8,
                }}
              >
                {thisWeek.count === 1 ? 'mensch' : 'menschen'}
              </span>
            </div>
            <div
              style={{
                fontFamily: 'var(--mono)',
                fontSize: 12,
                color: 'var(--text-2)',
                lineHeight: 1.6,
              }}
            >
              {thisWeek.names.join(' · ')}
            </div>
          </>
        )}

        {!eventsTableMissing && (
          <>
            <div className="gap" />

            <Lbl>gemeldet · letzte 12 wochen</Lbl>
            <Sparkline buckets={weekly} max={maxWeek} />

            <div className="gap" />

            <Lbl>streak</Lbl>
            <List>
              <Row>
                <Name sub="tage in folge mit mindestens 1 meldung">aktuell</Name>
                <Meta tone={myStreak >= 3 ? 'g' : undefined}>{myStreak}T</Meta>
              </Row>
              <Row>
                <Name sub="aktive tage in den letzten 7">letzte woche</Name>
                <Meta>{last7Days}/7</Meta>
              </Row>
              <Row>
                <Name sub="aktive tage in den letzten 30">letzter monat</Name>
                <Meta>{last30Days}/30</Meta>
              </Row>
              <Row>
                <Name sub="durchschnitt der letzten 4">pro woche</Name>
                <Meta>{avgPerWeek}</Meta>
              </Row>
            </List>

            <div className="gap" />

            <Lbl>dein muster</Lbl>
            <List>
              <Row>
                <Name sub="meiste meldungen">am häufigsten an</Name>
                <Meta>{mostActive}</Meta>
              </Row>
              <Row>
                <Name sub="wenigste meldungen">am ruhigsten an</Name>
                <Meta>{leastActive}</Meta>
              </Row>
            </List>
            <DowChart dow={dow} max={dowMax} />

            <div className="gap" />

            {top.length > 0 && (
              <>
                <Lbl>top personen · letzte 90T</Lbl>
                <List>
                  {top.map(({ k, count }) => (
                    <Row key={k.id}>
                      <Name>{k.name}</Name>
                      <Meta>
                        {count}× · zuletzt {k.last_contact ? formatDateShort(k.last_contact) : '—'}
                      </Meta>
                    </Row>
                  ))}
                </List>
              </>
            )}
          </>
        )}

        <div className="gap" />

        <Lbl>dein kreis</Lbl>
        <List>
          {lvls.map(s => {
            const tracked = s.level !== 'loose';
            return (
              <Row key={s.level}>
                <Name
                  sub={
                    tracked
                      ? `ziel alle ${s.thresholdDays}T · ${s.inRhythmus} im rhythmus${
                          s.driften > 0 ? ` · ${s.driften} driften` : ''
                        }${s.ueberfaellig > 0 ? ` · ${s.ueberfaellig} überfällig` : ''}`
                      : 'kein tracking'
                  }
                >
                  {levelLabel(s.level)}
                </Name>
                <Meta>{s.total}</Meta>
              </Row>
            );
          })}
        </List>

        <div className="gap" />

        <Lbl>anlässe nächste 30T</Lbl>
        <List>
          <Row>
            <Name>events</Name>
            <Meta>{upcoming.total}</Meta>
          </Row>
          <Row>
            <Name>davon geburtstage</Name>
            <Meta>{upcoming.bdays}</Meta>
          </Row>
        </List>

        {!eventsTableMissing && totalEvents > 0 && (
          <>
            <div className="gap" />
            <div
              style={{
                fontFamily: 'var(--mono)',
                fontSize: 10,
                color: 'var(--text-3)',
                textAlign: 'center',
                padding: '12px 0',
              }}
            >
              insgesamt {totalEvents} meldungen aufgezeichnet
            </div>
          </>
        )}

        <div className="gap" />

        <button
          className="btn-ghost"
          style={{ textAlign: 'center' }}
          onClick={() => {
            haptic('tap');
            onClose();
          }}
        >
          ‹ zurück
        </button>
      </div>
    </div>
  );
}

function Sparkline({
  buckets,
  max,
}: {
  buckets: { weekStart: Date; count: number; uniquePeople: number }[];
  max: number;
}) {
  const today = todayDate();
  const todayMonday = (() => {
    const dow = today.getDay();
    return addDays(today, -((dow + 6) % 7));
  })();
  const todayMondayIso = isoDate(todayMonday);

  return (
    <div
      style={{
        display: 'flex',
        gap: 4,
        height: 80,
        alignItems: 'flex-end',
        marginTop: 14,
        paddingBottom: 22,
        position: 'relative',
        borderBottom: '1px solid var(--hair)',
      }}
    >
      {buckets.map((b, i) => {
        const h = max > 0 ? (b.count / max) * 60 : 0;
        const isCurrent = isoDate(b.weekStart) === todayMondayIso;
        const showLabel = i === 0 || i === buckets.length - 1 || isCurrent;
        return (
          <div
            key={i}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              position: 'relative',
              height: '100%',
              justifyContent: 'flex-end',
            }}
          >
            <div
              style={{
                width: '100%',
                height: Math.max(2, h),
                background: isCurrent ? 'var(--text)' : 'var(--hair-strong)',
                borderRadius: 2,
                transition: 'height 0.3s ease',
              }}
            />
            <span
              style={{
                fontFamily: 'var(--mono)',
                fontSize: 9,
                color: isCurrent ? 'var(--text)' : 'var(--text-3)',
                position: 'absolute',
                bottom: -18,
                whiteSpace: 'nowrap',
              }}
            >
              {showLabel
                ? `${b.weekStart.getDate()}.${b.weekStart.getMonth() + 1}`
                : ''}
            </span>
            {b.count > 0 && (
              <span
                style={{
                  fontFamily: 'var(--mono)',
                  fontSize: 9,
                  color: isCurrent ? 'var(--text)' : 'var(--text-2)',
                  position: 'absolute',
                  top: -14,
                }}
              >
                {b.count}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function DowChart({ dow, max }: { dow: { day: string; count: number }[]; max: number }) {
  // Reorder Mon..Sun
  const order = [1, 2, 3, 4, 5, 6, 0];
  const ordered = order.map(i => dow[i]);
  return (
    <div
      style={{
        display: 'flex',
        gap: 6,
        height: 50,
        alignItems: 'flex-end',
        marginTop: 14,
        paddingBottom: 18,
        position: 'relative',
      }}
    >
      {ordered.map((d, i) => {
        const h = max > 0 ? (d.count / max) * 36 : 0;
        return (
          <div
            key={i}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              position: 'relative',
              height: '100%',
              justifyContent: 'flex-end',
            }}
          >
            <div
              style={{
                width: '100%',
                height: Math.max(2, h),
                background: 'var(--hair-strong)',
                borderRadius: 2,
              }}
            />
            <span
              style={{
                fontFamily: 'var(--mono)',
                fontSize: 9,
                color: 'var(--text-3)',
                position: 'absolute',
                bottom: -16,
              }}
            >
              {d.day}
            </span>
          </div>
        );
      })}
    </div>
  );
}
