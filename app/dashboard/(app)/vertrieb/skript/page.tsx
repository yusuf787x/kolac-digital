'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  getActiveCallScript,
  listCallScripts,
  seedInitialCallScriptIfMissing,
  activateCallScript,
  deleteCallScript,
} from '@/lib/firestore';
import type { CallScript } from '@/lib/types';
import ScriptRenderer from '@/components/vertrieb/ScriptRenderer';

export default function CallScriptPage() {
  const [scripts, setScripts] = useState<CallScript[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    await seedInitialCallScriptIfMissing();
    const [active, all] = await Promise.all([
      getActiveCallScript(),
      listCallScripts(),
    ]);
    setScripts(all);
    setSelectedId((prev) => prev ?? active?.id ?? all[0]?.id ?? null);
  }, []);

  useEffect(() => {
    load()
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [load]);

  const selected = scripts.find((s) => s.id === selectedId) ?? null;

  const handleActivate = async (id: string) => {
    setBusy(id);
    try {
      await activateCallScript(id);
      await load();
    } finally {
      setBusy(null);
    }
  };

  const handleDelete = async (id: string) => {
    const s = scripts.find((x) => x.id === id);
    if (!s) return;
    if (s.status === 'active') {
      alert('Aktive Version kann nicht geloescht werden. Erst eine andere aktivieren.');
      return;
    }
    if (!confirm(`Version ${s.version} unwiderruflich loeschen?`)) return;
    setBusy(id);
    try {
      await deleteCallScript(id);
      if (selectedId === id) setSelectedId(null);
      await load();
    } finally {
      setBusy(null);
    }
  };

  if (loading) return <div className="card text-sm text-gray-500">Laedt Skripte…</div>;

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">
            Cold-Call-Skript
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Aktive Version wird im Salespilot als Regie angezeigt. Neue
            Version anlegen fuer Experimente, alte Version als Rollback
            wieder aktivierbar.
          </p>
        </div>
        <div className="flex gap-2">
          {selected && (
            <Link
              href={`/dashboard/vertrieb/skript/${selected.id}/edit`}
              className="btn-secondary"
            >
              Bearbeiten
            </Link>
          )}
          <Link href="/dashboard/vertrieb/skript/neu" className="btn-primary">
            + Neue Version
          </Link>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Versionen-Sidebar */}
        <aside className="lg:col-span-1">
          <div className="card p-0 overflow-hidden">
            <p className="text-xs uppercase text-gray-500 tracking-wider px-3 pt-3 pb-2">
              Versionen
            </p>
            <ul className="divide-y divide-gray-100">
              {scripts.map((s) => {
                const isActive = s.status === 'active';
                const isSelected = s.id === selectedId;
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(s.id)}
                      className={`w-full text-left px-3 py-2.5 hover:bg-gray-50 ${
                        isSelected ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-gray-900">
                          V{s.version}
                        </span>
                        {isActive && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                            aktiv
                          </span>
                        )}
                      </div>
                      {s.note && (
                        <p className="text-xs text-gray-500 truncate mt-0.5">
                          {s.note}
                        </p>
                      )}
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {new Date(s.createdAt.toMillis()).toLocaleDateString(
                          'de-DE',
                        )}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </aside>

        {/* Skript-Anzeige */}
        <section className="lg:col-span-3">
          {!selected ? (
            <div className="card text-sm text-gray-500">
              Kein Skript ausgewaehlt.
            </div>
          ) : (
            <>
              <div className="card mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    Version {selected.version}
                  </h2>
                  {selected.note && (
                    <p className="text-sm text-gray-500 mt-0.5">
                      {selected.note}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    Angelegt{' '}
                    {new Date(selected.createdAt.toMillis()).toLocaleString(
                      'de-DE',
                    )}
                    {selected.status === 'active'
                      ? ' · aktiv'
                      : ' · archiviert'}
                  </p>
                </div>
                <div className="flex gap-2">
                  {selected.status !== 'active' && (
                    <button
                      type="button"
                      onClick={() => handleActivate(selected.id)}
                      disabled={busy === selected.id}
                      className="btn-primary text-sm"
                    >
                      {busy === selected.id
                        ? 'Aktiviere…'
                        : '⤴ Als aktiv setzen (Rollback)'}
                    </button>
                  )}
                  {selected.status !== 'active' && (
                    <button
                      type="button"
                      onClick={() => handleDelete(selected.id)}
                      disabled={busy === selected.id}
                      className="btn-secondary text-sm text-red-600 hover:bg-red-50"
                    >
                      Loeschen
                    </button>
                  )}
                </div>
              </div>

              <ScriptRenderer script={selected} />
            </>
          )}
        </section>
      </div>
    </div>
  );
}
