'use client';

import { useState } from 'react';
import { BUCKET_LABELS, type PositionBuckets } from '@/lib/seo/analysis';
import { formatMonthDE, formatMonthShortDE } from '@/lib/seo/months';
import { fmtInt } from '@/lib/seo/view';
import { AXIS_TEXT, BUCKET_COLORS, BUCKET_ORDER, SERIES_COLOR } from './palette';

/**
 * Saeulendiagramme ohne Bibliothek (kein externes Skript, gleiche Optik
 * wie im PDF). Saeulen hoechstens 24 px breit, oben 4 px gerundet, unten
 * gerade. Hover bzw. Antippen zeigt den Wert, darunter immer eine
 * Tabellenansicht zum Aufklappen.
 */

const HEIGHT = 180;

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

function Axis({ max }: { max: number }) {
  return (
    <>
      {[1, 0.5].map((f) => (
        <div
          key={f}
          className="absolute left-0 right-0 border-t border-gray-200"
          style={{ bottom: `${f * 100}%` }}
          aria-hidden
        >
          <span className="absolute -top-2.5 left-0 bg-white pr-1 text-[11px] tabular-nums" style={{ color: AXIS_TEXT }}>
            {compact(max * f)}
          </span>
        </div>
      ))}
    </>
  );
}

function MonthLabels({ months, current }: { months: string[]; current?: string }) {
  return (
    <div className="mt-1.5 flex gap-0.5" aria-hidden>
      {months.map((m, i) => {
        // Vom neuesten Monat aus: Handy jede vierte, Tablet jede zweite, Desktop alle
        const fromEnd = months.length - 1 - i;
        const vis =
          fromEnd % 4 === 0 ? '' : fromEnd % 2 === 0 ? 'hidden sm:inline' : 'hidden lg:inline';
        return (
          <div key={m} className="relative h-4 flex-1">
            <span
              className={`absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-[11px] tabular-nums ${vis}`}
              style={{ color: AXIS_TEXT, fontWeight: m === current ? 600 : 400 }}
            >
              {formatMonthShortDE(m)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function Tooltip({ title, lines }: { title: string; lines: string[] }) {
  return (
    <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-gray-900 px-3 py-2 text-xs text-white shadow-lg">
      <div className="font-semibold">{title}</div>
      {lines.map((l) => (
        <div key={l} className="tabular-nums">
          {l}
        </div>
      ))}
    </div>
  );
}

export function SingleColumnChart({
  points,
  current,
  unit,
}: {
  points: Array<{ month: string; value: number }>;
  current?: string;
  unit: string;
}) {
  const [active, setActive] = useState<string | null>(null);
  const max = niceMax(Math.max(...points.map((p) => p.value), 0));

  return (
    <div>
      <div className="relative pl-12" style={{ height: HEIGHT }}>
        <div className="absolute inset-0 left-0">
          <Axis max={max} />
        </div>
        <div className="relative flex h-full items-end gap-0.5 border-b border-gray-300" onMouseLeave={() => setActive(null)}>
          {points.map((p) => {
            const isActive = active === p.month;
            return (
              <button
                key={p.month}
                type="button"
                className="relative flex h-full flex-1 items-end justify-center focus:outline-hidden"
                onMouseEnter={() => setActive(p.month)}
                onFocus={() => setActive(p.month)}
                onBlur={() => setActive(null)}
                onClick={() => setActive(isActive ? null : p.month)}
                aria-label={`${formatMonthDE(p.month)}: ${fmtInt(p.value)} ${unit}`}
              >
                <span
                  className="block w-full max-w-6 rounded-t"
                  style={{
                    height: `${Math.max(p.value > 0 ? 1 : 0, (p.value / max) * 100)}%`,
                    backgroundColor: SERIES_COLOR,
                    opacity: p.month === current || isActive ? 1 : 0.45,
                  }}
                />
                {isActive && <Tooltip title={formatMonthDE(p.month)} lines={[`${fmtInt(p.value)} ${unit}`]} />}
              </button>
            );
          })}
        </div>
      </div>
      <div className="pl-12">
        <MonthLabels months={points.map((p) => p.month)} current={current} />
      </div>
    </div>
  );
}

export function BucketColumnChart({
  points,
  current,
}: {
  points: Array<{ month: string; buckets: PositionBuckets }>;
  current?: string;
}) {
  const [active, setActive] = useState<string | null>(null);
  const totals = points.map((p) => BUCKET_ORDER.reduce((s, b) => s + p.buckets[b], 0));
  const max = niceMax(Math.max(...totals, 0));

  return (
    <div>
      <ul className="mb-4 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-gray-600">
        {BUCKET_ORDER.map((b) => (
          <li key={b} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: BUCKET_COLORS[b] }} aria-hidden />
            {BUCKET_LABELS[b]}
          </li>
        ))}
      </ul>
      <div className="relative pl-12" style={{ height: HEIGHT }}>
        <div className="absolute inset-0">
          <Axis max={max} />
        </div>
        <div className="relative flex h-full items-end gap-0.5 border-b border-gray-300" onMouseLeave={() => setActive(null)}>
          {points.map((p, i) => {
            const isActive = active === p.month;
            return (
              <button
                key={p.month}
                type="button"
                className="relative flex h-full flex-1 flex-col items-center justify-end focus:outline-hidden"
                onMouseEnter={() => setActive(p.month)}
                onFocus={() => setActive(p.month)}
                onBlur={() => setActive(null)}
                onClick={() => setActive(isActive ? null : p.month)}
                aria-label={`${formatMonthDE(p.month)}: ${BUCKET_ORDER.map((b) => `${BUCKET_LABELS[b]} ${p.buckets[b]}`).join(', ')}`}
              >
                <span
                  className="flex w-full max-w-6 flex-col-reverse gap-[2px] overflow-hidden rounded-t"
                  style={{ height: `${(totals[i] / max) * 100}%`, opacity: p.month === current || isActive ? 1 : 0.6 }}
                >
                  {BUCKET_ORDER.map((b) =>
                    p.buckets[b] > 0 ? (
                      <span key={b} className="block w-full" style={{ flexGrow: p.buckets[b], backgroundColor: BUCKET_COLORS[b] }} />
                    ) : null,
                  )}
                </span>
                {isActive && (
                  <Tooltip
                    title={formatMonthDE(p.month)}
                    lines={BUCKET_ORDER.map((b) => `${BUCKET_LABELS[b]}: ${fmtInt(p.buckets[b])}`)}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
      <div className="pl-12">
        <MonthLabels months={points.map((p) => p.month)} current={current} />
      </div>
    </div>
  );
}
