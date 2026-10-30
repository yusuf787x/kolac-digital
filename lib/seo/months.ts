import type { SeoMonth } from './types';

/** Monatsrechnung auf Basis von "YYYY-MM", ohne Zeitzonen-Fallen. */

const MONTH_NAMES = [
  'Januar',
  'Februar',
  'März',
  'April',
  'Mai',
  'Juni',
  'Juli',
  'August',
  'September',
  'Oktober',
  'November',
  'Dezember',
];

const MONTH_SHORT = [
  'Jan',
  'Feb',
  'Mär',
  'Apr',
  'Mai',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Okt',
  'Nov',
  'Dez',
];

export function isMonthKey(s: unknown): s is SeoMonth {
  return typeof s === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(s);
}

function parts(m: SeoMonth): [number, number] {
  const [y, mo] = m.split('-').map(Number);
  return [y, mo];
}

function build(y: number, mo: number): SeoMonth {
  return `${y}-${String(mo).padStart(2, '0')}`;
}

export function addMonths(m: SeoMonth, delta: number): SeoMonth {
  const [y, mo] = parts(m);
  const idx = y * 12 + (mo - 1) + delta;
  return build(Math.floor(idx / 12), (idx % 12) + 1);
}

export const prevMonth = (m: SeoMonth) => addMonths(m, -1);
export const sameMonthLastYear = (m: SeoMonth) => addMonths(m, -12);

/** Erster und letzter Tag als YYYY-MM-DD (so erwartet es die Search Console). */
export function monthRange(m: SeoMonth): { start: string; end: string } {
  const [y, mo] = parts(m);
  const lastDay = new Date(Date.UTC(y, mo, 0)).getUTCDate();
  return { start: `${m}-01`, end: `${m}-${String(lastDay).padStart(2, '0')}` };
}

/** Aktueller Monat in deutscher Zeit. */
export function currentMonth(now = new Date()): SeoMonth {
  const s = now.toLocaleDateString('sv-SE', { timeZone: 'Europe/Berlin' });
  return s.slice(0, 7);
}

/** Der letzte vollstaendig abgeschlossene Monat. */
export function lastCompleteMonth(now = new Date()): SeoMonth {
  return prevMonth(currentMonth(now));
}

/** Die letzten n abgeschlossenen Monate, neuester zuerst. */
export function lastCompleteMonths(n: number, now = new Date()): SeoMonth[] {
  const last = lastCompleteMonth(now);
  return Array.from({ length: n }, (_, i) => addMonths(last, -i));
}

/** "Oktober 2026" */
export function formatMonthDE(m: SeoMonth): string {
  const [y, mo] = parts(m);
  return `${MONTH_NAMES[mo - 1]} ${y}`;
}

/** "Okt 26" fuer Diagramm-Achsen. */
export function formatMonthShortDE(m: SeoMonth): string {
  const [y, mo] = parts(m);
  return `${MONTH_SHORT[mo - 1]} ${String(y).slice(2)}`;
}

/** Nur der Monatsname, z. B. "Oktober". */
export function monthNameDE(m: SeoMonth): string {
  return MONTH_NAMES[parts(m)[1] - 1];
}

/** "2026-10-28" -> "28.10.2026" */
export function formatIsoDateDE(iso: string): string {
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${d}.${m}.${y}`;
}

/** Heutiges Datum in deutscher Zeit als YYYY-MM-DD. */
export function todayIso(now = new Date()): string {
  return now.toLocaleDateString('sv-SE', { timeZone: 'Europe/Berlin' });
}
