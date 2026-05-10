import type { Kontakt, Level, Settings, Urgency } from '../types';
import { daysSince } from './date';

export function threshold(level: Level, settings: Settings): number {
  if (level === 'inner') return settings.freq_inner;
  if (level === 'close') return settings.freq_close;
  if (level === 'mid') return settings.freq_mid;
  return settings.freq_loose;
}

export function urgency(k: Kontakt, settings: Settings): Urgency {
  const ds = daysSince(k.last_contact);
  if (ds === 9999) return 'neutral';
  const t = threshold(k.level, settings);
  if (t >= 999) return 'ok';
  if (ds > t) return 'urgent';
  if (ds > t * 0.75) return 'soon';
  return 'ok';
}

export function levelLabel(l: Level): string {
  if (l === 'inner') return 'inner';
  if (l === 'close') return 'eng';
  if (l === 'mid') return 'mittel';
  return 'locker';
}

export function levelLabelLong(l: Level): string {
  if (l === 'inner') return 'inner circle';
  if (l === 'close') return 'eng';
  if (l === 'mid') return 'mittel';
  return 'locker';
}

export function levelOrder(l: Level): number {
  if (l === 'inner') return 0;
  if (l === 'close') return 1;
  if (l === 'mid') return 2;
  return 3;
}

export const LEVELS: Level[] = ['inner', 'close', 'mid', 'loose'];

export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map(w => w[0] || '')
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export const URGENCY_ORDER: Record<Urgency, number> = {
  urgent: 0,
  soon: 1,
  neutral: 2,
  ok: 3,
};
