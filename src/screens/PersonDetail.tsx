import { useMemo, useState } from 'react';
import { List, Row, Name, Meta } from '../components/List';
import { Lbl } from '../components/Lbl';
import { PrimaryButton, GhostButton, BackButton } from '../components/Buttons';
import { Avatar } from '../components/Avatar';
import { useStore } from '../store/store';
import { haptic } from '../hooks/useHaptic';
import {
  daysSince,
  daysUntilBday,
  formatDateGerman,
  formatDateShort,
  formatDaysAgoLong,
  upcomingFromAnlass,
  daysBetween,
  todayDate,
} from '../lib/date';
import { levelLabelLong, threshold, urgency } from '../lib/domain';
import { toast } from '../lib/toast';
import type { Overlay } from '../App';

interface Props {
  id: number;
  onClose: () => void;
  openOverlay: (o: Overlay) => void;
}

export function PersonDetail({ id, onClose, openOverlay }: Props) {
  const k = useStore(s => s.kontakte.find(x => x.id === id));
  const aktionen = useStore(s => s.aktionen);
  const anlaesse = useStore(s => s.anlaesse);
  const settings = useStore(s => s.settings);
  const markContacted = useStore(s => s.markContacted);
  const deletePerson = useStore(s => s.deletePerson);
  const toggleAktion = useStore(s => s.toggleAktion);

  const [confirming, setConfirming] = useState(false);

  const personAktionen = useMemo(
    () => aktionen.filter(a => a.kontakt_id === id),
    [aktionen, id]
  );
  const personAnlaesse = useMemo(() => {
    const ids = [...new Set(personAktionen.map(a => a.anlass_id))];
    return ids
      .map(aid => anlaesse.find(a => a.id === aid))
      .filter((a): a is NonNullable<typeof a> => Boolean(a));
  }, [personAktionen, anlaesse]);

  if (!k) {
    return (
      <div className="full">
        <div className="full-inner">
          <BackButton onClick={onClose} />
          <Empty>person nicht gefunden.</Empty>
        </div>
      </div>
    );
  }

  const u = urgency(k, settings);
  const ds = daysSince(k.last_contact);
  const t = threshold(k.level, settings);
  const subTone =
    u === 'urgent' ? 'var(--red)' : u === 'soon' ? 'var(--amber)' : 'var(--text-2)';
  const bdayDays = daysUntilBday(k.bday);
  const ziel = t >= 999 ? 'kein ziel' : `ziel ${t}T`;
  const headerSub =
    ds === 9999
      ? `${levelLabelLong(k.level)} · noch nie gemeldet`
      : u === 'urgent'
      ? `${ds} Tage stille · ${ziel}`
      : `${formatDaysAgoLong(ds)} · ${ziel}`;

  const openAk = personAktionen.filter(a => !a.erledigt);

  // Verlauf — currently only "letzter Kontakt" event derived from k.last_contact + completed aktionen
  const verlauf: { title: string; sub?: string; date: string }[] = [];
  if (k.last_contact) {
    verlauf.push({
      title: 'Gemeldet',
      sub: 'manuell eingetragen',
      date: formatDateShort(k.last_contact)!,
    });
  }
  personAktionen
    .filter(a => a.erledigt)
    .forEach(ak => {
      const an = anlaesse.find(a => a.id === ak.anlass_id);
      verlauf.push({ title: ak.was, sub: an?.titel, date: '—' });
    });

  return (
    <div className="full">
      <div className="full-inner">
        <BackButton onClick={onClose} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
          <Avatar name={k.name} size="lg" urgent={u === 'urgent'} />
          <div>
            <div className="scr-h1" style={{ fontSize: 28 }}>
              {k.name}
            </div>
            <div className="scr-sub" style={{ color: subTone }}>
              {headerSub}
            </div>
          </div>
        </div>

        <Lbl>letzter kontakt</Lbl>
        <List>
          <Row>
            <Name sub={k.last_contact ? formatDateGerman(k.last_contact) : 'noch nie'}>
              {k.last_contact ? formatDaysAgoLong(ds) : '—'}
            </Name>
          </Row>
        </List>

        <div className="gap" />

        <Lbl>was du weißt</Lbl>
        <List>
          <Row>
            <Name>nähe</Name>
            <Meta>{levelLabelLong(k.level)}</Meta>
          </Row>
          {k.bday && (
            <Row>
              <Name>geburtstag</Name>
              <Meta>
                {formatDateShort(k.bday)}
                {bdayDays !== null ? ` · in ${bdayDays}T` : ''}
              </Meta>
            </Row>
          )}
          {k.note && (
            <Row>
              <Name>notiz</Name>
              <span
                className="meta"
                style={{
                  fontFamily: 'var(--sans)',
                  fontSize: 13,
                  whiteSpace: 'pre-wrap',
                  color: 'var(--text)',
                  textAlign: 'right',
                  maxWidth: '60%',
                }}
              >
                {k.note}
              </span>
            </Row>
          )}
        </List>

        {personAnlaesse.length > 0 && (
          <>
            <div className="gap" />
            <Lbl>anlässe</Lbl>
            <List>
              {personAnlaesse.map(a => {
                const date = upcomingFromAnlass(a);
                const days = daysBetween(todayDate(), date);
                return (
                  <Row
                    key={a.id}
                    className="tappable"
                    onClick={() => {
                      haptic('tap');
                      onClose();
                      openOverlay({ kind: 'anlass-detail', id: a.id });
                    }}
                  >
                    <Name sub={a.typ}>{a.titel}</Name>
                    <Meta>{days >= 0 ? `${days}T` : '—'}</Meta>
                  </Row>
                );
              })}
            </List>
          </>
        )}

        {openAk.length > 0 && (
          <>
            <div className="gap" />
            <Lbl>offene aufgaben</Lbl>
            <List>
              {openAk.map(ak => {
                const an = anlaesse.find(a => a.id === ak.anlass_id);
                return (
                  <Row
                    key={ak.id}
                    className="tappable"
                    onClick={() => {
                      haptic('soft');
                      toggleAktion(ak.id);
                    }}
                  >
                    <Name sub={an?.titel}>{ak.was}</Name>
                    <Meta>{ak.vorlauf_tage || 0}T</Meta>
                  </Row>
                );
              })}
            </List>
          </>
        )}

        {verlauf.length > 0 && (
          <>
            <div className="gap" />
            <Lbl>verlauf</Lbl>
            <List>
              {verlauf.map((v, i) => (
                <Row key={i}>
                  <Name sub={v.sub}>{v.title}</Name>
                  <Meta>{v.date}</Meta>
                </Row>
              ))}
            </List>
          </>
        )}

        <div className="gap lg" />

        <PrimaryButton
          onClick={() => {
            haptic('success');
            markContacted(k.id);
            toast(`gemeldet — ${k.name}`);
            onClose();
          }}
        >
          Heute gemeldet
        </PrimaryButton>

        <GhostButton onClick={() => openOverlay({ kind: 'note-form', personId: k.id })}>
          + Notiz hinzufügen
        </GhostButton>
        <GhostButton
          onClick={() => {
            onClose();
            openOverlay({ kind: 'person-form', id: k.id });
          }}
        >
          Person bearbeiten
        </GhostButton>

        <div className="gap" />

        {!confirming ? (
          <button
            className="btn-ghost"
            style={{ color: 'var(--red)', textAlign: 'center' }}
            onClick={() => setConfirming(true)}
          >
            Person löschen
          </button>
        ) : (
          <div style={{ display: 'flex', gap: 8, paddingTop: 14, borderTop: '1px solid var(--hair)' }}>
            <button
              className="btn-ghost"
              style={{ flex: 1, textAlign: 'center', borderTop: 'none' }}
              onClick={() => setConfirming(false)}
            >
              abbrechen
            </button>
            <button
              className="btn-ghost"
              style={{ flex: 1, color: 'var(--red)', textAlign: 'center', borderTop: 'none' }}
              onClick={async () => {
                await deletePerson(k.id);
                toast('gelöscht');
                onClose();
              }}
            >
              endgültig löschen
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="empty">{children}</div>;
}
