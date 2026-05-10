import { useState } from 'react';
import { PrimaryButton, GhostButton, BackButton } from '../components/Buttons';
import { Lbl } from '../components/Lbl';
import { useStore } from '../store/store';
import { todayISO } from '../lib/date';
import { toast } from '../lib/toast';
import type { AnlassTyp } from '../types';

const TYPES: AnlassTyp[] = ['feiertag', 'geburtstag', 'einmalig', 'treffen', 'event', 'reise'];

interface Props {
  id: number | null;
  onClose: () => void;
}

export function AnlassForm({ id, onClose }: Props) {
  const existing = useStore(s => (id ? s.anlaesse.find(a => a.id === id) ?? null : null));
  const addAnlass = useStore(s => s.addAnlass);
  const updateAnlass = useStore(s => s.updateAnlass);
  const addAktion = useStore(s => s.addAktion);
  const kontakte = useStore(s => s.kontakte);

  const [titel, setTitel] = useState(existing?.titel ?? '');
  const [datum, setDatum] = useState(existing?.datum ?? todayISO());
  const [typ, setTyp] = useState<string>(existing?.typ ?? 'einmalig');
  const [wkd, setWkd] = useState<boolean>(existing?.wiederkehrend ?? false);
  const [notiz, setNotiz] = useState(existing?.notiz ?? '');
  const [people, setPeople] = useState<Set<number>>(new Set());
  const [was, setWas] = useState('');
  const [vorlauf, setVorlauf] = useState('3');

  const save = async () => {
    const trimmed = titel.trim();
    if (!trimmed || !datum) return;
    if (existing) {
      await updateAnlass(existing.id, {
        titel: trimmed,
        datum,
        typ,
        wiederkehrend: wkd,
        notiz: notiz.trim() || null,
      });
      toast('gespeichert');
    } else {
      const created = await addAnlass({
        titel: trimmed,
        datum,
        typ,
        wiederkehrend: wkd,
        notiz: notiz.trim() || null,
      });
      if (created && people.size > 0) {
        const wo = was.trim() || trimmed;
        const v = parseInt(vorlauf, 10) || 0;
        for (const kid of people) {
          await addAktion({
            anlass_id: created.id,
            kontakt_id: kid,
            was: wo,
            vorlauf_tage: v,
            erledigt: false,
          });
        }
      }
      toast('anlass angelegt');
    }
    onClose();
  };

  const togglePerson = (kid: number) => {
    setPeople(prev => {
      const next = new Set(prev);
      if (next.has(kid)) next.delete(kid);
      else next.add(kid);
      return next;
    });
  };

  return (
    <div className="full">
      <div className="full-inner">
        <BackButton onClick={onClose} />
        <div className="scr-h1" style={{ marginBottom: 24 }}>
          {existing ? 'Anlass bearbeiten' : 'Neuer Anlass'}
        </div>

        <Lbl>titel</Lbl>
        <input
          className="input"
          placeholder="z.B. Weihnachten"
          autoComplete="off"
          autoFocus={!existing}
          value={titel}
          onChange={e => setTitel(e.target.value)}
        />

        <div className="gap" />
        <Lbl>datum</Lbl>
        <input
          className="input mono"
          type="date"
          value={datum ?? ''}
          onChange={e => setDatum(e.target.value)}
        />

        <div className="gap" />
        <Lbl>typ</Lbl>
        <div
          style={{
            display: 'flex',
            gap: 18,
            marginTop: 10,
            fontFamily: 'var(--mono)',
            fontSize: 13,
            flexWrap: 'wrap',
          }}
        >
          {TYPES.map(t => (
            <button
              key={t}
              onClick={() => setTyp(t)}
              style={{
                background: 'none',
                border: 'none',
                padding: '4px 0',
                cursor: 'pointer',
                color: typ === t ? 'var(--text)' : 'var(--text-3)',
                borderBottom: typ === t ? '1px solid var(--text)' : '1px solid transparent',
              }}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="gap" />
        <Lbl>wiederkehrend</Lbl>
        <div style={{ display: 'flex', gap: 18, marginTop: 10, fontFamily: 'var(--mono)', fontSize: 13 }}>
          {[
            { v: true, l: 'jährlich' },
            { v: false, l: 'einmalig' },
          ].map(o => (
            <button
              key={String(o.v)}
              onClick={() => setWkd(o.v)}
              style={{
                background: 'none',
                border: 'none',
                padding: '4px 0',
                cursor: 'pointer',
                color: wkd === o.v ? 'var(--text)' : 'var(--text-3)',
                borderBottom: wkd === o.v ? '1px solid var(--text)' : '1px solid transparent',
              }}
            >
              {o.l}
            </button>
          ))}
        </div>

        <div className="gap" />
        <Lbl>notiz</Lbl>
        <textarea
          className="input"
          placeholder="z.B. Geschenkideen"
          value={notiz ?? ''}
          onChange={e => setNotiz(e.target.value)}
          rows={3}
        />

        {!existing && (
          <>
            <div className="gap" />
            <Lbl>personen zuordnen</Lbl>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginTop: 10 }}>
              {kontakte.map(k => (
                <button
                  key={k.id}
                  onClick={() => togglePerson(k.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: '4px 0',
                    cursor: 'pointer',
                    color: people.has(k.id) ? 'var(--text)' : 'var(--text-3)',
                    fontFamily: 'var(--sans)',
                    fontSize: 14,
                    borderBottom: people.has(k.id)
                      ? '1px solid var(--text)'
                      : '1px solid transparent',
                  }}
                >
                  {k.name}
                </button>
              ))}
              {kontakte.length === 0 && (
                <span style={{ color: 'var(--text-3)', fontFamily: 'var(--mono)', fontSize: 12 }}>
                  noch keine personen
                </span>
              )}
            </div>

            {people.size > 0 && (
              <>
                <div className="gap" />
                <Lbl>was ist zu tun?</Lbl>
                <input
                  className="input"
                  placeholder={titel || 'z.B. Geschenk besorgen'}
                  value={was}
                  onChange={e => setWas(e.target.value)}
                />

                <div className="gap" />
                <Lbl>vorlauf (tage)</Lbl>
                <input
                  className="input mono"
                  type="number"
                  min={0}
                  value={vorlauf}
                  onChange={e => setVorlauf(e.target.value)}
                />
              </>
            )}
          </>
        )}

        <div className="gap lg" />
        <PrimaryButton onClick={save}>Speichern</PrimaryButton>
        <GhostButton center onClick={onClose}>
          abbrechen
        </GhostButton>
      </div>
    </div>
  );
}
