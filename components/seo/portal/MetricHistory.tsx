'use client';

import { useState } from 'react';
import { SingleColumnChart } from '@/components/seo/charts/ColumnChart';
import { formatMonthDE } from '@/lib/seo/months';
import { fmtInt, fmtPct, fmtPos, type HistoryPoint } from '@/lib/seo/view';
import Segmented from './Segmented';

type Metric = 'clicks' | 'impressions';

export default function MetricHistory({ history, current }: { history: HistoryPoint[]; current: string }) {
  const [metric, setMetric] = useState<Metric>('clicks');
  const [table, setTable] = useState(false);
  if (history.length < 2) {
    return <p className="text-sm text-gray-600">Der Verlauf erscheint, sobald Zahlen aus mindestens zwei Monaten vorliegen.</p>;
  }
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Segmented
          label="Kennzahl wählen"
          value={metric}
          onChange={setMetric}
          options={[
            ['clicks', 'Klicks'],
            ['impressions', 'Impressionen'],
          ]}
        />
        <button type="button" className="text-sm text-brand-blue underline-offset-2 hover:underline" onClick={() => setTable((t) => !t)}>
          {table ? 'Diagramm zeigen' : 'Als Tabelle zeigen'}
        </button>
      </div>
      {table ? (
        <div className="min-w-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 text-xs text-gray-500">
              <tr>
                <th className="px-2 py-2 text-left font-medium">Monat</th>
                <th className="px-2 py-2 text-right font-medium">Klicks</th>
                <th className="px-2 py-2 text-right font-medium">Impressionen</th>
                <th className="hidden px-2 py-2 text-right font-medium sm:table-cell">Klickrate</th>
                <th className="hidden px-2 py-2 text-right font-medium sm:table-cell">Position</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {[...history].reverse().map((h) => (
                <tr key={h.month} className={h.month === current ? 'font-medium' : ''}>
                  <td className="px-2 py-1.5 whitespace-nowrap">{formatMonthDE(h.month)}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{fmtInt(h.clicks)}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{fmtInt(h.impressions)}</td>
                  <td className="hidden px-2 py-1.5 text-right tabular-nums sm:table-cell">{fmtPct(h.ctr)}</td>
                  <td className="hidden px-2 py-1.5 text-right tabular-nums sm:table-cell">{fmtPos(h.position)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <SingleColumnChart
          points={history.map((h) => ({ month: h.month, value: h[metric] }))}
          current={current}
          unit={metric === 'clicks' ? 'Klicks' : 'Impressionen'}
        />
      )}
    </div>
  );
}
