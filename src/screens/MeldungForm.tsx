import { useMemo, useState } from 'react';
import { List, Row, Name, Meta, Dot } from '../components/List';
import { Lbl } from '../components/Lbl';
import { PrimaryButton } from '../components/Buttons';
import { useStore } from '../store/store';
import { haptic } from '../hooks/useHaptic';
import { daysSince, formatDaysAgo } from '../lib/date';
import { levelLabelLong, urgency } from '../lib/domain';
import { toast } from '../lib/toast';

interface Props {
  onClose: () => void;
}

export function MeldungForm({ onClose }: Props) {
  const kontakte = useStore(s => s.kontakte);
  const settings = useStore(s => s.settings);
  const addAktion = useStore(s => s.addAktion);
  const addAnlass = useStore(s => s.addAnlass);

  const [search, setSearch] = useState('');
  const [kontaktId, setKontaktId] = useState<number | null>(null);
  const [notiz, setNotiz] = useState('');
  const [alsAnlass, setAlsAnlass] = useState(false);
  const [datum, setDatum] = useState('');
  const [wiederkehrend, setWiederkehrend] = useState(false);

  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) {
      return [...kontakte]
        .sort((a, b) => {
          const ua = urgency(a, settings) === 'urgent' ? 0 : 1;
          const ub = urgency(b, settings) === 'urgent' ? 0 : 1;
          if (ua !== ub) return ua - ub;
          return a.name.localeCompare(b.name, 'de');
        })
        .slice(0, 8);
    }
    return kontakte.filter(k => k.name.toLowerCase().includes(q)).slice(0, 12);
  }, [kontakte, search, settings]);

  const selected = kontakte.find(k => k.id === kontaktId);

  const save = async () => {
    if (!kontaktId || !notiz.trim()) return;
    haptic('success');
    let anlass_id: number | null = null;
    if (alsAnlass && datum) {
      const created = await addAnlass({
        titel: notiz.trim(),
        datum,
        typ: 'einmalig',
        wiederkehrend,
        notiz: null,
      });
      if (created) anlass_id = created.id;
    }
    await addAktion({
      anlass_id,
      kontakt_id: kontaktId,
      was: notiz.trim(),
      vorlauf_tage: 0,
      erledigt: false,
    });
    toast('eingetragen');
    onClose();
  };

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
          Will mich melden
        </div>
        <div className="scr-sub">person + was du tun willst</div>

        <div className="gap" />

        <Lbl>person</Lbl>
        {selected ? (
          <Row
            className="tappable"
            onClick={() => {
              setKontaktId(null);
              setSearch('');
            }}
          >
            <Name sub={levelLabelLong(selected.level)}>{selected.name}</Name>
            <Meta>ändern ›</Meta>
          </Row>
        ) : (
          <>
            <input
              className="input mono"
              placeholder="suchen…"
              value={search}
              autoFocus
              onChange={e => setSearch(e.target.value)}
              style={{ marginTop: 10 }}
            />
            <List>
              {list.map(k => {
                const u = urgency(k, settings);
                const ds = daysSince(k.last_contact);
                return (
                  <Row
                    key={k.id}
                    className="tappable"
                    onClick={() => {
                      haptic('tap');
                      setKontaktId(k.id);
                    }}
                  >
                    {u === 'urgent' && <Dot tone="r" />}
                    {u === 'soon' && <Dot tone="a" />}
                    <Name sub={levelLabelLong(k.level)}>{k.name}</Name>
                    <Meta tone={u === 'urgent' ? 'r' : u === 'soon' ? 'a' : undefined}>
                      {formatDaysAgo(ds)}
                    </Meta>
                  </Row>
                );
              })}
            </List>
          </>
        )}

        <div className="gap" />

        <Lbl>was willst du tun?</Lbl>
        <textarea
          className="input"
          rows={3}
          placeholder="z.B. Mama schreiben — Muttertag"
          value={notiz}
          onChange={e => setNotiz(e.target.value)}
          style={{ marginTop: 10 }}
        />

        <div className="gap" />

        <Lbl>optional</Lbl>
        <List>
          <Row
            className="tappable"
            onClick={() => {
              haptic('tap');
              setAlsAnlass(prev => !prev);
            }}
          >
            <Name sub="datum, taucht in anlässe auf">auch als anlass speichern</Name>
            <Meta tone={alsAnlass ? 'g' : undefined}>{alsAnlass ? '✓ an' : 'aus'}</Meta>
          </Row>
        </List>

        {alsAnlass && (
          <>
            <div className="gap" />
            <Lbl>datum</Lbl>
            <input
              className="input mono"
              type="date"
              value={datum}
              onChange={e => setDatum(e.target.value)}
              style={{ marginTop: 10 }}
            />

            <div className="gap" />
            <Lbl>wiederkehrend</Lbl>
            <List>
              <Row
                className="tappable"
                onClick={() => {
                  haptic('tap');
                  setWiederkehrend(prev => !prev);
                }}
              >
                <Name sub="z.B. muttertag, geburtstag">jährlich wiederholen</Name>
                <Meta tone={wiederkehrend ? 'g' : undefined}>
                  {wiederkehrend ? '✓ ja' : 'nein'}
                </Meta>
              </Row>
            </List>
          </>
        )}

        <div className="gap lg" />

        <PrimaryButton
          onClick={save}
          disabled={!kontaktId || !notiz.trim() || (alsAnlass && !datum)}
        >
          Speichern
        </PrimaryButton>

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
