'use client';

import { SingleColumnChart } from '@/components/seo/charts/ColumnChart';
import { SERIES_COLOR, SERIES_WASH } from '@/components/seo/charts/palette';
import { formatMonthDE } from '@/lib/seo/months';
import { fmtInt, type PortalEstimate } from '@/lib/seo/view';

/**
 * Vorher-Kurve: geschaetzte Besucher vor Beginn der Messung. Eigener Block
 * mit eigener Skala, gestrichelt, damit niemand Schaetzung und echte Zahlen
 * verwechselt. Der Vergleichsmonat zeigt, wie hoch die Schaetzung im
 * Verhaeltnis zur echten Messung liegt.
 */
export default function EstimateHistory({ estimate }: { estimate: PortalEstimate }) {
  const { points, until, compare } = estimate;
  let ratioText = '';
  if (compare) {
    const { estimated, measured } = compare;
    ratioText =
      measured > estimated * 1.3
        ? 'Die Schätzung liegt also deutlich unter den echten Zahlen. Achten Sie deshalb auf die Richtung, nicht auf die Höhe.'
        : estimated > measured * 1.3
          ? 'Die Schätzung liegt also über den echten Zahlen. Achten Sie deshalb auf die Richtung, nicht auf die Höhe.'
          : 'Schätzung und Messung liegen also nah beieinander.';
  }

  return (
    <div className="mt-8 border-t border-gray-200 pt-6">
      <h3 className="text-base font-semibold text-gray-900">Vor Beginn der Messung: Schätzung</h3>
      <p className="mt-1 text-sm text-gray-600">
        Google liefert echte Zahlen erst ab der Einrichtung der Search Console, bei Ihnen ab {formatMonthDE(until)}. Für die Zeit
        davor zeigen wir eine Schätzung aus Ihren Suchbegriffen und Platzierungen. Das sind keine gemessenen Besucher.
      </p>

      <div className="mt-4">
        <SingleColumnChart points={points.map((p) => ({ month: p.month, value: p.visitors }))} unit="geschätzte Besucher" estimated />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
        <span>
          <span
            className="mr-1 inline-block h-2.5 w-3 rounded-sm border border-dashed align-middle"
            style={{ backgroundColor: SERIES_WASH, borderColor: SERIES_COLOR }}
            aria-hidden
          />
          Geschätzte Besucher pro Monat, keine echten Klicks
        </span>
      </div>

      {compare && (
        <p className="mt-3 text-sm text-gray-600">
          Zum Vergleich: Für {formatMonthDE(compare.month)} schätzt das Verfahren etwa {fmtInt(compare.estimated)} Besucher, gemessen
          wurden {fmtInt(compare.measured)}. {ratioText}
        </p>
      )}

      <details className="mt-3">
        <summary className="cursor-pointer text-sm text-brand-blue underline-offset-2 hover:underline">Schätzung pro Monat als Tabelle</summary>
        <div className="mt-3 min-w-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 text-xs text-gray-500">
              <tr>
                <th className="px-2 py-2 text-left font-medium">Monat</th>
                <th className="px-2 py-2 text-right font-medium">Geschätzte Besucher</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {[...points].reverse().map((p) => (
                <tr key={p.month}>
                  <td className="px-2 py-1.5 whitespace-nowrap">{formatMonthDE(p.month)}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{fmtInt(p.visitors)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
