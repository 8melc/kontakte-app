import type { Kontakt, KontaktEvent, Settings } from '../types';
import { addDays, daysSince, isoDate, parseDate, todayDate } from './date';
import { threshold, urgency } from './domain';

export interface RhythmusBreakdown {
  inRhythmus: number;
  driften: number;
  ueberfaellig: number;
  nochNie: number;
}

export function rhythmusBreakdown(kontakte: Kontakt[], settings: Settings): RhythmusBreakdown {
  let inR = 0, drift = 0, over = 0, nie = 0;
  for (const k of kontakte) {
    if (k.level === 'loose') {
      // not tracked
      continue;
    }
    const ds = daysSince(k.last_contact);
    if (ds === 9999) {
      nie++;
      continue;
    }
    const u = urgency(k, settings);
    if (u === 'urgent') over++;
    else if (u === 'soon') drift++;
    else inR++;
  }
  return { inRhythmus: inR, driften: drift, ueberfaellig: over, nochNie: nie };
}

export interface LevelStat {
  level: 'inner' | 'close' | 'mid' | 'loose';
  total: number;
  inRhythmus: number;
  driften: number;
  ueberfaellig: number;
  nochNie: number;
  thresholdDays: number;
}

export function levelStats(kontakte: Kontakt[], settings: Settings): LevelStat[] {
  const levels: ('inner' | 'close' | 'mid' | 'loose')[] = ['inner', 'close', 'mid', 'loose'];
  return levels.map(level => {
    const list = kontakte.filter(k => k.level === level);
    let inR = 0, drift = 0, over = 0, nie = 0;
    for (const k of list) {
      const ds = daysSince(k.last_contact);
      if (ds === 9999) {
        nie++;
        continue;
      }
      const u = urgency(k, settings);
      if (u === 'urgent') over++;
      else if (u === 'soon') drift++;
      else inR++;
    }
    return {
      level,
      total: list.length,
      inRhythmus: inR,
      driften: drift,
      ueberfaellig: over,
      nochNie: nie,
      thresholdDays: threshold(level, settings),
    };
  });
}

// Group events by local-day (YYYY-MM-DD)
function eventsByDay(events: KontaktEvent[]): Map<string, KontaktEvent[]> {
  const map = new Map<string, KontaktEvent[]>();
  for (const e of events) {
    const d = new Date(e.ts);
    const day = isoDate(new Date(d.getFullYear(), d.getMonth(), d.getDate()))!;
    const arr = map.get(day) ?? [];
    arr.push(e);
    map.set(day, arr);
  }
  return map;
}

export function streak(events: KontaktEvent[]): number {
  // Count consecutive days with at least 1 event, ending today (or yesterday if no event today)
  const byDay = eventsByDay(events);
  const today = todayDate();
  let count = 0;
  let cursor = today;
  // If no event today, allow counting starting from yesterday
  if (!byDay.has(isoDate(today)!)) {
    cursor = addDays(today, -1);
    if (!byDay.has(isoDate(cursor)!)) return 0;
  }
  while (byDay.has(isoDate(cursor)!)) {
    count++;
    cursor = addDays(cursor, -1);
  }
  return count;
}

export function activeDaysIn(events: KontaktEvent[], days: number): number {
  const byDay = eventsByDay(events);
  const today = todayDate();
  let count = 0;
  for (let i = 0; i < days; i++) {
    if (byDay.has(isoDate(addDays(today, -i))!)) count++;
  }
  return count;
}

export interface WeekBucket {
  weekStart: Date;        // Monday of the week
  count: number;
  uniquePeople: number;
}

