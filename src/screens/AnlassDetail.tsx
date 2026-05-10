import { useMemo, useState } from 'react';
import { List, Row, Name, Meta } from '../components/List';
import { Lbl } from '../components/Lbl';
import { PrimaryButton, GhostButton, BackButton } from '../components/Buttons';
import { useStore } from '../store/store';
import { haptic } from '../hooks/useHaptic';
import { formatDateGerman, isoDate, upcomingFromAnlass } from '../lib/date';
import { toast } from '../lib/toast';
import type { Overlay } from '../App';

interface Props {
  id: number;
  onClose: () => void;
  openOverlay: (o: Overlay) => void;
}

export function AnlassDetail({ id, onClose, openOverlay }: Props) {
  const a = useStore(s => s.anlaesse.find(x => x.id === id));
  const aktionen = useStore(s => s.aktionen);
  const kontakte = useStore(s => s.kontakte);
  const toggleAktion = useStore(s => s.toggleAktion);
  const deleteAnlass = useStore(s => s.deleteAnlass);
  const [confirming, setConfirming] = useState(false);

  const rel = useMemo(() => aktionen.filter(ak => ak.anlass_id === id), [aktionen, id]);

  if (!a) {
    return (
      <div className="full">
        <div className="full-inner">
          <BackButton onClick={onClose} />
          <div className="empty">anlass nicht gefunden.</div>
        </div>
      </div>
    );
  }

  const effective = upcomingFromAnlass(a);

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
        <div className="scr-h1" style={{ marginBottom: 4 }}>
          {a.titel}
        </div>
        <div className="scr-sub">{formatDateGerman(isoDate(effective))}</div>

        <div className="gap" />

        <Lbl>info</Lbl>
        <List>
          <Row>
            <Name>typ</Name>
            <Meta>{a.typ}</Meta>
          </Row>
          <Row>
            <Name>wiederkehrend</Name>
            <Meta>{a.wiederkehrend ? 'jährlich' : 'einmalig'}</Meta>
          </Row>
          {a.notiz && (
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
                  lineHeight: 1.5,
                }}
              >
                {a.notiz}
              </span>
            </Row>
          )}
        </List>

        {rel.length > 0 && (
          <>
            <div className="gap" />
            <Lbl>aufgaben</Lbl>
            <List>
              {rel.map(ak => {
                const k = kontakte.find(x => x.id === ak.kontakt_id);
                return (
                  <Row
                    key={ak.id}
                    className="tappable"
                    onClick={() => {
                      haptic('soft');
                      toggleAktion(ak.id);
                    }}
                  >
                    <Name
                      sub={`${k?.name ?? '—'} · ${ak.vorlauf_tage || 0}T vorlauf`}
                      className={ak.erledigt ? 'muted' : ''}
                    >
                      <span style={ak.erledigt ? { textDecoration: 'line-through' } : undefined}>
                        {ak.was}
                      </span>
                    </Name>
                    <Meta tone={ak.erledigt ? 'g' : undefined}>{ak.erledigt ? '✓' : '○'}</Meta>
                  </Row>
                );
              })}
            </List>
          </>
        )}

        <div className="gap lg" />

        <PrimaryButton onClick={() => openOverlay({ kind: 'aktion-form', anlassId: a.id })}>
          + Aufgabe hinzufügen
        </PrimaryButton>

        <GhostButton
          onClick={() => {
            onClose();
            openOverlay({ kind: 'anlass-form', id: a.id });
          }}
        >
          Anlass bearbeiten
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
                await deleteAnlass(a.id);
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
    </div>
  );
}
