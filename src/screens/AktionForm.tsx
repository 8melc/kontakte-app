import { useState } from 'react';
import { PrimaryButton, GhostButton, BackButton } from '../components/Buttons';
import { Lbl } from '../components/Lbl';
import { useStore } from '../store/store';
import { toast } from '../lib/toast';

interface Props {
  anlassId: number;
  onClose: () => void;
}

export function AktionForm({ anlassId, onClose }: Props) {
  const a = useStore(s => s.anlaesse.find(x => x.id === anlassId));
  const kontakte = useStore(s => s.kontakte);
  const addAktion = useStore(s => s.addAktion);

  const [kontaktId, setKontaktId] = useState<number | null>(kontakte[0]?.id ?? null);
  const [was, setWas] = useState('');
  const [vorlauf, setVorlauf] = useState('3');

  const save = async () => {
    if (!kontaktId || !was.trim()) return;
    await addAktion({
      anlass_id: anlassId,
      kontakt_id: kontaktId,
      was: was.trim(),
      vorlauf_tage: parseInt(vorlauf, 10) || 0,
      erledigt: false,
    });
    toast('aufgabe angelegt');
    onClose();
  };

  return (
    <div className="full">
      <div className="full-inner">
        <BackButton onClick={onClose} />
        <div className="scr-h1" style={{ marginBottom: 4 }}>
          Aufgabe
        </div>
        <div className="scr-sub">{a?.titel ?? '—'}</div>

        <div className="gap" />

        <Lbl>person</Lbl>
        <select
          className="input mono"
          value={kontaktId ?? ''}
          onChange={e => setKontaktId(parseInt(e.target.value, 10))}
        >
          {kontakte.map(k => (
            <option key={k.id} value={k.id}>
              {k.name}
            </option>
          ))}
        </select>

        <div className="gap" />
        <Lbl>was</Lbl>
        <input
          className="input"
          placeholder="z.B. Karte schreiben"
          autoFocus
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

        <div className="gap lg" />
        <PrimaryButton onClick={save}>Speichern</PrimaryButton>
        <GhostButton center onClick={onClose}>
          abbrechen
        </GhostButton>
      </div>
    </div>
  );
}
