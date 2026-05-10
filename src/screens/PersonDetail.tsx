import { useEffect, useMemo, useState } from 'react';
import { List, Row, Name, Meta } from '../components/List';
import { Lbl } from '../components/Lbl';
import { PrimaryButton, GhostButton, BackButton } from '../components/Buttons';
import { Avatar } from '../components/Avatar';
import { BottomSheet } from '../components/BottomSheet';
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
  todayISO,
} from '../lib/date';
import { LEVELS, levelLabel, levelLabelLong, threshold, urgency } from '../lib/domain';
import { toast } from '../lib/toast';
import type { Level } from '../types';
import type { Overlay } from '../App';

interface Props {
  id: number;
  onClose: () => void;
  openOverlay: (o: Overlay) => void;
}

type FieldEdit = 'last_contact' | 'level' | 'bday' | null;

export function PersonDetail({ id, onClose, openOverlay }: Props) {
  const k = useStore(s => s.kontakte.find(x => x.id === id));
  const aktionen = useStore(s => s.aktionen);
  const anlaesse = useStore(s => s.anlaesse);
  const settings = useStore(s => s.settings);
  const markContacted = useStore(s => s.markContacted);
  const updatePerson = useStore(s => s.updatePerson);
  const deletePerson = useStore(s => s.deletePerson);
  const toggleAktion = useStore(s => s.toggleAktion);

  const [confirming, setConfirming] = useState(false);
  const [editing, setEditing] = useState<FieldEdit>(null);

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

  // Verlauf
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

  const openEdit = (field: FieldEdit) => {
    haptic('tap');
    setEditing(field);
  };

  return (
    <div className="full">
      <div className="full-inner">
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
          <button
            onClick={() => {
              haptic('soft');
              setConfirming(true);
            }}
            style={{
              background: 'none',
              border: 'none',
              padding: 4,
              cursor: 'pointer',
              fontFamily: 'var(--mono)',
              fontSize: 11,
              color: 'var(--text-3)',
              letterSpacing: '0.04em',
            }}
          >
            löschen
          </button>
        </div>
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
          <Row className="tappable" onClick={() => openEdit('last_contact')}>
            <Name sub={k.last_contact ? formatDateGerman(k.last_contact) : 'noch nie'}>
              {k.last_contact ? formatDaysAgoLong(ds) : '—'}
            </Name>
            <Meta>›</Meta>
          </Row>
        </List>

        <div className="gap" />

        <Lbl>was du weißt</Lbl>
        <List>
          <Row className="tappable" onClick={() => openEdit('level')}>
            <Name>nähe</Name>
            <Meta>{levelLabelLong(k.level)} ›</Meta>
          </Row>
          <Row className="tappable" onClick={() => openEdit('bday')}>
            <Name>geburtstag</Name>
            <Meta>
              {k.bday
                ? `${formatDateShort(k.bday)}${bdayDays !== null ? ` · in ${bdayDays}T` : ''}`
                : '—'}{' '}
              ›
            </Meta>
          </Row>
          <Row
            className="tappable"
            onClick={() => openOverlay({ kind: 'note-form', personId: k.id })}
          >
            <Name>notiz</Name>
            {k.note ? (
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
            ) : (
              <Meta>— ›</Meta>
            )}
          </Row>
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

        {confirming && (
          <div
            style={{
              display: 'flex',
              gap: 8,
              padding: '14px 0',
              borderTop: '1px solid var(--hair)',
              borderBottom: '1px solid var(--hair)',
              marginBottom: 8,
            }}
          >
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
                haptic('warn');
                await deletePerson(k.id);
                toast('gelöscht');
                onClose();
              }}
            >
              endgültig löschen
            </button>
          </div>
        )}

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

      {/* ─── Inline-Edit Sheets ─── */}
      <BottomSheet
        open={editing === 'last_contact'}
        onClose={() => setEditing(null)}
        title="Letzter Kontakt"
        subtitle="wann war's?"
      >
        <DateEditor
          initial={k.last_contact}
          onSave={async (val) => {
            await updatePerson(k.id, { last_contact: val });
            toast('gespeichert');
            setEditing(null);
          }}
          onClear={async () => {
            await updatePerson(k.id, { last_contact: null });
            toast('zurückgesetzt');
            setEditing(null);
          }}
        />
      </BottomSheet>

      <BottomSheet
        open={editing === 'level'}
        onClose={() => setEditing(null)}
        title="Nähe"
        subtitle="wie eng steht ihr euch?"
      >
        <LevelEditor
          initial={k.level}
          onSave={async (val) => {
            await updatePerson(k.id, { level: val });
            toast('gespeichert');
            setEditing(null);
          }}
        />
      </BottomSheet>

      <BottomSheet
        open={editing === 'bday'}
        onClose={() => setEditing(null)}
        title="Geburtstag"
        subtitle="monat + tag genügen"
      >
        <DateEditor
          initial={k.bday}
          onSave={async (val) => {
            await updatePerson(k.id, { bday: val });
            toast('gespeichert');
            setEditing(null);
          }}
          onClear={async () => {
            await updatePerson(k.id, { bday: null });
            toast('entfernt');
            setEditing(null);
          }}
          allowToday={false}
        />
      </BottomSheet>
    </div>
  );
}

