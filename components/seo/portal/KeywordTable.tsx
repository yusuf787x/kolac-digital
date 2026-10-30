'use client';

import { useMemo, useState } from 'react';
import { normalizeText, type KeywordRow } from '@/lib/seo/analysis';
import { fmtInt, fmtPct, fmtPos } from '@/lib/seo/view';
import { PositionDelta } from './parts';

type Brand = 'nonbrand' | 'brand' | 'all';
type SortKey = 'query' | 'clicks' | 'impressions' | 'ctr' | 'position' | 'change';

const PAGE = 25;

const BRAND_OPTIONS: Array<[Brand, string]> = [
  ['nonbrand', 'Ohne Firmenname'],
  ['brand', 'Mit Firmenname'],
  ['all', 'Alle'],
];

function Th({
  k,
  label,
  sort,
  onSort,
  className = '',
}: {
  k: SortKey;
  label: string;
  sort: { key: SortKey; dir: 1 | -1 };
  onSort: (k: SortKey) => void;
  className?: string;
}) {
  return (
    <th
      scope="col"
      aria-sort={sort.key === k ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}
      className={`px-3 py-2 font-medium ${k === 'query' ? 'text-left' : 'text-right'} ${className}`}
    >
      <button type="button" onClick={() => onSort(k)} className="inline-flex items-center gap-1 hover:text-gray-900">
        {label}
        <span aria-hidden className={sort.key === k ? 'text-gray-900' : 'text-gray-300'}>
          {sort.key === k && sort.dir === 1 ? '▲' : '▼'}
        </span>
      </button>
    </th>
  );
}

export default function KeywordTable({
  keywords,
  total,
  groups,
}: {
  keywords: KeywordRow[];
  total: number;
  groups: Array<{ id: string; name: string }>;
}) {
  const [brand, setBrand] = useState<Brand>('nonbrand');
  const [search, setSearch] = useState('');
  const [group, setGroup] = useState('');
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'clicks', dir: -1 });
  const [shown, setShown] = useState(PAGE);

  const rows = useMemo(() => {
    const q = normalizeText(search);
    const change = (r: KeywordRow) => (r.prevPosition === null ? -999 : r.prevPosition - r.position);
    const val = (r: KeywordRow): number | string =>
      sort.key === 'query' ? r.query : sort.key === 'change' ? change(r) : r[sort.key];
    return keywords
      .filter((r) => (brand === 'all' ? true : brand === 'brand' ? r.isBrand : !r.isBrand))
      .filter((r) => !q || normalizeText(r.query).includes(q))
      .filter((r) => !group || (group === '_ohne' ? r.groups.length === 0 : r.groups.includes(group)))
      .sort((a, b) => {
        const va = val(a);
        const vb = val(b);
        const cmp = typeof va === 'string' ? va.localeCompare(vb as string, 'de') : va - (vb as number);
        return cmp * sort.dir || b.impressions - a.impressions;
      });
  }, [keywords, brand, search, group, sort]);

  const toggleSort = (key: SortKey) =>
    setSort((s) =>
      s.key === key ? { key, dir: (s.dir * -1) as 1 | -1 } : { key, dir: key === 'query' || key === 'position' ? 1 : -1 },
    );

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div role="group" aria-label="Suchbegriffe filtern" className="inline-flex flex-wrap rounded-lg border border-gray-200 bg-gray-50 p-0.5">
          {BRAND_OPTIONS.map(([v, l]) => (
            <button
              key={v}
              type="button"
              aria-pressed={brand === v}
              onClick={() => {
                setBrand(v);
                setShown(PAGE);
              }}
              className={`rounded-md px-3 py-1.5 text-sm pointer-coarse:py-2.5 ${brand === v ? 'bg-white font-medium shadow-xs' : 'text-gray-600 hover:text-gray-900'}`}
            >
              {l}
            </button>
          ))}
        </div>
        <div className="flex flex-1 flex-col gap-3 sm:flex-row">
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setShown(PAGE);
            }}
            placeholder="Suchbegriff suchen"
            aria-label="Suchbegriff suchen"
            enterKeyHint="search"
            className="input text-base sm:text-sm"
          />
          {groups.length > 1 && (
            <select
              value={group}
              onChange={(e) => {
                setGroup(e.target.value);
                setShown(PAGE);
              }}
              aria-label="Nach Thema filtern"
              className="input text-base sm:w-56 sm:text-sm"
            >
              <option value="">Alle Themen</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-lg bg-gray-50 px-4 py-6 text-center text-sm text-gray-600">Keine Suchbegriffe für diese Auswahl.</p>
      ) : (
        <>
          {/* Handy: Karten */}
          <ul className="divide-y divide-gray-100 sm:hidden">
            {rows.slice(0, shown).map((r) => (
              <li key={r.query} className="py-3">
                <div className="flex items-start justify-between gap-3">
                  <span className="font-medium break-words">{r.query}</span>
                  <PositionDelta position={r.position} prev={r.prevPosition} />
                </div>
                <dl className="mt-1 grid grid-cols-3 gap-2 text-xs text-gray-500">
                  <div>
                    <dt>Klicks</dt>
                    <dd className="text-sm font-medium text-gray-900 tabular-nums">{fmtInt(r.clicks)}</dd>
                  </div>
                  <div>
                    <dt>Impressionen</dt>
                    <dd className="text-sm text-gray-900 tabular-nums">{fmtInt(r.impressions)}</dd>
                  </div>
                  <div>
                    <dt>Position</dt>
                    <dd className="text-sm text-gray-900 tabular-nums">{fmtPos(r.position)}</dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>

          {/* Ab 640 px: Tabelle */}
          <div className="hidden min-w-0 overflow-x-auto sm:block">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200 text-xs text-gray-500">
                <tr>
                  <Th sort={sort} onSort={toggleSort} k="query" label="Suchbegriff" />
                  <Th sort={sort} onSort={toggleSort} k="clicks" label="Klicks" />
                  <Th sort={sort} onSort={toggleSort} k="impressions" label="Impressionen" />
                  <Th sort={sort} onSort={toggleSort} k="ctr" label="Klickrate" className="hidden lg:table-cell" />
                  <Th sort={sort} onSort={toggleSort} k="position" label="Position" />
                  <Th sort={sort} onSort={toggleSort} k="change" label="Veränderung" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.slice(0, shown).map((r) => (
                  <tr key={r.query} className="hover:bg-gray-50">
                    <td className="px-3 py-2">
                      {r.query}
                      {r.isBrand && <span className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-[11px] text-gray-600">Firmenname</span>}
                    </td>
                    <td className="px-3 py-2 text-right font-medium tabular-nums">{fmtInt(r.clicks)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmtInt(r.impressions)}</td>
                    <td className="hidden px-3 py-2 text-right tabular-nums lg:table-cell">{fmtPct(r.ctr)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmtPos(r.position)}</td>
                    <td className="px-3 py-2 text-right">
                      <PositionDelta position={r.position} prev={r.prevPosition} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-gray-500">
            <span>
              {fmtInt(Math.min(shown, rows.length))} von {fmtInt(rows.length)} angezeigt
              {total > keywords.length && ` (die ${fmtInt(keywords.length)} wichtigsten von ${fmtInt(total)})`}
            </span>
            {shown < rows.length && (
              <button type="button" className="btn-secondary pointer-coarse:h-11" onClick={() => setShown((s) => s + 50)}>
                Weitere anzeigen
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
