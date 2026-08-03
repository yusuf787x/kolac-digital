'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { getCallLogConfig, updateCallLogConfig } from '@/lib/firestore';
import type {
  CallLogConfig,
  CallStageOption,
  CallOutcomeOption,
  CallObjectionOption,
} from '@/lib/types';

function nid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 6)}`;
}

/**
 * Editor fuer die Cold-Call-Konfiguration. Stufen, Ergebnisse und
 * Einwaende sind Daten — kein Code. Wird von Salespilot und
 * Auswertung genutzt.
 */
export default function CallLogConfigPage() {
  const [config, setConfig] = useState<CallLogConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    const c = await getCallLogConfig();
    setConfig(c);
  }, []);

  useEffect(() => {
    load()
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [load]);

  if (loading || !config)
    return <div className="card text-sm text-gray-500">Laedt Config…</div>;

  const save = async (patch: Partial<CallLogConfig>) => {
    setSaving(true);
    setMessage(null);
    try {
      await updateCallLogConfig(patch);
      await load();
      setMessage('Gespeichert.');
      setTimeout(() => setMessage(null), 1500);
    } finally {
      setSaving(false);
    }
  };

  const reorder = <T extends { order: number }>(list: T[]): T[] =>
    list.map((x, i) => ({ ...x, order: i }));

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
          Call-Log-Konfiguration
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Stufen, Ergebnisse und Einwand-Kategorien werden im Salespilot
          und in der Auswertung genutzt. Aendern hier ist im ganzen System
          sofort wirksam. Bereits erfasste Calls behalten ihre Labels als
          Snapshot.
        </p>
        {message && (
          <div className="mt-3 text-sm text-emerald-700">{message}</div>
        )}
      </header>

      {/* Stages */}
      <section className="card mb-6">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-base font-semibold text-gray-900">
            Stufen — wo endete der Call?
          </h2>
          <button
            type="button"
            className="text-sm text-brand-blue hover:underline"
            onClick={() => {
              const next: CallStageOption[] = [
                ...config.stages,
                {
                  id: nid('stage'),
                  label: 'Neue Stufe',
                  order: config.stages.length,
                },
              ];
              save({ stages: next });
            }}
          >
            + Stufe
          </button>
        </div>
        <p className="text-xs text-gray-500 mb-3">
          Sortiert nach Reihenfolge — das wird auch im Salespilot-Dropdown
          so angezeigt.
        </p>
        <ul className="space-y-2">
          {config.stages
            .sort((a, b) => a.order - b.order)
            .map((s, idx, arr) => (
              <li key={s.id} className="flex items-center gap-2">
                <input
                  className="input flex-1"
                  value={s.label}
                  onChange={(e) => {
                    const next = config.stages.map((x) =>
                      x.id === s.id ? { ...x, label: e.target.value } : x,
                    );
                    save({ stages: next });
                  }}
                  disabled={saving}
                />
                <button
                  type="button"
                  onClick={() => {
                    if (idx === 0) return;
                    const swapped = [...arr];
                    [swapped[idx], swapped[idx - 1]] = [
                      swapped[idx - 1],
                      swapped[idx],
                    ];
                    save({ stages: reorder(swapped) });
                  }}
                  disabled={idx === 0 || saving}
                  className="text-xs text-gray-500 hover:text-gray-900 disabled:opacity-30"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (idx === arr.length - 1) return;
                    const swapped = [...arr];
                    [swapped[idx], swapped[idx + 1]] = [
                      swapped[idx + 1],
                      swapped[idx],
                    ];
                    save({ stages: reorder(swapped) });
                  }}
                  disabled={idx === arr.length - 1 || saving}
                  className="text-xs text-gray-500 hover:text-gray-900 disabled:opacity-30"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!confirm(`Stufe „${s.label}" loeschen?`)) return;
                    save({
                      stages: reorder(
                        config.stages.filter((x) => x.id !== s.id),
                      ),
                    });
                  }}
                  className="text-xs text-red-600 hover:underline"
                  disabled={saving}
                >
                  x
                </button>
              </li>
            ))}
        </ul>
      </section>

      {/* Outcomes */}
      <section className="card mb-6">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-base font-semibold text-gray-900">
            Ergebnisse
          </h2>
          <button
            type="button"
            className="text-sm text-brand-blue hover:underline"
            onClick={() => {
              const next: CallOutcomeOption[] = [
                ...config.outcomes,
                {
                  id: nid('outcome'),
                  label: 'Neues Ergebnis',
                  isSuccess: false,
                  order: config.outcomes.length,
                },
              ];
              save({ outcomes: next });
            }}
          >
            + Ergebnis
          </button>
        </div>
        <p className="text-xs text-gray-500 mb-3">
          Als <em>Success</em> markierte Ergebnisse zaehlen in die
          Terminquote. Meist ist „Termin vereinbart" der einzige
          Success-Wert.
        </p>
        <ul className="space-y-2">
          {config.outcomes
            .sort((a, b) => a.order - b.order)
            .map((o) => (
              <li key={o.id} className="flex items-center gap-2">
                <input
                  className="input flex-1"
                  value={o.label}
                  onChange={(e) => {
                    save({
                      outcomes: config.outcomes.map((x) =>
                        x.id === o.id ? { ...x, label: e.target.value } : x,
                      ),
                    });
                  }}
                  disabled={saving}
                />
                <label className="inline-flex items-center gap-1 text-xs text-gray-700 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={o.isSuccess}
                    onChange={(e) =>
                      save({
                        outcomes: config.outcomes.map((x) =>
                          x.id === o.id
                            ? { ...x, isSuccess: e.target.checked }
                            : x,
                        ),
                      })
                    }
                    className="h-4 w-4"
                    disabled={saving}
                  />
                  Success
                </label>
                <button
                  type="button"
                  onClick={() => {
                    if (!confirm(`Ergebnis „${o.label}" loeschen?`)) return;
                    save({
                      outcomes: reorder(
                        config.outcomes.filter((x) => x.id !== o.id),
                      ),
                    });
                  }}
                  className="text-xs text-red-600 hover:underline"
                  disabled={saving}
                >
                  x
                </button>
              </li>
            ))}
        </ul>
      </section>

      {/* Objections */}
      <section className="card">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-base font-semibold text-gray-900">
            Einwand-Kategorien
          </h2>
          <button
            type="button"
            className="text-sm text-brand-blue hover:underline"
            onClick={() => {
              const next: CallObjectionOption[] = [
                ...config.objections,
                {
                  id: nid('obj'),
                  label: 'Neuer Einwand',
                  order: config.objections.length,
                },
              ];
              save({ objections: next });
            }}
          >
            + Einwand
          </button>
        </div>
        <p className="text-xs text-gray-500 mb-3">
          Wird im Salespilot nur angeboten, wenn du auf „Einwand" als
          Stufe gehst. In der Auswertung siehst du welche Einwaende sich
          haeufen.
        </p>
        <ul className="space-y-2">
          {config.objections
            .sort((a, b) => a.order - b.order)
            .map((o) => (
              <li key={o.id} className="flex items-center gap-2">
                <input
                  className="input flex-1"
                  value={o.label}
                  onChange={(e) => {
                    save({
                      objections: config.objections.map((x) =>
                        x.id === o.id ? { ...x, label: e.target.value } : x,
                      ),
                    });
                  }}
                  disabled={saving}
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!confirm(`Einwand „${o.label}" loeschen?`)) return;
                    save({
                      objections: reorder(
                        config.objections.filter((x) => x.id !== o.id),
                      ),
                    });
                  }}
                  className="text-xs text-red-600 hover:underline"
                  disabled={saving}
                >
                  x
                </button>
              </li>
            ))}
        </ul>
      </section>
    </div>
  );
}
