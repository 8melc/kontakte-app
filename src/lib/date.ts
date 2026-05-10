export function todayDate(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function isoDate(d: Date | string | null | undefined): string | null {
  if (!d) return null;
  if (typeof d === 'string') return d;
  // Use LOCAL date components (not toISOString — that converts to UTC and
  // can shift the date by a day for users east of UTC).
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function todayISO(): string {
  return isoDate(todayDate())!;
}

export function parseDate(s: string | null | undefined): Date | null {
  if (!s) return null;
  const parts = s.split('-');
  return new Date(+parts[0], +parts[1] - 1, +parts[2]);
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

export function daysSince(dateStr: string | null | undefined): number {
  if (!dateStr) return 9999;
  const d = parseDate(dateStr);
  if (!d) return 9999;
  return daysBetween(d, todayDate());
}

const DAYS_LONG = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
const MONTHS_LONG = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mrz', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
const DAYS_SHORT = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

export function formatDateGerman(dateStr: string | null | undefined): string {
  if (!dateStr) return '--';
  const d = parseDate(dateStr);
  if (!d) return '--';
  return `${DAYS_LONG[d.getDay()]}, ${d.getDate()}. ${MONTHS_LONG[d.getMonth()]}`;
}

export function formatDateShort(dateStr: string | null | undefined): string {
  if (!dateStr) return '--';
  const d = parseDate(dateStr);
  if (!d) return '--';
  return `${d.getDate()}. ${MONTHS_SHORT[d.getMonth()]}`;
}

export function formatDayWeekday(d: Date): { day: number; weekday: string } {
  return { day: d.getDate(), weekday: DAYS_SHORT[d.getDay()] };
}

export function formatDaysAgo(n: number): string {
  if (n === 9999) return 'noch nie';
  if (n === 0) return 'heute';
  if (n === 1) return 'gestern';
  return n + 'T';
}

export function formatDaysAgoLong(n: number): string {
  if (n === 9999) return 'noch nie';
  if (n === 0) return 'heute';
  if (n === 1) return 'gestern';
  return n + ' Tage';
}

export function daysUntilBday(bdayStr: string | null | undefined): number | null {
  if (!bdayStr) return null;
  const b = parseDate(bdayStr);
  if (!b) return null;
  const t = todayDate();
  const thisYear = new Date(t.getFullYear(), b.getMonth(), b.getDate());
  if (thisYear < t) thisYear.setFullYear(t.getFullYear() + 1);
  return daysBetween(t, thisYear);
}

export function upcomingFromAnlass(anlass: { datum: string; typ: string; wiederkehrend: boolean }): Date {
  const today = todayDate();
  if (anlass.wiederkehrend || anlass.typ === 'geburtstag') {
    const orig = parseDate(anlass.datum)!;
    let d = new Date(today.getFullYear(), orig.getMonth(), orig.getDate());
    if (d < today) d = new Date(today.getFullYear() + 1, orig.getMonth(), orig.getDate());
    return d;
  }
  return parseDate(anlass.datum)!;
}

export const DAY_SHORT_NAMES = DAYS_SHORT;
export const MONTH_LONG_NAMES = MONTHS_LONG;
export const MONTH_SHORT_NAMES = MONTHS_SHORT;
