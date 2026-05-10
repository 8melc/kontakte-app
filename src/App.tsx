import { useEffect, useState } from 'react';
import { BottomNav } from './components/BottomNav';
import { Fab } from './components/Fab';
import { Toast } from './components/Toast';
import { Heute } from './screens/Heute';
import { Personen } from './screens/Personen';
import { Anlaesse } from './screens/Anlaesse';
import { Mehr } from './screens/Mehr';
import { PersonDetail } from './screens/PersonDetail';
import { AnlassDetail } from './screens/AnlassDetail';
import { PersonForm } from './screens/PersonForm';
import { AnlassForm } from './screens/AnlassForm';
import { AktionForm } from './screens/AktionForm';
import { NoteForm } from './screens/NoteForm';
import { MeldungForm } from './screens/MeldungForm';
import { QuickAdd } from './screens/QuickAdd';
import { useStore } from './store/store';
import { usePersistedState } from './hooks/usePersistedState';
import { usePullToRefresh } from './hooks/usePullToRefresh';
import type { Tab } from './types';

import './styles/tokens.css';
import './styles/base.css';
import './styles/primitives.css';

export type Overlay =
  | { kind: 'none' }
  | { kind: 'person-detail'; id: number }
  | { kind: 'anlass-detail'; id: number }
  | { kind: 'person-form'; id: number | null }
  | { kind: 'anlass-form'; id: number | null }
  | { kind: 'aktion-form'; anlassId: number }
  | { kind: 'note-form'; personId: number }
  | { kind: 'meldung-form' }
  | { kind: 'quick-add' };

export default function App() {
  const [tab, setTab] = usePersistedState<Tab>('ros_tab', 'heute');
  const [overlay, setOverlay] = useState<Overlay>({ kind: 'none' });
  const loadAll = useStore(s => s.loadAll);
  const refresh = useStore(s => s.refresh);
  const loaded = useStore(s => s.loaded);

  useEffect(() => {
    if (!loaded) loadAll();
  }, [loaded, loadAll]);

  const close = () => setOverlay({ kind: 'none' });

  const { ref: bodyRef, pull, refreshing } = usePullToRefresh({
    onRefresh: () => refresh(),
  });

  return (
    <div className="app">
      <main
        className="app-body"
        ref={bodyRef}
        style={
          pull > 0
            ? { transform: `translateY(${pull}px)`, transition: 'none' }
            : refreshing
            ? { transform: `translateY(40px)`, transition: 'transform 0.2s ease' }
            : { transition: 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)' }
        }
      >
        {(pull > 0 || refreshing) && (
          <div
            className="ptr-indicator"
            style={{
              top: -32,
              opacity: Math.min(1, pull / 60),
            }}
          >
            {refreshing ? 'aktualisiert…' : pull >= 70 ? 'loslassen' : 'ziehen'}
          </div>
        )}
        {tab === 'heute' && <Heute openOverlay={setOverlay} />}
        {tab === 'personen' && <Personen openOverlay={setOverlay} />}
        {tab === 'anlaesse' && <Anlaesse openOverlay={setOverlay} />}
        {tab === 'mehr' && <Mehr openOverlay={setOverlay} />}
      </main>

      <Fab onClick={() => setOverlay({ kind: 'quick-add' })} />
      <BottomNav value={tab} onChange={t => setTab(t)} />

      {/* Overlays */}
      {overlay.kind === 'person-detail' && (
        <PersonDetail id={overlay.id} onClose={close} openOverlay={setOverlay} />
      )}
      {overlay.kind === 'anlass-detail' && (
        <AnlassDetail id={overlay.id} onClose={close} openOverlay={setOverlay} />
      )}
      {overlay.kind === 'person-form' && (
        <PersonForm id={overlay.id} onClose={close} />
      )}
      {overlay.kind === 'anlass-form' && (
        <AnlassForm id={overlay.id} onClose={close} />
      )}
      {overlay.kind === 'aktion-form' && (
        <AktionForm anlassId={overlay.anlassId} onClose={close} />
      )}
      {overlay.kind === 'note-form' && (
        <NoteForm personId={overlay.personId} onClose={close} />
      )}
      {overlay.kind === 'meldung-form' && <MeldungForm onClose={close} />}
      <QuickAdd
        open={overlay.kind === 'quick-add'}
        onClose={close}
        openOverlay={setOverlay}
      />

      <Toast />
    </div>
  );
}