function DateEditor({
  initial,
  onSave,
  onClear,
  allowToday = true,
}: {
  initial: string | null;
  onSave: (val: string) => Promise<void>;
  onClear?: () => Promise<void>;
  allowToday?: boolean;
}) {
  const [val, setVal] = useState(initial ?? '');

  // Reset when initial changes (sheet reopened)
  useEffect(() => {
    setVal(initial ?? '');
  }, [initial]);

  return (
    <div>
      <input
        className="input mono"
        type="date"
        autoFocus
        value={val}
        onChange={e => setVal(e.target.value)}
      />
      {allowToday && (
        <div style={{ display: 'flex', gap: 14, marginTop: 14, fontFamily: 'var(--mono)', fontSize: 12 }}>
          <button
            onClick={() => setVal(todayISO())}
            style={{
              background: 'none',
              border: 'none',
              padding: '4px 0',
              color: val === todayISO() ? 'var(--text)' : 'var(--text-3)',
              cursor: 'pointer',
            }}
          >
            heute
          </button>
          <button
            onClick={() => {
              const d = new Date();
              d.setDate(d.getDate() - 1);
              const y = d.getFullYear();
              const m = String(d.getMonth() + 1).padStart(2, '0');
              const dd = String(d.getDate()).padStart(2, '0');
              setVal(`${y}-${m}-${dd}`);
            }}
            style={{
              background: 'none',
              border: 'none',
              padding: '4px 0',
              color: 'var(--text-3)',
              cursor: 'pointer',
            }}
          >
            gestern
          </button>
        </div>
      )}
      <div className="gap" />
      <PrimaryButton
        onClick={() => {
          if (val) {
            haptic('success');
            onSave(val);
          }
        }}
      >
        Speichern
      </PrimaryButton>
      {onClear && initial && (
        <button
          className="btn-ghost"
          style={{ color: 'var(--text-3)', textAlign: 'center' }}
          onClick={() => {
            haptic('soft');
            onClear();
          }}
        >
          zurücksetzen
        </button>
      )}
    </div>
  );
}

function LevelEditor({
  initial,
  onSave,
}: {
  initial: Level;
  onSave: (val: Level) => Promise<void>;
}) {
  const [val, setVal] = useState<Level>(initial);

  useEffect(() => {
    setVal(initial);
  }, [initial]);

  return (
    <div>
      <List>
        {LEVELS.map(l => (
          <Row
            key={l}
            className="tappable"
            onClick={() => {
              haptic('tap');
              setVal(l);
            }}
          >
            <Name
              sub={
                l === 'inner'
                  ? 'engste menschen'
                  : l === 'close'
                  ? 'enge freunde, familie'
                  : l === 'mid'
                  ? 'gute bekannte'
                  : 'kein tracking'
              }
            >
              {levelLabel(l)}
            </Name>
            <Meta>{val === l ? '✓' : ''}</Meta>
          </Row>
        ))}
      </List>
      <div className="gap" />
      <PrimaryButton
        onClick={() => {
          haptic('success');
          onSave(val);
        }}
      >
        Speichern
      </PrimaryButton>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="empty">{children}</div>;
}
