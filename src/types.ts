export type Level = 'inner' | 'close' | 'mid' | 'loose';

export type AnlassTyp = 'feiertag' | 'geburtstag' | 'einmalig' | 'treffen' | 'event' | 'reise';

export interface Kontakt {
  id: number;
  name: string;
  level: Level;
  bday: string | null;
  last_contact: string | null;
  note: string | null;
  created_at: string;
}

export interface Anlass {
  id: number;
  titel: string;
  datum: string;
  typ: AnlassTyp | string;
  wiederkehrend: boolean;
  notiz: string | null;
  created_at: string;
}

export interface Aktion {
  id: number;
  anlass_id: number;
  kontakt_id: number;
  was: string;
  vorlauf_tage: number;
  erledigt: boolean;
  created_at: string;
}

export type Urgency = 'urgent' | 'soon' | 'ok' | 'neutral';

export type Tab = 'heute' | 'personen' | 'anlaesse' | 'mehr';

export interface Settings {
  freq_inner: number;
  freq_close: number;
  freq_mid: number;
  freq_loose: number;
  bday_vorlauf: number;
}

export const DEFAULT_SETTINGS: Settings = {
  freq_inner: 8,
  freq_close: 16,
  freq_mid: 45,
  freq_loose: 999,
  bday_vorlauf: 3,
};
