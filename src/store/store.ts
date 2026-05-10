import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { todayISO } from '../lib/date';
import {
  DEFAULT_SETTINGS,
  type Aktion,
  type Anlass,
  type EventKind,
  type EventSource,
  type Kontakt,
  type KontaktEvent,
  type Settings,
} from '../types';

interface State {
  kontakte: Kontakt[];
  anlaesse: Anlass[];
  aktionen: Aktion[];
  events: KontaktEvent[];
  eventsTableMissing: boolean;
  loaded: boolean;
  loading: boolean;
  settings: Settings;

  loadAll: () => Promise<void>;
  refresh: () => Promise<void>;

  updateSettings: (patch: Partial<Settings>) => void;
  resetSettings: () => void;

  // Person ops
  addPerson: (input: Omit<Kontakt, 'id' | 'created_at'>) => Promise<Kontakt | null>;
  updatePerson: (id: number, patch: Partial<Kontakt>) => Promise<void>;
  deletePerson: (id: number) => Promise<void>;
  markContacted: (id: number, opts?: { source?: EventSource; kind?: EventKind }) => Promise<void>;
  logEvent: (kontakt_id: number, opts?: { source?: EventSource; kind?: EventKind }) => Promise<void>;

  // Anlass ops
  addAnlass: (input: Omit<Anlass, 'id' | 'created_at'>) => Promise<Anlass | null>;
  updateAnlass: (id: number, patch: Partial<Anlass>) => Promise<void>;
  deleteAnlass: (id: number) => Promise<void>;

  // Aktion ops
  addAktion: (input: Omit<Aktion, 'id' | 'created_at'>) => Promise<Aktion | null>;
  toggleAktion: (id: number) => Promise<void>;
  deleteAktion: (id: number) => Promise<void>;
}

const SETTINGS_KEY = 'ros_settings';

function loadSettings(): Settings {
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettings(s: Settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    // ignore
  }
}

