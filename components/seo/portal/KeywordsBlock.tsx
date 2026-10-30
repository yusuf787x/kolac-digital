'use client';

import { useState } from 'react';
import type { KeywordRow } from '@/lib/seo/analysis';
import { fmtInt, fmtPos } from '@/lib/seo/view';
import KeywordTable from './KeywordTable';
import { PositionDelta } from './parts';

/**
 * Kompakt: die 10 wichtigsten Suchbegriffe ohne Firmennamen. Die volle,
 * filterbare Tabelle erst auf Klick, damit die Seite kurz bleibt.
 */
export default function KeywordsBlock({
  keywords,
  total,
  groups,
}: {
  keywords: KeywordRow[];
  total: number;
  groups: Array<{ id: string; name: string }>;
}) {
  const [all, setAll] = useState(false);
  const top = keywords.filter((k) => !k.isBrand).slice(0, 10);

  if (all) {
    return (
      <div>
        <KeywordTable keywords={keywords} total={total} groups={groups} />
        <button type="button" className="mt-3 text-sm text-brand-blue hover:underline" onClick={() => setAll(false)}>
          Nur die wichtigsten zeigen
        </button>
      </div>
    );
  }

  return (
    <div>
      {top.length === 0 ? (
        <p className="text-sm text-gray-600">Noch keine Suchbegriffe ohne Ihren Firmennamen.</p>
      ) : (
        <ol className="divide-y divide-gray-100">
          <li className="flex items-baseline gap-3 pb-2 text-xs text-gray-500" aria-hidden>
            <span className="flex-1">Suchbegriff</span>
            <span className="w-12 text-right">Klicks</span>
            <span className="w-16 text-right sm:w-14">Platz</span>
            <span className="hidden w-16 text-right sm:block">Vormonat</span>
          </li>
          {top.map((k) => (
            <li key={k.query} className="flex items-baseline gap-3 py-2.5">
              <span className="min-w-0 flex-1 hyphens-auto" lang="de">
                {k.query}
              </span>
              <span className="w-12 text-right font-semibold tabular-nums">{fmtInt(k.clicks)}</span>
              {/* Handy: Veraenderung unter dem Platz, damit der Suchbegriff Platz hat */}
              <span className="flex w-16 flex-col items-end tabular-nums sm:w-14">
                {fmtPos(k.position)}
                <span className="sm:hidden">
                  <PositionDelta position={k.position} prev={k.prevPosition} />
                </span>
              </span>
              <span className="hidden w-16 text-right sm:block">
                <PositionDelta position={k.position} prev={k.prevPosition} />
              </span>
            </li>
          ))}
        </ol>
      )}
      {keywords.length > top.length && (
        <button type="button" className="btn-secondary mt-4 pointer-coarse:h-11" onClick={() => setAll(true)}>
          Alle {fmtInt(total)} Suchbegriffe ansehen
        </button>
      )}
    </div>
  );
}
