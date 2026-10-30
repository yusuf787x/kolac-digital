'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Modal from '@/components/ui/Modal';
import { InlineMd, StatusBadge } from '@/components/seo/portal/parts';
import { parseChangelogMarkdown, type ParsedChangelogEntry } from '@/lib/seo/changelog-markdown';
import { normalizeLinks } from '@/lib/seo/links';
import {
  createActivity,
  deleteActivity,
  deleteCheck,
  listChecks,
  setCheckPublished,
  importActivities,
  listActivities,
  revokeChangelogToken,
  rotateChangelogToken,
  updateActivity,
  type ActivityInput,
} from '@/lib/seo/client';
import { formatIsoDateDE, formatMonthDE, todayIso } from '@/lib/seo/months';
import { ACTIVITY_STATUS_LABELS, CHECK_KIND_LABELS, type SeoActivity, type SeoActivityStatus, type SeoCheck, type SeoClient } from '@/lib/seo/types';
import { Banner } from './api';

const STATUSES: SeoActivityStatus[] = ['done', 'prepared', 'checked', 'planned'];

const emptyForm = (): ActivityInput => ({
  date: todayIso(),
  area: '',
  change: '',
  benefit: '',
  scope: '',
  status: 'done',
  published: true,
});

export default function ActivitiesTab({ client, onClientChange }: { client: SeoClient; onClientChange: () => void }) {
  const [items, setItems] = useState<SeoActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ id: string | null; form: ActivityInput } | null>(null);
  const [deleting, setDeleting] = useState<SeoActivity | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [checks, setChecks] = useState<SeoCheck[]>([]);

  const load = useCallback(async () => {
    try {
      const [acts, chks] = await Promise.all([listActivities(client.customerId), listChecks(client.customerId)]);
      setItems(acts);
      setChecks(chks);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [client.customerId]);

  useEffect(() => {
    load();
  }, [load]);

  const grouped = useMemo(() => {
    const map = new Map<string, SeoActivity[]>();
    for (const a of items) {
      const key = a.status === 'planned' ? 'planned' : a.month;
      map.set(key, [...(map.get(key) ?? []), a]);
    }
    return [...map.entries()].sort(([a], [b]) => (a === 'planned' ? -1 : b === 'planned' ? 1 : b.localeCompare(a)));
  }, [items]);

  const togglePublished = async (a: SeoActivity) => {
    setItems((xs) => xs.map((x) => (x.id === a.id ? { ...x, published: !a.published } : x)));
    try {
      await updateActivity(a.id, { published: !a.published });
    } catch (err) {
      setError((err as Error).message);
      load();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-prose text-sm text-gray-600">
          Jede Maßnahme, die veröffentlicht ist, sieht der Kunde sofort im Portal, unabhängig von der Berichtsfreigabe.
          Geplante Punkte erscheinen dort unter „Als Nächstes geplant“.
        </p>
        <div className="flex flex-wrap gap-2">
          <button className="btn-secondary" onClick={() => setImportOpen(true)}>
            Markdown importieren
          </button>
          <button className="btn-primary" onClick={() => setEditing({ id: null, form: emptyForm() })}>
            Maßnahme eintragen
          </button>
        </div>
      </div>

      {error && <Banner tone="error">{error}</Banner>}

      {loading ? (
        <div className="card text-sm text-gray-500">Lädt…</div>
      ) : items.length === 0 ? (
        <div className="card text-sm text-gray-600">Noch keine Maßnahmen. Trag die erste ein oder importiere ein Änderungsprotokoll.</div>
      ) : (
        grouped.map(([key, list]) => (
          <section key={key} className="card">
            <h3 className="mb-3 font-semibold">{key === 'planned' ? 'Geplant' : formatMonthDE(key)}</h3>
            <ul className="divide-y divide-gray-100">
              {list.map((a) => (
                <li key={a.id} className={`flex flex-col gap-2 py-3 sm:flex-row sm:items-start sm:justify-between ${a.published ? '' : 'opacity-60'}`}>
                  <div className="min-w-0">
                    <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                      <span className="whitespace-nowrap tabular-nums">{formatIsoDateDE(a.date)}</span>
                      <span className="font-medium text-gray-700">{a.area}</span>
                      <StatusBadge status={a.status} />
                      {!a.published && <span className="rounded bg-gray-100 px-1.5 py-0.5">nicht sichtbar</span>}
                      {a.source === 'claude-code' && <span className="rounded bg-violet-50 px-1.5 py-0.5 text-violet-700">Claude Code</span>}
                    </div>
                    <p className="text-sm">
                      <InlineMd text={a.change} />
                    </p>
                    {a.benefit && (
                      <p className="text-sm text-gray-600">
                        Nutzen: <InlineMd text={a.benefit} />
                      </p>
                    )}
                    {a.scope && <p className="text-xs text-gray-500">Umfang: {a.scope}</p>}
                    {!!a.links?.length && (
                      <p className="text-xs text-gray-500">
                        Links:{' '}
                        {a.links.map((l, i) => (
                          <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer" className="text-brand-blue hover:underline">
                            {i > 0 ? ', ' : ''}
                            {l.label}
                          </a>
                        ))}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-1.5">
                    <button className="btn-secondary px-2.5 py-1 text-xs" onClick={() => togglePublished(a)}>
                      {a.published ? 'Verbergen' : 'Veröffentlichen'}
                    </button>
                    <button
                      className="btn-secondary px-2.5 py-1 text-xs"
                      onClick={() =>
                        setEditing({
                          id: a.id,
                          form: {
                            date: a.date,
                            area: a.area,
                            change: a.change,
                            benefit: a.benefit ?? '',
                            scope: a.scope ?? '',
                            status: a.status,
                            published: a.published,
                            links: a.links ?? [],
                          },
                        })
                      }
                    >
                      Bearbeiten
                    </button>
                    <button className="btn-secondary px-2.5 py-1 text-xs text-red-700" onClick={() => setDeleting(a)}>
                      Löschen
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}

      <section className="card">
        <h3 className="font-semibold">Prüfungen</h3>
        <p className="mb-3 text-sm text-gray-600">
          Scans und aktuelle Kennzahlen aus Claude Code. Veröffentlichte Prüfungen sieht der Kunde sofort unter „Prüfungen“ und im
          Bericht. Was nach Interna aussah, ist automatisch verborgen.
        </p>
        {checks.length === 0 ? (
          <p className="text-sm text-gray-500">Noch keine Prüfungen.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {checks.map((c) => (
              <li key={c.id} className={`flex flex-col gap-2 py-3 sm:flex-row sm:items-start sm:justify-between ${c.published ? '' : 'opacity-60'}`}>
                <div className="min-w-0">
                  <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                    <span className="tabular-nums">{formatIsoDateDE(c.date)}</span>
                    <span className="font-medium text-gray-700">{CHECK_KIND_LABELS[c.kind]}</span>
                    {!c.published && <span className="rounded bg-gray-100 px-1.5 py-0.5">nicht sichtbar</span>}
                  </div>
                  <p className="text-sm font-medium">{c.title}</p>
                  <p className="text-sm text-gray-600">{c.summary}</p>
                  <p className="text-xs text-gray-500">
                    {c.metrics.length} Kennzahlen, {c.findings.length} Befunde, {c.links.length} Links
                  </p>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <button
                    className="btn-secondary px-2.5 py-1 text-xs"
                    onClick={async () => {
                      await setCheckPublished(c.id, !c.published);
                      load();
                    }}
                  >
                    {c.published ? 'Verbergen' : 'Veröffentlichen'}
                  </button>
                  <button
                    className="btn-secondary px-2.5 py-1 text-xs text-red-700"
                    onClick={async () => {
                      if (!window.confirm(`Prüfung „${c.title}“ löschen?`)) return;
                      await deleteCheck(c.id);
                      load();
                    }}
                  >
                    Löschen
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ClaudeCodePanel client={client} onChange={onClientChange} />

      {editing && (
        <ActivityModal
          initial={editing.form}
          isNew={!editing.id}
          onClose={() => setEditing(null)}
          onSave={async (form) => {
            if (editing.id) await updateActivity(editing.id, form);
            else await createActivity(client.customerId, form);
            setEditing(null);
            await load();
          }}
        />
      )}

      <Modal open={!!deleting} onClose={() => setDeleting(null)} title="Maßnahme löschen?">
        <p className="text-sm text-gray-700">{deleting?.change}</p>
        <p className="mt-2 text-sm text-gray-500">Wenn sie nur nicht beim Kunden erscheinen soll, reicht „Verbergen“.</p>
        <div className="mt-5 flex justify-end gap-2">
          <button className="btn-secondary" onClick={() => setDeleting(null)}>
            Abbrechen
          </button>
          <button
            className="btn-primary bg-red-600 hover:bg-red-700"
            onClick={async () => {
              if (!deleting) return;
              await deleteActivity(deleting.id);
              setDeleting(null);
              load();
            }}
          >
            Löschen
          </button>
        </div>
      </Modal>

      <ImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        existingKeys={new Set(items.map((i) => i.externalKey).filter(Boolean) as string[])}
        onImport={async (entries) => {
          const r = await importActivities(client.customerId, entries);
          await load();
          return r;
        }}
      />
    </div>
  );
}

function ActivityModal({
  initial,
  isNew,
  onClose,
  onSave,
}: {
  initial: ActivityInput;
  isNew: boolean;
  onClose: () => void;
  onSave: (f: ActivityInput) => Promise<void>;
}) {
  const [f, setF] = useState(initial);
  const [linksText, setLinksText] = useState((initial.links ?? []).map((l) => `${l.label} | ${l.url}`).join('\n'));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof ActivityInput>(k: K, v: ActivityInput[K]) => setF((x) => ({ ...x, [k]: v }));

  return (
    <Modal open onClose={onClose} title={isNew ? 'Maßnahme eintragen' : 'Maßnahme bearbeiten'} maxWidth="max-w-xl">
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setSaving(true);
          try {
            await onSave(f);
          } catch (err) {
            setError((err as Error).message);
            setSaving(false);
          }
        }}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="a-date">
              Datum
            </label>
            <input id="a-date" type="date" required className="input text-base sm:text-sm" value={f.date} onChange={(e) => set('date', e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="a-area">
              Bereich
            </label>
            <input id="a-area" className="input text-base sm:text-sm" placeholder="Inhalte, Technik, Ladezeit…" value={f.area} onChange={(e) => set('area', e.target.value)} />
          </div>
        </div>
        <fieldset>
          <legend className="label">Status</legend>
          <div className="flex flex-wrap gap-1.5">
            {STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={f.status === s}
                onClick={() => set('status', s)}
                className={`rounded-lg border px-3 py-1.5 text-sm ${f.status === s ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-300 bg-white'}`}
              >
                {ACTIVITY_STATUS_LABELS[s]}
              </button>
            ))}
          </div>
        </fieldset>
        <div>
          <label className="label" htmlFor="a-change">
            Änderung
          </label>
          <textarea id="a-change" required rows={2} className="input text-base sm:text-sm" value={f.change} onChange={(e) => set('change', e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="a-benefit">
            Nutzen für den Kunden
          </label>
          <textarea id="a-benefit" rows={2} className="input text-base sm:text-sm" value={f.benefit} onChange={(e) => set('benefit', e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="a-scope">
            Umfang <span className="font-normal text-gray-400">(optional, z. B. „alle 34 Seiten“)</span>
          </label>
          <input id="a-scope" className="input text-base sm:text-sm" value={f.scope} onChange={(e) => set('scope', e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="a-links">
            Links zum Nachverfolgen <span className="font-normal text-gray-400">(eine pro Zeile: Bezeichnung | https://…)</span>
          </label>
          <textarea
            id="a-links"
            rows={2}
            className="input font-mono text-base sm:text-xs"
            placeholder="Seite ansehen | https://www.beispiel.de/leistung"
            value={linksText}
            onChange={(e) => {
              setLinksText(e.target.value);
              set(
                'links',
                normalizeLinks(
                  e.target.value
                    .split('\n')
                    .map((l) => l.split('|').map((x) => x.trim()))
                    .filter((p) => p.some(Boolean))
                    .map((p) => (p.length > 1 ? { label: p[0], url: p[1] } : { label: 'Ansehen', url: p[0] })),
                ),
              );
            }}
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={f.published} onChange={(e) => set('published', e.target.checked)} className="h-4 w-4" />
          Für den Kunden sichtbar
        </label>
        {error && <p className="text-sm text-red-700">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Abbrechen
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Speichert…' : 'Speichern'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ImportModal({
  open,
  onClose,
  existingKeys,
  onImport,
}: {
  open: boolean;
  onClose: () => void;
  existingKeys: Set<string>;
  onImport: (entries: Array<ParsedChangelogEntry & { published: boolean }>) => Promise<{ created: number; updated: number }>;
}) {
  const [markdown, setMarkdown] = useState('');
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const parsed = useMemo(() => (markdown.trim() ? parseChangelogMarkdown(markdown, { fallbackDate: todayIso() }) : null), [markdown]);

  useEffect(() => {
    if (!parsed) return;
    // Standard: Erledigtes sichtbar, offene Punkte erst einmal verborgen
    setSelected(Object.fromEntries(parsed.entries.map((e) => [e.key, e.status !== 'planned'])));
  }, [parsed]);

  const close = () => {
    setMarkdown('');
    setResult(null);
    onClose();
  };

  return (
    <Modal open={open} onClose={close} title="Änderungsprotokoll importieren" maxWidth="max-w-3xl">
      {result ? (
        <div className="space-y-4">
          <Banner tone="success">{result}</Banner>
          <div className="flex justify-end">
            <button className="btn-primary" onClick={close}>
              Fertig
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Format wie in den Kundenprojekten: <code>## 28.10.2026</code>, darunter <code>### Bereich</code> und Tabellen mit Status
            (✅ 🟡 🔍), Änderung und Nutzen. „Offene Punkte“ werden als geplant erkannt. Mehrfaches Importieren erzeugt keine
            Dubletten, der Status wird aktualisiert.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <label className="btn-secondary cursor-pointer">
              Datei wählen
              <input
                type="file"
                accept=".md,.markdown,.txt,text/markdown"
                className="sr-only"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) setMarkdown(await file.text());
                }}
              />
            </label>
            <span className="text-sm text-gray-500">oder Inhalt einfügen:</span>
          </div>
          <textarea
            className="input min-h-40 font-mono text-xs"
            value={markdown}
            onChange={(e) => setMarkdown(e.target.value)}
            placeholder="# Änderungsprotokoll …"
          />
          {parsed && (
            <div>
              {parsed.warnings.map((w) => (
                <Banner key={w} tone="info">
                  {w}
                </Banner>
              ))}
              {parsed.entries.length > 0 && (
                <>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="font-medium">{parsed.entries.length} Einträge erkannt. Haken = für den Kunden sichtbar.</span>
                  </div>
                  <ul className="max-h-80 divide-y divide-gray-100 overflow-y-auto rounded-lg border border-gray-200">
                    {parsed.entries.map((e) => (
                      <li key={e.key} className="flex gap-3 px-3 py-2 text-sm">
                        <input
                          type="checkbox"
                          className="mt-1 h-4 w-4 shrink-0"
                          aria-label="Für den Kunden sichtbar"
                          checked={!!selected[e.key]}
                          onChange={(ev) => setSelected((s) => ({ ...s, [e.key]: ev.target.checked }))}
                        />
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                            <span>{formatIsoDateDE(e.date)}</span>
                            <span className="font-medium text-gray-700">{e.area}</span>
                            <StatusBadge status={e.status} />
                            {existingKeys.has(e.key) && <span className="rounded bg-sky-50 px-1.5 text-sky-700">schon vorhanden, wird aktualisiert</span>}
                          </div>
                          <div>
                            <InlineMd text={e.change} />
                          </div>
                          {e.benefit && <div className="text-gray-500">{e.benefit}</div>}
                        </div>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <button className="btn-secondary" onClick={close}>
              Abbrechen
            </button>
            <button
              className="btn-primary"
              disabled={!parsed?.entries.length || busy}
              onClick={async () => {
                setBusy(true);
                try {
                  const r = await onImport(parsed!.entries.map((e) => ({ ...e, published: !!selected[e.key] })));
                  setResult(`${r.created} neu angelegt, ${r.updated} aktualisiert.`);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? 'Importiert…' : 'Importieren'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function ClaudeCodePanel({ client, onChange }: { client: SeoClient; onChange: () => void }) {
  const [token, setToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const base = typeof window !== 'undefined' ? window.location.origin : '';

  const config = JSON.stringify({ portalUrl: base, customer: client.displayName }, null, 2);
  const copy = async (label: string, value: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <section className="card space-y-3">
      <div>
        <h3 className="font-semibold">Veröffentlichen aus Claude Code</h3>
        <p className="mt-1 max-w-prose text-sm text-gray-600">
          Im Kundenprojekt pflegt Claude Code die <code>CHANGELOG.md</code>. Mit dem Skill <code>kolac-portal-changelog</code>{' '}
          („Changelog ins Portal“) wird sie hierher übertragen. Neue erledigte Einträge sind sofort sichtbar, offene Punkte nie
          automatisch. Der Schlüssel gilt nur für diesen Kunden.
        </p>
      </div>
      {token ? (
        <div className="space-y-3">
          <Banner tone="info">Der Schlüssel wird nur jetzt angezeigt. In die .env des Kundenprojekts eintragen.</Banner>
          <div>
            <div className="label">.env im Kundenprojekt</div>
            <div className="flex gap-2">
              <code className="min-w-0 flex-1 overflow-x-auto rounded-lg bg-gray-900 px-3 py-2 text-xs whitespace-nowrap text-white">
                KOLAC_PORTAL_TOKEN={token}
              </code>
              <button className="btn-secondary" onClick={() => copy('env', `KOLAC_PORTAL_TOKEN=${token}`)}>
                {copied === 'env' ? 'Kopiert' : 'Kopieren'}
              </button>
            </div>
          </div>
          <div>
            <div className="label">.kolac-portal.json im Kundenprojekt</div>
            <div className="flex gap-2">
              <pre className="min-w-0 flex-1 overflow-x-auto rounded-lg bg-gray-900 px-3 py-2 text-xs text-white">{config}</pre>
              <button className="btn-secondary self-start" onClick={() => copy('json', config)}>
                {copied === 'json' ? 'Kopiert' : 'Kopieren'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-sm">
          {client.changelogTokenHint ? (
            <>
              Schlüssel aktiv, endet auf <code>…{client.changelogTokenHint}</code>.
            </>
          ) : (
            'Noch kein Schlüssel.'
          )}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <button
          className="btn-secondary"
          disabled={busy}
          onClick={async () => {
            if (client.changelogTokenHint && !window.confirm('Neuen Schlüssel erzeugen? Der alte funktioniert dann nicht mehr.')) return;
            setBusy(true);
            setToken(await rotateChangelogToken(client.customerId));
            setBusy(false);
            onChange();
          }}
        >
          {client.changelogTokenHint ? 'Neuen Schlüssel erzeugen' : 'Schlüssel erzeugen'}
        </button>
        {client.changelogTokenHint && (
          <button
            className="btn-secondary text-red-700"
            disabled={busy}
            onClick={async () => {
              if (!window.confirm('Schlüssel widerrufen? Claude Code kann dann nichts mehr übertragen.')) return;
              await revokeChangelogToken(client.customerId);
              setToken(null);
              onChange();
            }}
          >
            Widerrufen
          </button>
        )}
      </div>
    </section>
  );
}
