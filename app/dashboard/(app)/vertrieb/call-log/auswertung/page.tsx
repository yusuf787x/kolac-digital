'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  getCallLogConfig,
  listCallLogs,
  listCallScripts,
} from '@/lib/firestore';
import type { CallLog, CallLogConfig, CallScript } from '@/lib/types';

type Timespan = '7d' | '30d' | '90d' | 'all';

const TIMESPAN_LABELS: Record<Timespan, string> = {
  '7d': 'Letzte 7 Tage',
  '30d': 'Letzte 30 Tage',
  '90d': 'Letzte 90 Tage',
  all: 'Alle',
};

/**
 * Cold-Call-Auswertung. Alle Kennzahlen werden client-side aus den
 * CallLog-Snapshots berechnet — keine Composite-Indexe noetig.
 * Skript-Version + Zeitraum sind filterbar; bei mehreren Callern gibt
 * es eine Aufschluesselung pro Caller.
 */
export default function CallLogAuswertungPage() {
  const [logs, setLogs] = useState<CallLog[]>([]);
  const [config, setConfig] = useState<CallLogConfig | null>(null);
  const [scripts, setScripts] = useState<CallScript[]>([]);
  const [loading, setLoading] = useState(true);
  const [timespan, setTimespan] = useState<Timespan>('30d');
  const [scriptVersionFilter, setScriptVersionFilter] = useState<
    number | 'alle'
  >('alle');
  const [callerFilter, setCallerFilter] = useState<string>('alle');

  const load = useCallback(async () => {
    const [l, c, s] = await Promise.all([
      listCallLogs(),
      getCallLogConfig(),
      listCallScripts(),
    ]);
    setLogs(l);
    setConfig(c);
    setScripts(s);
  }, []);

  useEffect(() => {
    load()
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [load]);

  const cutoff = useMemo(() => {
    if (timespan === 'all') return 0;
    const d = new Date();
    const days = timespan === '7d' ? 7 : timespan === '30d' ? 30 : 90;
    d.setDate(d.getDate() - days);
    return d.getTime();
  }, [timespan]);

  const filteredLogs = useMemo(
    () =>
      logs.filter((l) => {
        if (l.calledAt.toMillis() < cutoff) return false;
        if (
          scriptVersionFilter !== 'alle' &&
          l.scriptVersionNumber !== scriptVersionFilter
        )
          return false;
        if (callerFilter !== 'alle' && (l.callerName ?? '—') !== callerFilter)
          return false;
        return true;
      }),
    [logs, cutoff, scriptVersionFilter, callerFilter],
  );

  const callers = useMemo(() => {
    const s = new Set<string>();
    logs.forEach((l) => l.callerName && s.add(l.callerName));
    return Array.from(s).sort();
  }, [logs]);

  const totals = useMemo(() => {
    const total = filteredLogs.length;
    const success = filteredLogs.filter((l) => l.outcomeIsSuccess).length;
    return {
      total,
      success,
      quote: total > 0 ? (success / total) * 100 : 0,
    };
  }, [filteredLogs]);

  const funnel = useMemo(() => {
    if (!config) return [];
    return config.stages
      .sort((a, b) => a.order - b.order)
      .map((s) => {
        const count = filteredLogs.filter((l) => l.stageId === s.id).length;
        return {
          id: s.id,
          label: s.label,
          count,
          pct: filteredLogs.length > 0 ? (count / filteredLogs.length) * 100 : 0,
        };
      });
  }, [config, filteredLogs]);

  const objectionStats = useMemo(() => {
    if (!config) return [];
    return config.objections
      .map((o) => ({
        id: o.id,
        label: o.label,
        count: filteredLogs.filter((l) => l.objectionTypeId === o.id).length,
      }))
      .filter((x) => x.count > 0)
      .sort((a, b) => b.count - a.count);
  }, [config, filteredLogs]);

  const versionComparison = useMemo(() => {
    // Alle Versionen im Filter-Zeitraum aggregieren
    const map = new Map<
      number,
      { total: number; success: number; topStage: Map<string, number> }
    >();
    for (const l of filteredLogs) {
      const v = l.scriptVersionNumber;
      const entry = map.get(v) ?? {
        total: 0,
        success: 0,
        topStage: new Map(),
      };
      entry.total += 1;
      if (l.outcomeIsSuccess) entry.success += 1;
      entry.topStage.set(
        l.stageLabel,
        (entry.topStage.get(l.stageLabel) ?? 0) + 1,
      );
      map.set(v, entry);
    }
    return Array.from(map.entries())
      .sort((a, b) => b[0] - a[0])
      .map(([version, s]) => {
        let topLabel: string | null = null;
        let topCount = 0;
        s.topStage.forEach((c, l) => {
          if (c > topCount) {
            topCount = c;
            topLabel = l;
          }
        });
        return {
          version,
          total: s.total,
          success: s.success,
          quote: s.total > 0 ? (s.success / s.total) * 100 : 0,
          topDrop: topLabel,
        };
      });
  }, [filteredLogs]);

  const callerStats = useMemo(() => {
    const map = new Map<string, { total: number; success: number }>();
    for (const l of filteredLogs) {
      const name = l.callerName ?? '—';
      const entry = map.get(name) ?? { total: 0, success: 0 };
      entry.total += 1;
      if (l.outcomeIsSuccess) entry.success += 1;
      map.set(name, entry);
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1].total - a[1].total)
      .map(([name, s]) => ({
        name,
        total: s.total,
        success: s.success,
        quote: s.total > 0 ? (s.success / s.total) * 100 : 0,
      }));
  }, [filteredLogs]);

  if (loading || !config)
    return <div className="card text-sm text-gray-500">Laedt Auswertung…</div>;

  const maxFunnelCount = Math.max(1, ...funnel.map((f) => f.count));
  const maxObjectionCount = Math.max(
    1,
    ...objectionStats.map((o) => o.count),
  );

  return (
    <div>
      <header className="mb-6">
        <Link
          href="/dashboard/vertrieb/leads/pilot"
          className="text-sm text-gray-500 hover:text-gray-900 mb-3 inline-block"
        >
          ← Zurueck zum Salespilot
        </Link>
        <h1 className="text-3xl font-semibold text-gray-900">
          Cold-Call-Auswertung
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Funnel, Terminquote, Einwaende und Version-Vergleich.
        </p>
      </header>

      {/* Filter */}
      <div className="card mb-6 flex flex-wrap gap-3 items-center">
        <select
          className="input sm:w-48"
          value={timespan}
          onChange={(e) => setTimespan(e.target.value as Timespan)}
        >
          {Object.entries(TIMESPAN_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <select
          className="input sm:w-48"
          value={String(scriptVersionFilter)}
          onChange={(e) =>
            setScriptVersionFilter(
              e.target.value === 'alle' ? 'alle' : parseInt(e.target.value, 10),
            )
          }
        >
          <option value="alle">Alle Skript-Versionen</option>
          {scripts
            .sort((a, b) => b.version - a.version)
            .map((s) => (
              <option key={s.id} value={s.version}>
                V{s.version}
                {s.status === 'active' ? ' (aktiv)' : ''}
              </option>
            ))}
        </select>
        {callers.length > 1 && (
          <select
            className="input sm:w-48"
            value={callerFilter}
            onChange={(e) => setCallerFilter(e.target.value)}
          >
            <option value="alle">Alle Caller</option>
            {callers.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        )}
        <span className="text-xs text-gray-500 ml-auto">
          {filteredLogs.length} Call{filteredLogs.length === 1 ? '' : 's'} im
          Filter
        </span>
      </div>

      {filteredLogs.length === 0 ? (
        <div className="card text-sm text-gray-500 text-center py-8">
          Keine Calls im gewaehlten Filter. Salespilot oeffnen und den
          ersten Call buchen.
        </div>
      ) : (
        <>
          {/* KPI-Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
            <div className="card">
              <p className="text-xs uppercase text-gray-500 tracking-wider">
                Calls
              </p>
              <p className="text-3xl font-bold text-gray-900">{totals.total}</p>
            </div>
            <div className="card">
              <p className="text-xs uppercase text-gray-500 tracking-wider">
                Termine
              </p>
              <p className="text-3xl font-bold text-gray-900">
                {totals.success}
              </p>
            </div>
            <div className="card">
              <p className="text-xs uppercase text-gray-500 tracking-wider">
                Terminquote
              </p>
              <p className="text-3xl font-bold text-emerald-700">
                {totals.quote.toFixed(1)} %
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Funnel */}
            <section className="card">
              <h2 className="text-base font-semibold text-gray-900 mb-3">
                Funnel — wo enden die Calls?
              </h2>
              <ul className="space-y-2">
                {funnel.map((f) => (
                  <li key={f.id}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-900">{f.label}</span>
                      <span className="text-gray-500 tabular-nums">
                        {f.count} · {f.pct.toFixed(1)} %
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brand-blue transition-all"
                        style={{
                          width: `${(f.count / maxFunnelCount) * 100}%`,
                        }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            {/* Einwaende */}
            <section className="card">
              <h2 className="text-base font-semibold text-gray-900 mb-3">
                Haeufigste Einwaende
              </h2>
              {objectionStats.length === 0 ? (
                <p className="text-sm text-gray-500 italic">
                  Keine Einwaende erfasst im Filter.
                </p>
              ) : (
                <ul className="space-y-2">
                  {objectionStats.map((o) => (
                    <li key={o.id}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-900">{o.label}</span>
                        <span className="text-gray-500 tabular-nums">
                          {o.count} ×
                        </span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-500 transition-all"
                          style={{
                            width: `${(o.count / maxObjectionCount) * 100}%`,
                          }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          {/* Version-Vergleich */}
          <section className="card mt-6">
            <h2 className="text-base font-semibold text-gray-900 mb-3">
              Skript-Versions-Vergleich
            </h2>
            {versionComparison.length === 0 ? (
              <p className="text-sm text-gray-500 italic">
                Keine Calls vorhanden.
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead className="text-xs uppercase text-gray-500 tracking-wider">
                  <tr>
                    <th className="text-left py-2">Version</th>
                    <th className="text-right py-2">Calls</th>
                    <th className="text-right py-2">Termine</th>
                    <th className="text-right py-2">Quote</th>
                    <th className="text-left py-2">Haeufigster Ausstieg</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {versionComparison.map((v) => (
                    <tr key={v.version}>
                      <td className="py-2 font-medium text-gray-900">
                        V{v.version}
                      </td>
                      <td className="py-2 text-right tabular-nums">
                        {v.total}
                      </td>
                      <td className="py-2 text-right tabular-nums">
                        {v.success}
                      </td>
                      <td className="py-2 text-right font-semibold text-emerald-700 tabular-nums">
                        {v.quote.toFixed(1)} %
                      </td>
                      <td className="py-2 text-gray-700">
                        {v.topDrop ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          {/* Caller-Vergleich */}
          {callerStats.length > 1 && (
            <section className="card mt-6">
              <h2 className="text-base font-semibold text-gray-900 mb-3">
                Caller-Vergleich
              </h2>
              <table className="w-full text-sm">
                <thead className="text-xs uppercase text-gray-500 tracking-wider">
                  <tr>
                    <th className="text-left py-2">Caller</th>
                    <th className="text-right py-2">Calls</th>
                    <th className="text-right py-2">Termine</th>
                    <th className="text-right py-2">Quote</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {callerStats.map((c) => (
                    <tr key={c.name}>
                      <td className="py-2">{c.name}</td>
                      <td className="py-2 text-right tabular-nums">
                        {c.total}
                      </td>
                      <td className="py-2 text-right tabular-nums">
                        {c.success}
                      </td>
                      <td className="py-2 text-right font-semibold tabular-nums">
                        {c.quote.toFixed(1)} %
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
        </>
      )}
    </div>
  );
}