export function weeklyBuckets(events: KontaktEvent[], weeks: number): WeekBucket[] {
  // Build N weeks ending in the current week (local time)
  const today = todayDate();
  // find Monday of current week
  const dow = today.getDay(); // 0=Sun..6=Sat
  const daysToMonday = (dow + 6) % 7;
  const thisMonday = addDays(today, -daysToMonday);

  const buckets: WeekBucket[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const start = addDays(thisMonday, -i * 7);
    const end = addDays(start, 7);
    const inWeek = events.filter(e => {
      const t = new Date(e.ts);
      return t >= start && t < end;
    });
    const uniq = new Set(inWeek.map(e => e.kontakt_id));
    buckets.push({
      weekStart: start,
      count: inWeek.length,
      uniquePeople: uniq.size,
    });
  }
  return buckets;
}

export function thisWeekContacts(events: KontaktEvent[], kontakte: Kontakt[]): { count: number; names: string[] } {
  const today = todayDate();
  const dow = today.getDay();
  const daysToMonday = (dow + 6) % 7;
  const monday = addDays(today, -daysToMonday);
  const seen = new Map<number, Date>();
  for (const e of events) {
    const t = new Date(e.ts);
    if (t < monday) continue;
    const prev = seen.get(e.kontakt_id);
    if (!prev || t > prev) seen.set(e.kontakt_id, t);
  }
  const names: string[] = [];
  for (const id of seen.keys()) {
    const k = kontakte.find(x => x.id === id);
    if (k) names.push(k.name);
  }
  names.sort((a, b) => a.localeCompare(b, 'de'));
  return { count: names.length, names };
}

export function dayOfWeekDistribution(events: KontaktEvent[]): { day: string; count: number }[] {
  const labels = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
  const counts = [0, 0, 0, 0, 0, 0, 0];
  for (const e of events) {
    const t = new Date(e.ts);
    counts[t.getDay()]++;
  }
  return labels.map((day, i) => ({ day, count: counts[i] }));
}

export function topPeople(events: KontaktEvent[], kontakte: Kontakt[], days: number, limit = 5) {
  const cutoff = addDays(todayDate(), -days);
  const counts = new Map<number, number>();
  for (const e of events) {
    const t = new Date(e.ts);
    if (t < cutoff) continue;
    counts.set(e.kontakt_id, (counts.get(e.kontakt_id) ?? 0) + 1);
  }
  const arr = Array.from(counts.entries())
    .map(([id, count]) => ({ k: kontakte.find(x => x.id === id), count }))
    .filter(x => x.k)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
  return arr as { k: Kontakt; count: number }[];
}

export function upcomingAnlaesse(
  anlaesse: { datum: string; typ: string; wiederkehrend: boolean }[],
  kontakte: Kontakt[],
  daysAhead = 30
) {
  const today = todayDate();
  const end = addDays(today, daysAhead);
  let total = 0;
  let bdays = 0;
  for (const a of anlaesse) {
    let date: Date;
    if (a.wiederkehrend || a.typ === 'geburtstag') {
      const orig = parseDate(a.datum)!;
      date = new Date(today.getFullYear(), orig.getMonth(), orig.getDate());
      if (date < today) date = new Date(today.getFullYear() + 1, orig.getMonth(), orig.getDate());
    } else {
      date = parseDate(a.datum)!;
    }
    if (date >= today && date <= end) {
      total++;
      if (a.typ === 'geburtstag') bdays++;
    }
  }
  // also count auto-bdays from kontakte
  for (const k of kontakte) {
    if (!k.bday) continue;
    const b = parseDate(k.bday)!;
    let bd = new Date(today.getFullYear(), b.getMonth(), b.getDate());
    if (bd < today) bd = new Date(today.getFullYear() + 1, b.getMonth(), b.getDate());
    if (bd > end) continue;
    const covered = anlaesse.some(
      a =>
        a.typ === 'geburtstag' &&
        (() => {
          const o = parseDate(a.datum)!;
          return o.getMonth() === b.getMonth() && o.getDate() === b.getDate();
        })()
    );
    if (!covered) {
      total++;
      bdays++;
    }
  }
  return { total, bdays };
}
