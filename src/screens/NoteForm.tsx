import { useState } from 'react';
import { PrimaryButton, GhostButton, BackButton } from '../components/Buttons';
import { Lbl } from '../components/Lbl';
import { useStore } from '../store/store';
import { toast } from '../lib/toast';

interface Props {
  personId: number;
  onClose: () => void;
}

export function NoteForm({ personId, onClose }: Props) {
  const k = useStore(s => s.kontakte.find(x => x.id === personId));
  const updatePerson = useStore(s => s.updatePerson);

  const [note, setNote] = useState(k?.note ?? '');

  if (!k) {
    return (
      <div className="full">
        <div className="full-inner">
          <BackButton onClick={onClose} />
          <div className="empty">person nicht gefunden.</div>
        </div>
      </div>
    );
  }

  const save = async () => {
    await updatePerson(k.id, { note: note.trim() || null });
    toast('notiz gespeichert');
    onClose();
  };

  return (
    <div className="full">
      <div className="full-inner">
        <BackButton onClick={onClose} />
        <div className="scr-h1" style={{ marginBottom: 4 }}>
          Notiz
        </div>
        <div className="scr-sub">{k.name}</div>

        <div className="gap" />

        <Lbl>was du dir merken willst</Lbl>
        <textarea
          className="input"
          autoFocus
          rows={8}
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="gedanke, fakt, erinnerung…"
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