export const useStore = create<State>((set, get) => ({
  kontakte: [],
  anlaesse: [],
  aktionen: [],
  events: [],
  eventsTableMissing: false,
  loaded: false,
  loading: false,
  settings: loadSettings(),

  async loadAll() {
    set({ loading: true });
    const [k, a, ak, ev] = await Promise.all([
      supabase.from('kontakte').select('*').order('created_at', { ascending: false }),
      supabase.from('anlaesse').select('*').order('datum', { ascending: true }),
      supabase.from('aktionen').select('*').order('created_at', { ascending: false }),
      supabase
        .from('kontakt_events')
        .select('*')
        .order('ts', { ascending: false })
        .limit(2000),
    ]);
    set({
      kontakte: (k.data ?? []) as Kontakt[],
      anlaesse: (a.data ?? []) as Anlass[],
      aktionen: (ak.data ?? []) as Aktion[],
      events: (ev.data ?? []) as KontaktEvent[],
      eventsTableMissing: !!ev.error,
      loaded: true,
      loading: false,
    });
  },

  async logEvent(kontakt_id, opts = {}) {
    if (get().eventsTableMissing) return;
    const optimistic: KontaktEvent = {
      id: -Date.now(),
      kontakt_id,
      ts: new Date().toISOString(),
      source: opts.source ?? 'manual',
      kind: opts.kind ?? 'gemeldet',
      created_at: new Date().toISOString(),
    };
    set(s => ({ events: [optimistic, ...s.events] }));
    const { data, error } = await supabase
      .from('kontakt_events')
      .insert({
        kontakt_id,
        source: opts.source ?? 'manual',
        kind: opts.kind ?? 'gemeldet',
      })
      .select()
      .single();
    if (error) {
      set(s => ({ events: s.events.filter(e => e.id !== optimistic.id) }));
      // If table doesn't exist (PGRST205), mark missing so we stop trying
      if (error.code === 'PGRST205' || error.code === '42P01') {
        set({ eventsTableMissing: true });
      }
      return;
    }
    if (data) {
      set(s => ({
        events: s.events.map(e => (e.id === optimistic.id ? (data as KontaktEvent) : e)),
      }));
    }
  },

  async refresh() {
    return get().loadAll();
  },

  updateSettings(patch) {
    const next = { ...get().settings, ...patch };
    set({ settings: next });
    saveSettings(next);
  },

  resetSettings() {
    set({ settings: { ...DEFAULT_SETTINGS } });
    saveSettings({ ...DEFAULT_SETTINGS });
  },

  async addPerson(input) {
    // optimistic temp row
    const tempId = -Date.now();
    const optimistic: Kontakt = {
      id: tempId,
      created_at: new Date().toISOString(),
      ...input,
    };
    set(s => ({ kontakte: [optimistic, ...s.kontakte] }));
    const { data, error } = await supabase.from('kontakte').insert(input).select().single();
    if (error || !data) {
      set(s => ({ kontakte: s.kontakte.filter(k => k.id !== tempId) }));
      return null;
    }
    set(s => ({
      kontakte: s.kontakte.map(k => (k.id === tempId ? (data as Kontakt) : k)),
    }));
    return data as Kontakt;
  },

  async updatePerson(id, patch) {
    const prev = get().kontakte.find(k => k.id === id);
    if (!prev) return;
    set(s => ({
      kontakte: s.kontakte.map(k => (k.id === id ? { ...k, ...patch } : k)),
    }));
    const { data, error } = await supabase.from('kontakte').update(patch).eq('id', id).select().single();
    if (error) {
      set(s => ({ kontakte: s.kontakte.map(k => (k.id === id ? prev : k)) }));
      return;
    }
    if (data) {
      set(s => ({
        kontakte: s.kontakte.map(k => (k.id === id ? (data as Kontakt) : k)),
      }));
    }
  },

  async deletePerson(id) {
    const prev = get().kontakte;
    const prevAk = get().aktionen;
    set(s => ({
      kontakte: s.kontakte.filter(k => k.id !== id),
      aktionen: s.aktionen.filter(a => a.kontakt_id !== id),
    }));
    await supabase.from('aktionen').delete().eq('kontakt_id', id);
    const { error } = await supabase.from('kontakte').delete().eq('id', id);
    if (error) {
      set({ kontakte: prev, aktionen: prevAk });
    }
  },

  async markContacted(id, opts = {}) {
    await get().updatePerson(id, { last_contact: todayISO() });
    await get().logEvent(id, { source: opts.source ?? 'manual', kind: opts.kind ?? 'gemeldet' });
  },

  async addAnlass(input) {
    const tempId = -Date.now();
    const optimistic: Anlass = {
      id: tempId,
      created_at: new Date().toISOString(),
      ...input,
    };
    set(s => ({ anlaesse: [...s.anlaesse, optimistic] }));
    const { data, error } = await supabase.from('anlaesse').insert(input).select().single();
    if (error || !data) {
      set(s => ({ anlaesse: s.anlaesse.filter(a => a.id !== tempId) }));
      return null;
    }
    set(s => ({
      anlaesse: s.anlaesse.map(a => (a.id === tempId ? (data as Anlass) : a)),
    }));
    return data as Anlass;
  },

  async updateAnlass(id, patch) {
    const prev = get().anlaesse.find(a => a.id === id);
    if (!prev) return;
    set(s => ({
      anlaesse: s.anlaesse.map(a => (a.id === id ? { ...a, ...patch } : a)),
    }));
    const { data, error } = await supabase.from('anlaesse').update(patch).eq('id', id).select().single();
    if (error) {
      set(s => ({ anlaesse: s.anlaesse.map(a => (a.id === id ? prev : a)) }));
      return;
    }
    if (data) {
      set(s => ({
        anlaesse: s.anlaesse.map(a => (a.id === id ? (data as Anlass) : a)),
      }));
    }
  },

  async deleteAnlass(id) {
    const prev = get().anlaesse;
    const prevAk = get().aktionen;
    set(s => ({
      anlaesse: s.anlaesse.filter(a => a.id !== id),
      aktionen: s.aktionen.filter(a => a.anlass_id !== id),
    }));
    await supabase.from('aktionen').delete().eq('anlass_id', id);
    const { error } = await supabase.from('anlaesse').delete().eq('id', id);
    if (error) {
      set({ anlaesse: prev, aktionen: prevAk });
    }
  },

  async addAktion(input) {
    const tempId = -Date.now();
    const optimistic: Aktion = {
      id: tempId,
      created_at: new Date().toISOString(),
      ...input,
    };
    set(s => ({ aktionen: [optimistic, ...s.aktionen] }));
    const { data, error } = await supabase.from('aktionen').insert(input).select().single();
    if (error || !data) {
      set(s => ({ aktionen: s.aktionen.filter(a => a.id !== tempId) }));
      return null;
    }
    set(s => ({
      aktionen: s.aktionen.map(a => (a.id === tempId ? (data as Aktion) : a)),
    }));
    return data as Aktion;
  },

  async toggleAktion(id) {
    const prev = get().aktionen.find(a => a.id === id);
    if (!prev) return;
    const next = !prev.erledigt;
    set(s => ({
      aktionen: s.aktionen.map(a => (a.id === id ? { ...a, erledigt: next } : a)),
    }));
    const { error } = await supabase.from('aktionen').update({ erledigt: next }).eq('id', id);
    if (error) {
      set(s => ({ aktionen: s.aktionen.map(a => (a.id === id ? prev : a)) }));
    }
  },

  async deleteAktion(id) {
    const prev = get().aktionen;
    set(s => ({ aktionen: s.aktionen.filter(a => a.id !== id) }));
    const { error } = await supabase.from('aktionen').delete().eq('id', id);
    if (error) {
      set({ aktionen: prev });
    }
  },
}));
