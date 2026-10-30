'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Modal from '@/components/ui/Modal';
import { compileGroups, makeBrandMatcher, matchGroups, validatePattern } from '@/lib/seo/analysis';
import { updateSeoClient } from '@/lib/seo/client';
import type { KeywordGroup, SeoClient } from '@/lib/seo/types';
import { Banner, postJson } from './api';

const lines = (s: string) =>
  s
    .split('\n')
    .map((x) => x.trim())
    .filter(Boolean);

const slugId = (name: string) =>
  name
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || `gruppe-${Date.now()}`;

interface GroupDraft {
  id: string;
  name: string;
  patterns: string;
}

export default function SettingsTab({ client, onSaved }: { client: SeoClient; onSaved: () => void }) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(client.displayName);
  const [domain, setDomain] = useState(client.domain);
  const [property, setProperty] = useState(client.gscProperty);
  const [enabled, setEnabled] = useState(client.enabled);
  const [brand, setBrand] = useState((client.brandTerms ?? []).join('\n'));
  const [urls, setUrls] = useState((client.pagespeedUrls ?? []).join('\n'));
  const [groups, setGroups] = useState<GroupDraft[]>(
    (client.keywordGroups ?? []).map((g) => ({ id: g.id, name: g.name, patterns: g.patterns.join('\n') })),
  );
  const [sample, setSample] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ tone: 'error' | 'success'; text: string } | null>(null);
  const [ending, setEnding] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  const parsedGroups: KeywordGroup[] = groups.map((g) => ({ id: g.id, name: g.name.trim(), patterns: lines(g.patterns) }));
  const patternErrors = parsedGroups.flatMap((g) =>
    g.patterns.map((p) => [g.name, p, validatePattern(p)] as const).filter(([, , e]) => e),
  );
  const urlList = lines(urls);
  const badUrls = urlList.filter((u) => !/^https?:\/\/\S+$/.test(u));

  const test = useMemo(() => {
    if (!sample.trim()) return null;
    const compiled = compileGroups(parsedGroups);
    const ids = matchGroups(sample, compiled);
    return {
      brand: makeBrandMatcher(lines(brand))(sample),
      groups: compiled.filter((g) => ids.includes(g.id)).map((g) => g.name),
    };
  }, [sample, brand, groups]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async () => {
    setMsg(null);
    if (patternErrors.length || badUrls.length || urlList.length > 5) {
      setMsg({ tone: 'error', text: 'Bitte zuerst die markierten Fehler beheben.' });
      return;
    }
    setSaving(true);
    try {
      await updateSeoClient(client.customerId, {
        displayName: displayName.trim(),
        domain: domain.trim(),
        gscProperty: property.trim(),
        enabled,
        brandTerms: lines(brand),
        pagespeedUrls: urlList,
        keywordGroups: parsedGroups.filter((g) => g.name && g.patterns.length),
      });
      setMsg({ tone: 'success', text: 'Gespeichert. Marken- und Gruppenregeln gelten sofort für alle gespeicherten Monate.' });
      onSaved();
    } catch (err) {
      setMsg({ tone: 'error', text: (err as Error).message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="card grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="label" htmlFor="s-name">
            Name im Portal
          </label>
          <input id="s-name" className="input text-base sm:text-sm" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="s-domain">
            Domain
          </label>
          <input id="s-domain" className="input text-base sm:text-sm" value={domain} onChange={(e) => setDomain(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="s-prop">
            Search-Console-Property
          </label>
          <input id="s-prop" className="input font-mono text-base sm:text-sm" value={property} onChange={(e) => setProperty(e.target.value)} />
          <p className="mt-1 text-xs text-gray-500">Domain-Property: sc-domain:beispiel.de. URL-Präfix: https://www.beispiel.de/</p>
        </div>
        <div className="flex items-end">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="h-4 w-4" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
            Monatlicher Abruf aktiv
          </label>
        </div>
      </div>

      <div className="card grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="label" htmlFor="s-brand">
            Marken-Begriffe <span className="font-normal text-gray-400">(einer pro Zeile)</span>
          </label>
          <textarea id="s-brand" rows={4} className="input text-base sm:text-sm" value={brand} onChange={(e) => setBrand(e.target.value)} />
          <p className="mt-1 text-xs text-gray-500">Groß/klein, Leerzeichen, Bindestriche und Umlaute werden angeglichen. Tippvarianten bitte einzeln eintragen.</p>
        </div>
        <div>
          <label className="label" htmlFor="s-urls">
            Ladezeit-Seiten <span className="font-normal text-gray-400">(3 bis 5, eine pro Zeile)</span>
          </label>
          <textarea id="s-urls" rows={4} className="input font-mono text-base sm:text-xs" value={urls} onChange={(e) => setUrls(e.target.value)} />
          {(badUrls.length > 0 || urlList.length > 5) && (
            <p className="mt-1 text-xs text-red-700">
              {urlList.length > 5 ? 'Höchstens 5 Seiten. ' : ''}
              {badUrls.length ? `Keine gültige Adresse: ${badUrls.join(', ')}` : ''}
            </p>
          )}
        </div>
      </div>

      <div className="card space-y-4">
        <div>
          <h3 className="font-semibold">Themen-Gruppen</h3>
          <p className="text-sm text-gray-600">
            Pro Gruppe ein oder mehrere reguläre Ausdrücke, einer pro Zeile, ohne Groß/Klein-Unterscheidung. Beispiele:{' '}
            <code>austauschmotor</code>, <code>\b(n47|om651|ea189)\b</code>, <code>bielefeld|herford|lage</code>. Ein Suchbegriff
            darf in mehreren Gruppen landen.
          </p>
        </div>
        {groups.map((g, i) => (
          <div key={g.id} className="grid grid-cols-1 gap-3 rounded-lg border border-gray-200 p-3 md:grid-cols-[220px_minmax(0,1fr)_auto]">
            <input
              aria-label="Gruppenname"
              className="input text-base sm:text-sm"
              placeholder="Name"
              value={g.name}
              onChange={(e) => setGroups((gs) => gs.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
            />
            <textarea
              aria-label={`Ausdrücke für ${g.name || 'Gruppe'}`}
              rows={Math.max(2, lines(g.patterns).length)}
              className="input font-mono text-base sm:text-xs"
              value={g.patterns}
              onChange={(e) => setGroups((gs) => gs.map((x, j) => (j === i ? { ...x, patterns: e.target.value } : x)))}
            />
            <button className="btn-secondary self-start text-red-700" onClick={() => setGroups((gs) => gs.filter((_, j) => j !== i))}>
              Entfernen
            </button>
          </div>
        ))}
        {patternErrors.length > 0 && (
          <Banner tone="error">
            {patternErrors.map(([g, p, e]) => (
              <div key={`${g}${p}`}>
                {g}: <code>{p}</code> ist ungültig ({e})
              </div>
            ))}
          </Banner>
        )}
        <button
          className="btn-secondary"
          onClick={() => setGroups((gs) => [...gs, { id: `${slugId('neu')}-${gs.length + 1}-${Date.now().toString(36)}`, name: '', patterns: '' }])}
        >
          Gruppe hinzufügen
        </button>
        <div className="rounded-lg bg-gray-50 p-3">
          <label className="label" htmlFor="s-test">
            Regeln testen
          </label>
          <input
            id="s-test"
            className="input text-base sm:text-sm"
            placeholder="z. B. n47 steuerkette bielefeld"
            value={sample}
            onChange={(e) => setSample(e.target.value)}
          />
          {test && (
            <p className="mt-2 text-sm">
              {test.brand ? 'Marken-Suche' : 'Keine Marken-Suche'} · Gruppen: {test.groups.length ? test.groups.join(', ') : 'keine'}
            </p>
          )}
        </div>
      </div>

      <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 bg-gray-50/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-sm sm:mx-0 sm:rounded-xl sm:border">
        <div className="min-w-0 flex-1">{msg && <Banner tone={msg.tone}>{msg.text}</Banner>}</div>
        <button className="btn-primary" disabled={saving} onClick={save}>
          {saving ? 'Speichert…' : 'Einstellungen speichern'}
        </button>
      </div>

      <div className="card border-red-200">
        <h3 className="font-semibold text-red-800">SEO-Betreuung beenden</h3>
        <p className="mt-1 text-sm text-gray-600">
          Löscht Zahlen, Berichte, Maßnahmen und alle Portal-Zugänge dieses Kunden.{' '}
          {client.demo ? 'Der Testkunde wird komplett gelöscht.' : 'Der Kunde selbst mit Rechnungen und Verträgen bleibt erhalten.'}
        </p>
        <button className="btn-secondary mt-3 text-red-700" onClick={() => setEnding(true)}>
          Betreuung beenden
        </button>
      </div>

      <Modal open={ending} onClose={() => setEnding(false)} title="SEO-Betreuung wirklich beenden?">
        <p className="text-sm text-gray-700">
          Das lässt sich nicht rückgängig machen. Zur Bestätigung die Domain <strong>{client.domain}</strong> eintippen.
        </p>
        <input className="input mt-3 text-base sm:text-sm" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} aria-label="Domain zur Bestätigung" />
        <div className="mt-5 flex justify-end gap-2">
          <button className="btn-secondary" onClick={() => setEnding(false)}>
            Abbrechen
          </button>
          <button
            className="btn-primary bg-red-600 hover:bg-red-700"
            disabled={confirmText.trim() !== client.domain}
            onClick={async () => {
              await postJson('/api/seo/client', { action: 'delete', customerId: client.customerId });
              router.push('/dashboard/seo');
            }}
          >
            Endgültig löschen
          </button>
        </div>
      </Modal>
    </div>
  );
}
