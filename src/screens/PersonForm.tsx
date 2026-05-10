import { useState } from 'react';
import { PrimaryButton, GhostButton, BackButton } from '../components/Buttons';
import { Lbl } from '../components/Lbl';
import { useStore } from '../store/store';
import { todayISO } from '../lib/date';
import { LEVELS, levelLabel } from '../lib/domain';
import { toast } from '../lib/toast';
import type { Level } from '../types';

interface Props {
  id: number | null;
  onClose: () => void;
}

export function PersonForm({ id, onClose }: Props) {
  const existing = useStore(s => (id ? s.kontakte.find(k => k.id === id) ?? null : null));
  const addPerson = useStore(s => s.addPerson);
  const updatePerson = useStore(s => s.updatePerson);

  const [name, setName] = useState(existing?.name ?? '');
  const [level, setLevel] = useState<Level>(existing?.level ?? 'close');
  const [bday, setBday] = useState(existing?.bday ?? '');
  const [last, setLast] = useState(existing?.last_contact ?? todayISO());
  const [note, setNote] = useState(existing?.note ?? '');

  const save = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (existing) {
      await updatePerson(existing.id, {
        name: trimmed,
        level,
        bday: bday || null,
        last_contact: last || null,
        note: note.trim() || null,
      });
      toast('gespeichert');
    } else {
      await addPerson({
        name: trimmed,
        level,
        bday: bday || null,
        last_contact: last || null,
        note: note.trim() || null,
      });
      toast('eingetragen');
    }
    onClose();
  };

  return (
    <div className="full">
      <div className="full-inner">
        <BackButton onClick={onClose} />
        <div className="scr-h1" style={{ marginBottom: 24 }}>
          {existing ? 'Bearbeiten' : 'Person eintragen'}
        </div>

        <Lbl>name</Lbl>
        <input
          className="input"
          placeholder="Name"
          autoComplete="off"
          autoFocus={!existing}
          value={name}
          onChange={e => setName(e.target.value)}
        />

        <div className="gap" />
        <Lbl>nähe</Lbl>
        <div style={{ display: 'flex', gap: 18, marginTop: 10, fontFamily: 'var(--mono)', fontSize: 13 }}>
          {LEVELS.map(l => (
            <button
              key={l}
              onClick={() => setLevel(l)}
              style={{
                background: 'none',
                border: 'none',
                padding: '4px 0',
                cursor: 'pointer',
                color: level === l ? 'var(--text)' : 'var(--text-3)',
                borderBottom: level === l ? '1px solid var(--text)' : '1px solid transparent',
              }}
            >
              {levelLabel(l)}
            </button>
          ))}
        </div>

        <div className="gap" />
        <Lbl>geburtstag</Lbl>
        <input
          className="input mono"
          type="date"
          value={bday ?? ''}
          onChange={e => setBday(e.target.value)}
        />

        <div className="gap" />
        <Lbl>letzter kontakt</Lbl>
        <input
          className="input mono"
          type="date"
          value={last ?? ''}
          onChange={e => setLast(e.target.value)}
        />

        <div className="gap" />
        <Lbl>notiz</Lbl>
        <textarea
          className="input"
          placeholder="z.B. ruft lieber an"
          value={note ?? ''}
          onChange={e => setNote(e.target.value)}
          rows={4}
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
