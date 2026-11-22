'use client';

import { useMemo, useState, type KeyboardEvent, type PointerEvent } from 'react';

/**
 * Interaktive Tageskurve wie die Search Console in der absoluten Ansicht:
 * Klicks (linke Achse) und Einblendungen (rechte Achse), Umschalter je Reihe,
 * Wert beim Zeigen, Antippen oder mit den Pfeiltasten. Ohne Bibliothek:
 * Linien als SVG, Beschriftung als HTML, damit Schrift auf dem Handy nicht
 * mitskaliert.
 */

type Row = [string, number, number];
type Series = 'clicks' | 'impressions';

const PLOT_H = 220;
const fmt = (n: number) => n.toLocaleString('de-DE');

/** Achsen-Höchstwert, der sich in vier glatte Schritte teilen lässt (46 → 60, 2.358 → 2.400). */
function niceMax(v: number): number {
  const step = v / 4;
  const mag = 10 ** Math.floor(Math.log10(step));
  const n = step / mag;
  const nice = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find((c) => c >= n) ?? 10;
  return nice * mag * 4;
}

function shortDate(iso: string): string {
  const [, m, d] = iso.split('-');
  return `${d}.${m}.`;
}

function longDate(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'long' });
}

export default function ProofChart({ data, marker }: { data: Row[]; marker?: { date: string; label: string } }) {
  const [show, setShow] = useState<Record<Series, boolean>>({ clicks: true, impressions: true });
  const [active, setActive] = useState<number | null>(null);

  const n = data.length;
  const maxC = useMemo(() => niceMax(Math.max(...data.map((r) => r[1]))), [data]);
  const maxI = useMemo(() => niceMax(Math.max(...data.map((r) => r[2]))), [data]);
  const totals = useMemo(() => data.reduce((t, r) => [t[0] + r[1], t[1] + r[2]], [0, 0]), [data]);

  const x = (i: number) => (n > 1 ? (i / (n - 1)) * 100 : 50);
  const yC = (v: number) => 100 - (v / maxC) * 100;
  const yI = (v: number) => 100 - (v / maxI) * 100;
  const pointsC = data.map((r, i) => `${x(i)},${yC(r[1])}`).join(' ');
  const pointsI = data.map((r, i) => `${x(i)},${yI(r[2])}`).join(' ');
  const markerIdx = marker ? data.findIndex((r) => r[0] === marker.date) : -1;

  const toggle = (s: Series) =>
    setShow((prev) => {
      const next = { ...prev, [s]: !prev[s] };
      return next.clicks || next.impressions ? next : prev;
    });

  const pick = (e: PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const f = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    setActive(Math.round(f * (n - 1)));
  };

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight') setActive((a) => Math.min(n - 1, (a ?? -1) + 1));
    else if (e.key === 'ArrowLeft') setActive((a) => Math.max(0, (a ?? n) - 1));
    else if (e.key === 'Escape') setActive(null);
    else return;
    e.preventDefault();
  };

  // Datumsbeschriftung alle 6 Tage wie in der Search Console, auf dem Handy jede zweite
  const ticks = data.map((r, i) => ({ i, label: shortDate(r[0]) })).filter((t) => t.i % 6 === 0);

  const act = active !== null ? data[active] : null;
  const ax = active !== null ? x(active) : 0;
  const tipAlign = ax < 18 ? 'left' : ax > 82 ? 'right' : 'center';

  return (
    <figure aria-label="Klicks und Einblendungen bei Google pro Tag, Praxis aus OWL">
      {/* Umschalter wie die Kacheln der Search Console */}
      <div className="grid grid-cols-2 gap-2">
        {(
          [
            ['clicks', 'Klicks', totals[0], 'var(--color-blue)'],
            ['impressions', 'Einblendungen', totals[1], 'var(--color-impressions)'],
          ] as const
        ).map(([key, label, total, color]) => {
          const on = show[key];
          return (
            <button
              key={key}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(key)}
              className="rounded-[12px] px-4 py-3 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-blue)]"
              style={on ? { background: color, color: '#fff' } : { background: '#fff', color: 'var(--color-gray)', boxShadow: 'inset 0 0 0 1px #e5e7eb' }}
            >
              <span className="flex items-center gap-2 text-[13px] font-semibold">
                <span
                  aria-hidden
                  className="flex h-4 w-4 items-center justify-center rounded-[4px] text-[11px] leading-none"
                  style={on ? { background: '#fff', color } : { boxShadow: 'inset 0 0 0 1.5px #c7c7cc' }}
                >
                  {on ? '✓' : ''}
                </span>
                {label}
              </span>
              <span className="mt-1 block text-[22px] font-bold tabular-nums leading-tight md:text-[26px]">{fmt(total)}</span>
            </button>
          );
        })}
      </div>

      {/* Zeichenfläche */}
      <div className="relative mt-6 pl-7 pr-9">
        {/* Achsentitel */}
        <div className="mb-2 flex justify-between text-[11px] text-[var(--color-gray)]" aria-hidden>
          <span className={show.clicks ? '' : 'invisible'}>Klicks</span>
          <span className={show.impressions ? '' : 'invisible'}>Einblendungen</span>
        </div>
        <div className="relative" style={{ height: PLOT_H }}>
          {/* Rasterlinien und Achsenwerte */}
          {[0, 0.25, 0.5, 0.75, 1].map((f) => (
            <div key={f} aria-hidden className="absolute left-0 right-0 border-t border-[#eceef1]" style={{ bottom: `${f * 100}%` }}>
              <span className={`absolute -left-7 -top-2 w-6 text-right text-[11px] tabular-nums text-[var(--color-gray)] ${show.clicks ? '' : 'invisible'}`}>
                {fmt(Math.round(maxC * f))}
              </span>
              <span className={`absolute -right-9 -top-2 w-8 text-left text-[11px] tabular-nums text-[var(--color-gray)] ${show.impressions ? '' : 'invisible'}`}>
                {fmt(Math.round(maxI * f))}
              </span>
            </div>
          ))}

          {/* Markierung: neue Beiträge */}
          {markerIdx >= 0 && marker && (
            <div aria-hidden className="absolute bottom-0 top-0 border-l border-dashed border-[var(--color-guarantee)]" style={{ left: `${x(markerIdx)}%` }}>
              <span className="absolute left-1.5 top-0 w-max max-w-[150px] rounded-[6px] bg-[var(--color-guarantee-bg)] px-2 py-1 text-[11px] font-semibold leading-tight text-[var(--color-guarantee)]">
                {shortDate(marker.date)}: {marker.label}
              </span>
            </div>
          )}

          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden>
            {show.impressions && (
              <polyline points={pointsI} fill="none" stroke="var(--color-impressions)" strokeWidth="2.25" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            )}
            {show.clicks && (
              <polyline points={pointsC} fill="none" stroke="var(--color-blue)" strokeWidth="2.25" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            )}
          </svg>

          {/* Aktiver Tag */}
          {act && (
            <>
              <div aria-hidden className="pointer-events-none absolute bottom-0 top-0 w-px bg-[#c7c7cc]" style={{ left: `${ax}%` }} />
              {show.clicks && <Dot left={ax} top={yC(act[1])} color="var(--color-blue)" />}
              {show.impressions && <Dot left={ax} top={yI(act[2])} color="var(--color-impressions)" />}
              <div
                className="pointer-events-none absolute -top-2 z-10 w-max rounded-[12px] bg-white px-3 py-2 text-[13px] shadow-[var(--shadow-md)]"
                style={{
                  left: `${ax}%`,
                  transform: tipAlign === 'center' ? 'translate(-50%, -100%)' : tipAlign === 'right' ? 'translate(-100%, -100%)' : 'translate(0, -100%)',
                }}
              >
                <p className="font-semibold text-[var(--color-black)]">{longDate(act[0])}</p>
                {show.clicks && (
                  <p className="mt-0.5 flex items-center gap-2 tabular-nums text-[var(--color-black)]">
                    <span aria-hidden className="h-2 w-2 rounded-full bg-[var(--color-blue)]" /> {fmt(act[1])} Klicks
                  </p>
                )}
                {show.impressions && (
                  <p className="flex items-center gap-2 tabular-nums text-[var(--color-black)]">
                    <span aria-hidden className="h-2 w-2 rounded-full bg-[var(--color-impressions)]" /> {fmt(act[2])} Einblendungen
                  </p>
                )}
              </div>
            </>
          )}

          {/* Fläche für Maus, Finger und Tastatur */}
          <div
            role="slider"
            tabIndex={0}
            aria-label="Tag in der Grafik wählen"
            aria-valuemin={1}
            aria-valuemax={n}
            aria-valuenow={active !== null ? active + 1 : undefined}
            aria-valuetext={act ? `${longDate(act[0])}: ${fmt(act[1])} Klicks, ${fmt(act[2])} Einblendungen` : 'Kein Tag gewählt'}
            className="absolute inset-0 cursor-crosshair touch-pan-y rounded-[4px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-blue)]"
            onPointerDown={pick}
            onPointerMove={pick}
            onPointerLeave={(e) => {
              if (e.pointerType === 'mouse') setActive(null);
            }}
            onKeyDown={onKey}
            onBlur={() => setActive(null)}
          />
        </div>

        {/* Datumsachse */}
        <div className="relative mt-2 h-4" aria-hidden>
          {ticks.map((t, k) => (
            <span
              key={t.i}
              className={`absolute -translate-x-1/2 text-[11px] tabular-nums text-[var(--color-gray)] ${k % 2 === 1 ? 'hidden sm:inline' : ''}`}
              style={{ left: `${x(t.i)}%` }}
            >
              {t.label}
            </span>
          ))}
        </div>
      </div>

      <figcaption className="mt-4 text-[12px] leading-snug text-[var(--color-gray)]">
        Tippe auf die Kurve oder fahre mit der Maus darüber, dann siehst du jeden Tag. Echte Werte aus der Google Search Console, das ist
        Googles eigenes Messwerkzeug. Name des Betriebs auf Wunsch weggelassen.
      </figcaption>
      <details className="mt-2 text-[12px] text-[var(--color-gray)]">
        <summary className="cursor-pointer">Alle Tageswerte als Tabelle</summary>
        <div className="mt-2 max-h-[240px] overflow-y-auto">
          <table className="w-full text-left tabular-nums">
            <thead>
              <tr>
                <th className="py-1 font-semibold">Tag</th>
                <th className="py-1 font-semibold">Klicks</th>
                <th className="py-1 font-semibold">Einblendungen</th>
              </tr>
            </thead>
            <tbody>
              {data.map((r) => (
                <tr key={r[0]}>
                  <td className="py-0.5">{shortDate(r[0])}</td>
                  <td className="py-0.5">{fmt(r[1])}</td>
                  <td className="py-0.5">{fmt(r[2])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}

function Dot({ left, top, color }: { left: number; top: number; color: string }) {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.08)]"
      style={{ left: `${left}%`, top: `${top}%`, background: color }}
    />
  );
}
