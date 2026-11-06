'use client';

import { useMemo, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { formatIsoDateDE, formatMonthShortDE } from '@/lib/seo/months';
import { fmtInt, type HistoryPoint, type Milestone } from '@/lib/seo/view';
import type { SeoDailyPoint } from '@/lib/seo/types';
import { AXIS_TEXT, SERIES_COLOR, SERIES_WASH } from '@/components/seo/charts/palette';
import MetricHistory from './MetricHistory';
import Segmented from './Segmented';
import { Delta } from './parts';

/**
 * Verlauf pro Tag, wie in der Google Search Console, aber mit nur einer
 * Kennzahl zur Zeit (eine Achse, keine zwei Skalen). Tage mit Maßnahmen
 * sind unter der Linie markiert, damit der Kunde sieht, was wir wann
 * gemacht haben und was danach passiert ist. Ohne Tageswerte (alte Monate)
 * faellt die Ansicht auf die Monatssaeulen zurueck.
 */

type Metric = 'clicks' | 'impressions';
type Range = 1 | 3 | 6 | 12 | 0;

const HEIGHT = 200;
const VB_W = 1000;
const DAY_MS = 86_400_000;

const UNIT: Record<Metric, string> = { clicks: 'Besucher', impressions: 'Anzeigen bei Google' };

function niceMax(v: number): number {
  if (v <= 0) return 1;
  const mag = 10 ** Math.floor(Math.log10(v));
  const n = v / mag;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return step * mag;
}

function compact(v: number): string {
  if (v >= 1000) return `${(v / 1000).toLocaleString('de-DE', { maximumFractionDigits: 1 })} Tsd.`;
  return fmtInt(v);
}

const isoPlus = (iso: string, days: number) => new Date(Date.parse(`${iso}T12:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);

/** Luecken fuellen: Google liefert Tage ohne Daten nicht mit. */
function fillDays(daily: SeoDailyPoint[]): SeoDailyPoint[] {
  if (!daily.length) return [];
  const byDate = new Map(daily.map((d) => [d.date, d]));
  const out: SeoDailyPoint[] = [];
  const last = daily[daily.length - 1].date;
  for (let d = daily[0].date; d <= last; d = isoPlus(d, 1)) {
    out.push(byDate.get(d) ?? { date: d, clicks: 0, impressions: 0, ctr: 0, position: 0 });
  }
  return out;
}

function monthsBack(iso: string, months: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() - months);
  return isoPlus(d.toISOString().slice(0, 10), 1);
}

const RANGE_LABELS: Record<Range, string> = { 1: '1 Monat', 3: '3 Monate', 6: '6 Monate', 12: '12 Monate', 0: 'Alles' };

export default function TrendChart({
  daily,
  history,
  current,
  milestones = [],
}: {
  daily: SeoDailyPoint[];
  history: HistoryPoint[];
  current: string;
  milestones?: Milestone[];
}) {
  const [metric, setMetric] = useState<Metric>('clicks');
  const all = useMemo(() => fillDays(daily), [daily]);
  const rangeOptions = useMemo(() => {
    const opts = ([1, 3, 6, 12] as Range[]).filter((r) => all.length > r * 31);
    return [...opts, 0 as Range];
  }, [all.length]);
  const [range, setRange] = useState<Range>(() => (all.length > 3 * 31 ? 3 : 0));
  const [hover, setHover] = useState<number | null>(null);

  const view = useMemo(() => {
    if (!all.length) return null;
    const last = all[all.length - 1].date;
    const start = range === 0 ? all[0].date : monthsBack(last, range);
    const days = all.filter((d) => d.date >= start);
    const prevStart = range === 0 ? null : monthsBack(isoPlus(start, -1), range);
    const prevDays = prevStart && all[0].date <= prevStart ? all.filter((d) => d.date >= prevStart && d.date < start) : null;
    const values = days.map((d) => d[metric]);
    const max = niceMax(Math.max(...values, 0));
    const x = (i: number) => (days.length < 2 ? VB_W / 2 : (i / (days.length - 1)) * VB_W);
    const y = (v: number) => HEIGHT - (v / max) * HEIGHT;
    const line = values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
    const area = `${line} L${x(values.length - 1).toFixed(1)},${HEIGHT} L0,${HEIGHT} Z`;
    const total = values.reduce((s, v) => s + v, 0);
    const prevTotal = prevDays ? prevDays.reduce((s, d) => s + d[metric], 0) : null;
    const ms = new Map<string, Milestone>();
    for (const m of milestones) if (m.date >= start && m.date <= last) ms.set(m.date, m);
    const monthTicks = days.map((d, i) => ({ d, i })).filter(({ d }) => d.date.endsWith('-01'));
    return { days, values, max, line, area, total, prevTotal, ms, monthTicks };
  }, [all, range, metric, milestones]);

  if (!view || all.length < 14) {
    return <MetricHistory history={history} current={current} />;
  }

  const { days, values, max, line, area, total, prevTotal, ms, monthTicks } = view;
  const pct = (i: number) => (days.length < 2 ? 50 : (i / (days.length - 1)) * 100);
  const hoverDay = hover !== null ? days[hover] : null;
  const hoverMs = hoverDay ? ms.get(hoverDay.date) : undefined;

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const f = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    setHover(Math.round(f * (days.length - 1)));
  };
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const step = e.key === 'ArrowLeft' ? -1 : 1;
    setHover((h) => Math.min(days.length - 1, Math.max(0, (h ?? days.length - 1) + step)));
  };

  const PERIOD: Record<Range, string> = {
    1: 'in den letzten 30 Tagen',
    3: 'in den letzten 3 Monaten',
    6: 'in den letzten 6 Monaten',
    12: 'in den letzten 12 Monaten',
    0: 'im gesamten Zeitraum',
  };
  const periodLabel = PERIOD[range];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Segmented
          label="Kennzahl wählen"
          value={metric}
          onChange={setMetric}
          options={[
            ['clicks', 'Besucher'],
            ['impressions', 'Anzeigen'],
          ]}
        />
        {rangeOptions.length > 1 && (
          <Segmented
            label="Zeitraum wählen"
            value={String(range)}
            onChange={(v) => {
              setRange(Number(v) as Range);
              setHover(null);
            }}
            options={rangeOptions.map((r) => [String(r), RANGE_LABELS[r]] as [string, string])}
          />
        )}
      </div>

      <p className="mb-3 text-sm text-gray-700">
        <span className="text-xl font-semibold tabular-nums text-gray-900">{fmtInt(total)}</span> {UNIT[metric]} {periodLabel}
        {prevTotal !== null && (
          <span className="ml-2 inline-block align-middle">
            <Delta label="Zeitraum davor" current={total} previous={prevTotal} />
          </span>
        )}
      </p>

      <div className="relative pl-12">
        {/* Rasterlinien mit Beschriftung */}
        <div className="absolute inset-0" style={{ height: HEIGHT }} aria-hidden>
          {[1, 0.5].map((f) => (
            <div key={f} className="absolute left-0 right-0 border-t border-gray-200" style={{ top: `${(1 - f) * 100}%` }}>
              <span className="absolute -top-2.5 left-0 bg-white pr-1 text-[11px] tabular-nums" style={{ color: AXIS_TEXT }}>
                {compact(max * f)}
              </span>
            </div>
          ))}
        </div>

        <div
          role="img"
          aria-label={`${fmtInt(total)} ${UNIT[metric]} ${periodLabel}, Verlauf pro Tag. Mit den Pfeiltasten lassen sich einzelne Tage ansehen.`}
          tabIndex={0}
          className="relative touch-pan-y border-b border-gray-300 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-blue/40"
          style={{ height: HEIGHT }}
          onPointerMove={onMove}
          onPointerDown={onMove}
          onPointerLeave={() => setHover(null)}
          onKeyDown={onKey}
          onBlur={() => setHover(null)}
        >
          <svg viewBox={`0 0 ${VB_W} ${HEIGHT}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden>
            <path d={area} fill={SERIES_WASH} />
            <path d={line} fill="none" stroke={SERIES_COLOR} strokeWidth={2} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          </svg>

          {hoverDay && hover !== null && (
            <>
              <div className="pointer-events-none absolute top-0 bottom-0 w-px bg-gray-400" style={{ left: `${pct(hover)}%` }} aria-hidden />
              <div
                className="pointer-events-none absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white"
                style={{ left: `${pct(hover)}%`, top: `${(1 - values[hover] / max) * 100}%`, backgroundColor: SERIES_COLOR }}
                aria-hidden
              />
              <div
                className="pointer-events-none absolute bottom-full z-10 mb-2 max-w-64 rounded-lg bg-gray-900 px-3 py-2 text-xs text-white shadow-lg"
                style={{
                  left: `${pct(hover)}%`,
                  transform: `translateX(${pct(hover) < 20 ? '0' : pct(hover) > 80 ? '-100%' : '-50%'})`,
                }}
              >
                <div className="font-semibold whitespace-nowrap">{formatIsoDateDE(hoverDay.date)}</div>
                <div className="tabular-nums whitespace-nowrap">
                  {fmtInt(hoverDay.clicks)} Besucher · {fmtInt(hoverDay.impressions)} Anzeigen
                </div>
                {hoverMs && (
                  <div className="mt-1 border-t border-white/20 pt-1">
                    Maßnahme: {hoverMs.text}
                    {hoverMs.more > 0 ? ` (und ${hoverMs.more} weitere)` : ''}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Tage mit Massnahmen */}
        {ms.size > 0 && (
          <div className="relative h-3" aria-hidden>
            {days.map((d, i) =>
              ms.has(d.date) ? (
                <span
                  key={d.date}
                  className="absolute top-1 h-2 w-2 -translate-x-1/2 rounded-full border border-white bg-emerald-600"
                  style={{ left: `${pct(i)}%` }}
                />
              ) : null,
            )}
          </div>
        )}

        {/* Monatsbeschriftung */}
        <div className="relative mt-1 h-4" aria-hidden>
          {monthTicks.map(({ d, i }, k) => {
            const fromEnd = monthTicks.length - 1 - k;
            const vis = monthTicks.length <= 6 ? '' : fromEnd % 3 === 0 ? '' : fromEnd % 2 === 0 ? 'hidden sm:inline' : 'hidden lg:inline';
            return (
              <span
                key={d.date}
                className={`absolute -translate-x-1/2 whitespace-nowrap text-[11px] tabular-nums ${vis}`}
                style={{ left: `${pct(i)}%`, color: AXIS_TEXT }}
              >
                {formatMonthShortDE(d.date.slice(0, 7))}
              </span>
            );
          })}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-gray-500">
        <span>
          {ms.size > 0 && (
            <>
              <span className="mr-1 inline-block h-2 w-2 rounded-full bg-emerald-600 align-middle" aria-hidden />
              Tage, an denen wir etwas an Ihrer Website verbessert haben.{' '}
            </>
          )}
          Einzelne Tage schwanken, entscheidend ist die Richtung.
        </span>
      </div>

      <details className="mt-3">
        <summary className="cursor-pointer text-sm text-brand-blue underline-offset-2 hover:underline">Zahlen pro Monat als Tabelle</summary>
        <div className="mt-3">
          <MetricHistory history={history} current={current} tableOnly />
        </div>
      </details>
    </div>
  );
}
