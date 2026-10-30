'use client';

import { useState } from 'react';
import type { KeywordRow, Movers } from '@/lib/seo/analysis';
import { fmtInt } from '@/lib/seo/view';
import Segmented from './Segmented';

type Mode = 'position' | 'clicks';

function MoverList({ rows, mode, up }: { rows: KeywordRow[]; mode: Mode; up: boolean }) {
  if (!rows.length) return <p className="text-sm text-gray-500">Keine deutlichen Veränderungen.</p>;
  return (
    <ol className="divide-y divide-gray-100">
      {rows.map((r) => (
        <li key={r.query} className="flex items-baseline justify-between gap-3 py-2">
          <span className="min-w-0 break-words">{r.query}</span>
          <span className={`whitespace-nowrap text-sm tabular-nums ${up ? 'text-emerald-700' : 'text-red-700'}`}>
            {mode === 'position' ? (
              <>
                Platz {Math.round(r.prevPosition ?? 0)} <span aria-hidden>→</span>
                <span className="sr-only">auf</span> {Math.round(r.position)}
              </>
            ) : (
              <>
                {fmtInt(r.prevClicks ?? 0)} <span aria-hidden>→</span>
                <span className="sr-only">auf</span> {fmtInt(r.clicks)} Klicks
              </>
            )}
          </span>
        </li>
      ))}
    </ol>
  );
}

export default function MoversPanel({ movers }: { movers: Movers }) {
  const [mode, setMode] = useState<Mode>('position');
  const up = mode === 'position' ? movers.positionWinners : movers.clickWinners;
  const down = mode === 'position' ? movers.positionLosers : movers.clickLosers;
  return (
    <div>
      <Segmented
        label="Veränderung nach"
        value={mode}
        onChange={setMode}
        options={[
          ['position', 'Nach Position'],
          ['clicks', 'Nach Klicks'],
        ]}
      />
      <div className="mt-5 grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="min-w-0">
          <h3 className="mb-2 flex items-center gap-2 font-medium text-emerald-800">
            <span aria-hidden>▲</span> Gewinner
          </h3>
          <MoverList rows={up.slice(0, 8)} mode={mode} up />
        </div>
        <div className="min-w-0">
          <h3 className="mb-2 flex items-center gap-2 font-medium text-red-800">
            <span aria-hidden>▼</span> Verlierer
          </h3>
          <MoverList rows={down.slice(0, 8)} mode={mode} up={false} />
        </div>
      </div>
    </div>
  );
}
