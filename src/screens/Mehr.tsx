import { List, Row, Name, Meta } from '../components/List';
import { Lbl } from '../components/Lbl';
import { useStore } from '../store/store';
import { haptic } from '../hooks/useHaptic';
import { DEFAULT_SETTINGS } from '../types';
import { toast } from '../lib/toast';
import type { Overlay } from '../App';

interface Props {
  openOverlay: (o: Overlay) => void;
}

export function Mehr({ openOverlay }: Props) {
  const settings = useStore(s => s.settings);
  const updateSettings = useStore(s => s.updateSettings);
  const resetSettings = useStore(s => s.resetSettings);
  const refresh = useStore(s => s.refresh);

  const onChange = (key: keyof typeof DEFAULT_SETTINGS) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseInt(e.target.value, 10);
    if (!isNaN(v)) updateSettings({ [key]: v } as Partial<typeof DEFAULT_SETTINGS>);
  };

  return (
    <>
      <header className="scr-head">
        <div className="scr-h1">Mehr</div>
        <div className="scr-sub">einstellungen · features</div>
      </header>
      <div className="scr-body">
        <Lbl>einsicht</Lbl>
        <List>
          <Row
            className="tappable"
            onClick={() => {
              haptic('tap');
              openOverlay({ kind: 'statistik' });
            }}
          >
            <Name sub="streaks · trends · dein muster">Statistik</Name>
            <Meta>›</Meta>
          </Row>
        </List>

        <div className="gap" />

        <Lbl>kontaktrhythmus</Lbl>
        <List>
          <Row>
            <Name sub="ziel in tagen">inner circle</Name>
            <input
              className="input mono"
              type="number"
              min={1}
              max={365}
              value={settings.freq_inner}
              onChange={onChange('freq_inner')}
              style={{ width: 64, textAlign: 'right', padding: '6px 0' }}
            />
          </Row>
          <Row>
            <Name sub="ziel in tagen">eng</Name>
            <input
              className="input mono"
              type="number"
              min={1}
              max={365}
              value={settings.freq_close}
              onChange={onChange('freq_close')}
              style={{ width: 64, textAlign: 'right', padding: '6px 0' }}
            />
          </Row>
          <Row>
            <Name sub="ziel in tagen">mittel</Name>
            <input
              className="input mono"
              type="number"
              min={1}
              max={365}
              value={settings.freq_mid}
              onChange={onChange('freq_mid')}
              style={{ width: 64, textAlign: 'right', padding: '6px 0' }}
            />
          </Row>
          <Row dim>
            <Name sub="kein tracking">locker</Name>
            <Meta>—</Meta>
          </Row>
        </List>

        <div className="gap" />

        <Lbl>geburtstag</Lbl>
        <List>
          <Row>
            <Name sub="tage vor dem geburtstag">vorlauf</Name>
            <input
              className="input mono"
              type="number"
              min={0}
              max={30}
              value={settings.bday_vorlauf}
              onChange={onChange('bday_vorlauf')}
              style={{ width: 64, textAlign: 'right', padding: '6px 0' }}
            />
          </Row>
        </List>

        <div className="gap" />

        <Lbl>bald</Lbl>
        <List>
          <Row dim>
            <Name sub="langform-notizen pro person">Geschichten</Name>
            <Meta>bald</Meta>
          </Row>
          <Row dim>
            <Name sub="gesprächsfäden über mehrere personen">Themen</Name>
            <Meta>bald</Meta>
          </Row>
          <Row dim>
            <Name sub="wer driftet, was schläft ein">Stille</Name>
            <Meta>bald</Meta>
          </Row>
        </List>

        <div className="gap" />

        <Lbl>daten</Lbl>
        <List>
          <Row
            className="tappable"
            onClick={async () => {
              haptic('tap');
              await refresh();
              toast('aktualisiert');
            }}
          >
            <Name sub="aus supabase">aktualisieren</Name>
            <Meta>›</Meta>
          </Row>
          <Row
            className="tappable"
            onClick={() => {
              if (confirm('einstellungen zurücksetzen?')) {
                resetSettings();
                toast('zurückgesetzt');
              }
            }}
          >
            <Name sub="frequenz, vorlauf">einstellungen zurücksetzen</Name>
            <Meta>›</Meta>
          </Row>
        </List>

        <div className="gap" />

        <div
          style={{
            padding: '20px 0',
            fontFamily: 'var(--mono)',
            fontSize: 11,
            color: 'var(--text-3)',
            lineHeight: 1.7,
            textAlign: 'center',
          }}
        >
          InTouch v2 · vanilla → react/vite
          <br />
          dein externes gehirn für beziehungen.
        </div>
      </div>
    </>
  );
}
