'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { site } from '@/lib/site-config';
import {
  CATEGORY_LABELS,
  type CheckCategory,
  type CheckItem,
  type CheckStatus,
  type SeoCheckResponse,
} from '@/lib/seo-check/types';

type Phase =
  | { kind: 'idle' }
  | { kind: 'running'; url: string }
  | { kind: 'loading-report' }
  | { kind: 'done'; data: SeoCheckResponse }
  | { kind: 'error'; message: string; code?: string; lastCheckId?: string };

const STEPS = [
  'Website wird geladen',
  'Technik wird geprüft',
  'Inhalte und Unterseiten werden gelesen',
  'Platzierungen bei Google werden abgerufen',
  'Ladezeit auf dem Handy wird gemessen',
  'Ergebnis wird berechnet',
];

const STATUS_STYLE: Record<CheckStatus, { label: string; cls: string }> = {
  ok: { label: 'Gut', cls: 'text-[var(--color-ok)] bg-[var(--color-ok-bg)]' },
  warn: { label: 'Verbesserbar', cls: 'text-[var(--color-warn)] bg-[var(--color-warn-bg)]' },
  fail: { label: 'Problem', cls: 'text-[var(--color-fail)] bg-[var(--color-fail-bg)]' },
  info: { label: 'Info', cls: 'text-[var(--color-black)] bg-[var(--color-offwhite)]' },
};

const CATEGORY_ORDER: CheckCategory[] = ['sichtbarkeit', 'technik', 'inhalte', 'lokal'];

function scoreTone(score: number): { color: string; label: string } {
  if (score >= 80) return { color: 'var(--color-ok)', label: 'Gut aufgestellt' };
  if (score >= 50) return { color: 'var(--color-warn)', label: 'Ausbaufähig' };
  return { color: 'var(--color-fail)', label: 'Viel Luft nach oben' };
}

/**
 * Inhaber-Erkennung: Nur wenn in diesem Browser schon einmal ein
 * Dashboard-Login stattfand, wird Firebase nachgeladen und das Token
 * mitgeschickt. Normale Besucher laden das SDK nie.
 */
async function getOwnerToken(): Promise<string | null> {
  try {
    const dbs = 'databases' in indexedDB ? await indexedDB.databases() : [];
    if (!dbs.some((d) => d.name === 'firebaseLocalStorageDb')) return null;
    const [{ auth }, { onAuthStateChanged }] = await Promise.all([import('@/lib/firebase'), import('firebase/auth')]);
    const user = await new Promise<typeof auth.currentUser>((resolve) => {
      const timer = setTimeout(() => resolve(auth.currentUser), 2500);
      const unsub = onAuthStateChanged(auth, (u) => {
        clearTimeout(timer);
        unsub();
        resolve(u);
      });
    });
    return user ? await user.getIdToken() : null;
  } catch {
    return null;
  }
}

async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = await getOwnerToken();
  return fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });
}

export default function SeoCheckClient({ initialId }: { initialId?: string }) {
  const [url, setUrl] = useState('');
  const [phase, setPhase] = useState<Phase>(initialId ? { kind: 'loading-report' } : { kind: 'idle' });
  const resultRef = useRef<HTMLDivElement>(null);

  // Gespeicherten Bericht laden, wenn die Seite mit ?id=... geoeffnet wird.
  useEffect(() => {
    if (!initialId) return;
    apiFetch(`/api/seo-check/${encodeURIComponent(initialId)}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? 'Der Bericht konnte nicht geladen werden.');
        setPhase({ kind: 'done', data: json as SeoCheckResponse });
      })
      .catch((err: Error) => setPhase({ kind: 'error', message: err.message }));
  }, [initialId]);

  useEffect(() => {
    if (phase.kind === 'done') resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [phase.kind]);

  async function start(e: FormEvent) {
    e.preventDefault();
    const value = url.trim();
    if (!value) return;
    setPhase({ kind: 'running', url: value });
    try {
      const res = await apiFetch('/api/seo-check', { method: 'POST', body: JSON.stringify({ url: value }) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPhase({ kind: 'error', message: json.error ?? 'Der Check ist fehlgeschlagen.', code: json.code, lastCheckId: json.lastCheckId });
        return;
      }
      const data = json as SeoCheckResponse;
      window.history.replaceState(null, '', `/seo-check?id=${data.id}`);
      setPhase({ kind: 'done', data });
    } catch {
      setPhase({ kind: 'error', message: 'Keine Verbindung. Bitte prüf dein Internet und versuch es noch einmal.' });
    }
  }

  function reset() {
    window.history.replaceState(null, '', '/seo-check');
    setUrl('');
    setPhase({ kind: 'idle' });
  }

  const running = phase.kind === 'running';
  const owner = phase.kind === 'done' && phase.data.owner;

  return (
    <>
      <section className="bg-[var(--color-offwhite)] pt-[calc(var(--nav-height)+48px)] pb-16 md:pb-20">
        <div className="mx-auto max-w-[800px] px-4 md:px-6 text-center">
          <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[var(--color-blue)]">Kostenloser SEO-Check</p>
          <h1 className="mt-3 text-[32px] md:text-[48px] font-extrabold leading-[1.1] tracking-tight text-[var(--color-black)]">
            Wird deine Website bei Google gefunden?
          </h1>
          <p className="mx-auto mt-4 max-w-[600px] text-[17px] leading-relaxed text-[var(--color-gray)]">
            Gib deine Adresse ein. In rund 30 Sekunden siehst du, wie gut deine Seite gebaut ist, für welche Suchbegriffe sie
            angezeigt wird und was die fünf wichtigsten Schritte sind.
          </p>

          <form onSubmit={start} className="mx-auto mt-8 max-w-[620px] text-left" noValidate>
            <label htmlFor="seo-url" className="block text-[13px] font-semibold text-[var(--color-black)] mb-2">
              Deine Website
            </label>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                id="seo-url"
                type="text"
                inputMode="url"
                autoComplete="url"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="meinefirma.de"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={running}
                className="min-w-0 flex-1 rounded-[12px] border border-[#d1d1d6] bg-white px-4 py-[14px] text-[17px] text-[var(--color-black)] outline-none focus:border-[var(--color-blue)] focus:ring-2 focus:ring-[var(--color-blue)]/30 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={running || !url.trim()}
                className="btn btn-primary justify-center disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none"
              >
                {running ? 'Check läuft …' : 'Check starten'}
              </button>
            </div>
            <p className="mt-3 text-[13px] text-[var(--color-gray)]">
              Kostenlos und ohne Anmeldung. Ein Check pro Person.
              {owner && <span className="ml-2 font-semibold text-[var(--color-ok)]">Inhaber-Modus: unbegrenzt</span>}
            </p>
          </form>

          <div aria-live="polite" className="mx-auto max-w-[620px] text-left">
            {running && <RunningCard url={phase.url} />}
            {phase.kind === 'loading-report' && (
              <p className="mt-8 text-center text-[15px] text-[var(--color-gray)]">Bericht wird geladen …</p>
            )}
            {phase.kind === 'error' && <ErrorCard phase={phase} onRetry={reset} />}
          </div>
        </div>
      </section>

      {phase.kind === 'done' && (
        <div ref={resultRef} className="scroll-mt-[var(--nav-height)]">
          <Report data={phase.data} onUpdate={(data) => setPhase({ kind: 'done', data })} onNew={reset} />
        </div>
      )}
    </>
  );
}

function RunningCard({ url }: { url: string }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);
  // Grobe Zuordnung der Schritte zur vergangenen Zeit. Der Server meldet
  // keinen Fortschritt, die Liste zeigt nur, was gerade passiert.
  const active = Math.min(STEPS.length - 1, Math.floor(elapsed / 6));
  return (
    <div className="mt-8 rounded-[18px] bg-white p-6 shadow-[var(--shadow-sm)]">
      <p className="text-[15px] font-semibold text-[var(--color-black)]">Wir prüfen {url}</p>
      <p className="text-[13px] text-[var(--color-gray)]">Das dauert meist 20 bis 45 Sekunden. Bitte lass die Seite offen.</p>
      <ol className="mt-4 space-y-2">
        {STEPS.map((s, i) => (
          <li key={s} className="flex items-center gap-3 text-[15px]">
            <span
              aria-hidden
              className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] ${
                i < active
                  ? 'bg-[var(--color-ok-bg)] text-[var(--color-ok)]'
                  : i === active
                    ? 'border-2 border-[var(--color-blue)] border-t-transparent animate-spin motion-reduce:animate-none'
                    : 'bg-[var(--color-offwhite)]'
              }`}
            >
              {i < active ? '✓' : ''}
            </span>
            <span className={i <= active ? 'text-[var(--color-black)]' : 'text-[var(--color-gray)]'}>{s}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function ErrorCard({ phase, onRetry }: { phase: Extract<Phase, { kind: 'error' }>; onRetry: () => void }) {
  const limit = phase.code === 'limit';
  return (
    <div className="mt-8 rounded-[18px] bg-white p-6 shadow-[var(--shadow-sm)]">
      <p className="text-[17px] font-semibold text-[var(--color-black)]">{phase.message}</p>
      {limit ? (
        <>
          <p className="mt-2 text-[15px] text-[var(--color-gray)]">
            Du willst eine weitere Website prüfen lassen oder dein Ergebnis besprechen? Melde dich, wir machen das gern persönlich.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            {phase.lastCheckId && (
              <a href={`/seo-check?id=${phase.lastCheckId}`} className="btn btn-outline">
                Meinen Bericht öffnen
              </a>
            )}
            <a href={site.meetingUrl} target="_blank" rel="noopener" className="btn btn-primary">
              Gespräch buchen
            </a>
          </div>
        </>
      ) : (
        <button type="button" onClick={onRetry} className="btn btn-outline mt-4">
          Andere Adresse eingeben
        </button>
      )}
    </div>
  );
}

function ScoreRing({ score }: { score: number }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const tone = scoreTone(score);
  return (
    <div className="relative h-[148px] w-[148px] shrink-0">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" aria-hidden>
        <circle cx="60" cy="60" r={r} fill="none" stroke="#e5e7eb" strokeWidth="10" />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke={tone.color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${(score / 100) * c} ${c}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[40px] font-extrabold leading-none text-[var(--color-black)]">{score}</span>
        <span className="mt-1 text-[13px] text-[var(--color-gray)]">von 100</span>
      </div>
    </div>
  );
}

function Report({
  data,
  onUpdate,
  onNew,
}: {
  data: SeoCheckResponse;
  onUpdate: (d: SeoCheckResponse) => void;
  onNew: () => void;
}) {
  const r = data.result;
  const tone = scoreTone(r.score);
  const checkedAt = new Date(r.checkedAt).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const [copied, setCopied] = useState(false);

  return (
    <section className="bg-white py-12 md:py-16">
      <div className="mx-auto max-w-[1000px] px-4 md:px-6 space-y-6">
        {/* Kopf mit Gesamtergebnis */}
        <div className="rounded-[24px] bg-[var(--color-offwhite)] p-6 md:p-8">
          <div className="flex flex-col items-center gap-6 md:flex-row md:items-center md:gap-10">
            <ScoreRing score={r.score} />
            <div className="w-full min-w-0 flex-1">
              <p className="text-[13px] text-[var(--color-gray)]">
                {r.domain} · geprüft am {checkedAt}
              </p>
              <h2 className="mt-1 text-[26px] md:text-[32px] font-bold tracking-tight" style={{ color: tone.color }}>
                {tone.label}
              </h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {CATEGORY_ORDER.map((k) => (
                  <CategoryBar key={k} label={CATEGORY_LABELS[k]} value={r.categories[k]} />
                ))}
              </div>
            </div>
          </div>
          {r.categories.sichtbarkeit === null && (
            <p className="mt-6 rounded-[12px] bg-[var(--color-blue-light)] px-4 py-3 text-[15px] text-[var(--color-black)]">
              Die Platzierungen bei Google konnten diesmal nicht abgerufen werden. Die Punktzahl zeigt deshalb nur Technik, Inhalte
              und lokale Signale. Eine gut gebaute Seite ist noch keine sichtbare Seite.
            </p>
          )}
          {data.owner && (
            <div className="mt-6 flex flex-wrap gap-3">
              <button type="button" onClick={onNew} className="btn btn-primary">
                Neuer Check
              </button>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href).then(() => {
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  });
                }}
              >
                {copied ? 'Link kopiert' : 'Link zum Bericht kopieren'}
              </button>
            </div>
          )}
        </div>

        {/* Kennzahlen */}
        {(r.rankings.available || r.pagespeed.available) && (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {r.rankings.available && (
              <>
                <Stat value={r.rankings.top10} label="Suchbegriffe auf Seite 1" />
                <Stat value={r.rankings.total} label="Suchbegriffe in den Top 100" />
                <Stat value={r.rankings.estTraffic} label="Geschätzte Besuche pro Monat über Google" />
              </>
            )}
            {r.pagespeed.available && typeof r.pagespeed.score === 'number' && (
              <Stat value={r.pagespeed.score} suffix="/100" label="Ladezeit-Wertung auf dem Handy" />
            )}
          </div>
        )}

        {/* Massnahmen */}
        <div className="rounded-[24px] border border-[#e5e7eb] p-4 sm:p-6 md:p-8">
          <h2 className="text-[22px] md:text-[26px] font-bold tracking-tight text-[var(--color-black)]">Deine 5 wichtigsten Maßnahmen</h2>
          <p className="mt-1 text-[15px] text-[var(--color-gray)]">Sortiert nach dem, was dir bei Google am meisten bringt.</p>
          <ol className="mt-6 space-y-4">
            {r.measures.map((m, i) => (
              <li key={m.title} className="flex gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-blue)] text-[15px] font-bold text-white">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-[17px] font-semibold text-[var(--color-black)]">{m.title}</p>
                  <p className="mt-1 text-[15px] leading-relaxed text-[var(--color-gray)]">{m.why}</p>
                  {data.unlocked && m.how && (
                    <p className="mt-2 rounded-[12px] bg-[var(--color-offwhite)] px-3 py-2 text-[15px] text-[var(--color-black)]">
                      <span className="font-semibold">So geht&apos;s: </span>
                      {m.how}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>
          {!data.unlocked && <UnlockForm id={data.id} onUnlocked={onUpdate} />}
        </div>

        {/* Suchbegriffe (nur freigeschaltet) */}
        {data.unlocked && r.rankings.available && (r.rankings.top.length > 0 || r.rankings.potentials.length > 0) && (
          <div className="grid gap-6 md:grid-cols-2">
            {r.rankings.top.length > 0 && (
              <KeywordTable title="Deine besten Suchbegriffe" hint="Hier wirst du bei Google schon angezeigt." rows={r.rankings.top} />
            )}
            {r.rankings.potentials.length > 0 && (
              <KeywordTable
                title="Größtes Potenzial"
                hint="Platz 4 bis 20, sortiert nach Suchanfragen. Hier steckt das größte Potenzial."
                rows={r.rankings.potentials}
              />
            )}
          </div>
        )}

        {/* Alle Pruefpunkte */}
        <div>
          <h2 className="text-[22px] md:text-[26px] font-bold tracking-tight text-[var(--color-black)]">Alle Prüfpunkte</h2>
          <div className="mt-4 space-y-3">
            {CATEGORY_ORDER.map((cat) => {
              const items = r.checks.filter((c) => c.category === cat);
              if (!items.length) return null;
              return <CheckGroup key={cat} cat={cat} items={items} unlocked={data.unlocked} score={r.categories[cat]} />;
            })}
          </div>
        </div>

        {/* Abschluss */}
        <div className="rounded-[24px] bg-[var(--color-black)] p-6 md:p-10 text-white">
          <h2 className="text-[24px] md:text-[30px] font-bold tracking-tight">Soll ich das für dich umsetzen?</h2>
          <p className="mt-3 max-w-[620px] text-[17px] leading-relaxed text-white/80">
            Mit „Sichtbar in 90 Tagen“ richten wir dein Google-Profil ein, optimieren deine Website auf die zehn wichtigsten
            Suchbegriffe und du siehst jeden Monat die Zahlen in deinem eigenen Kundenportal. Mit doppelter Garantie.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href={site.meetingUrl} target="_blank" rel="noopener" className="btn btn-primary">
              Kostenloses Gespräch buchen
            </a>
            <a href={`tel:${site.phoneE164}`} className="btn border border-white/40 text-white hover:bg-white/10">
              {site.phone} anrufen
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function CategoryBar({ label, value }: { label: string; value: number | null }) {
  const tone = value === null ? null : scoreTone(value);
  return (
    <div>
      <div className="flex justify-between text-[15px]">
        <span className="text-[var(--color-black)]">{label}</span>
        <span className="font-semibold text-[var(--color-black)]">{value === null ? 'nicht gemessen' : `${value}`}</span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[#e5e7eb]">
        {tone && <div className="h-full rounded-full" style={{ width: `${value}%`, background: tone.color }} />}
      </div>
    </div>
  );
}

function Stat({ value, label, suffix }: { value: number; label: string; suffix?: string }) {
  return (
    <div className="rounded-[18px] bg-[var(--color-offwhite)] p-4 md:p-5">
      <p className="text-[28px] md:text-[32px] font-extrabold leading-none text-[var(--color-black)]">
        {value.toLocaleString('de-DE')}
        {suffix && <span className="text-[15px] font-semibold text-[var(--color-gray)]">{suffix}</span>}
      </p>
      <p className="mt-2 text-[13px] leading-snug text-[var(--color-gray)]">{label}</p>
    </div>
  );
}

function KeywordTable({ title, hint, rows }: { title: string; hint: string; rows: SeoCheckResponse['result']['rankings']['top'] }) {
  return (
    <div className="rounded-[18px] border border-[#e5e7eb] p-5">
      <h3 className="text-[17px] font-semibold text-[var(--color-black)]">{title}</h3>
      <p className="text-[13px] text-[var(--color-gray)]">{hint}</p>
      <table className="mt-3 w-full text-[15px]">
        <thead>
          <tr className="text-left text-[13px] text-[var(--color-gray)]">
            <th className="py-1 font-medium">Suchbegriff</th>
            <th className="py-1 text-right font-medium">Platz</th>
            <th className="py-1 text-right font-medium">Suchen/Monat</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((k) => (
            <tr key={k.keyword} className="border-t border-[#f0f0f2]">
              <td className="py-2 pr-2 break-words text-[var(--color-black)]">{k.keyword}</td>
              <td className="py-2 text-right font-semibold text-[var(--color-black)]">{k.position}</td>
              <td className="py-2 text-right text-[var(--color-gray)]">{k.volume === null ? '–' : k.volume.toLocaleString('de-DE')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CheckGroup({ cat, items, unlocked, score }: { cat: CheckCategory; items: CheckItem[]; unlocked: boolean; score: number | null }) {
  const problems = items.filter((c) => c.status === 'fail' || c.status === 'warn').length;
  return (
    <details className="group rounded-[18px] border border-[#e5e7eb] bg-white" open={problems > 0 && cat !== 'technik'}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5">
        <span className="text-[17px] font-semibold text-[var(--color-black)]">{CATEGORY_LABELS[cat]}</span>
        <span className="flex items-center gap-3 text-[13px] text-[var(--color-gray)]">
          {problems > 0 ? `${problems} ${problems === 1 ? 'Punkt' : 'Punkte'} zu verbessern` : 'Alles in Ordnung'}
          {score !== null && <span className="font-semibold text-[var(--color-black)]">{score}/100</span>}
          <span aria-hidden className="text-[var(--color-blue)] transition-transform group-open:rotate-180">⌄</span>
        </span>
      </summary>
      <ul className="border-t border-[#f0f0f2]">
        {items.map((c) => (
          <li key={c.id} className="flex gap-3 border-b border-[#f0f0f2] px-5 py-4 last:border-b-0">
            <span className={`mt-0.5 h-fit shrink-0 rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${STATUS_STYLE[c.status].cls}`}>
              {STATUS_STYLE[c.status].label}
            </span>
            <div className="min-w-0">
              <p className="text-[15px] font-semibold text-[var(--color-black)]">{c.title}</p>
              <p className="mt-0.5 break-words text-[15px] leading-relaxed text-[var(--color-gray)]">{c.detail}</p>
              {unlocked && c.fix && (c.status === 'fail' || c.status === 'warn') && (
                <p className="mt-1 text-[14px] text-[var(--color-black)]">
                  <span className="font-semibold">Tipp: </span>
                  {c.fix}
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </details>
  );
}

function UnlockForm({ id, onUnlocked }: { id: string; onUnlocked: (d: SeoCheckResponse) => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [wantsCall, setWantsCall] = useState(false);
  const [website, setWebsite] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return setError('Bitte gib deinen Namen an.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError('Bitte gib eine gültige E-Mail-Adresse an.');
    if (wantsCall && !phone.trim()) return setError('Für den Rückruf brauchen wir deine Telefonnummer.');
    setSending(true);
    try {
      const res = await fetch(`/api/seo-check/${encodeURIComponent(id)}/unlock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, wantsCall, website }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? 'Das hat nicht geklappt.');
      onUnlocked(json as SeoCheckResponse);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSending(false);
    }
  }

  const input =
    'w-full rounded-[12px] border border-[#d1d1d6] bg-white px-4 py-3 text-[16px] text-[var(--color-black)] outline-none focus:border-[var(--color-blue)] focus:ring-2 focus:ring-[var(--color-blue)]/30';

  return (
    <form onSubmit={submit} noValidate className="mt-8 rounded-[18px] bg-[var(--color-blue-light)] p-4 md:p-6">
      <p className="text-[17px] font-semibold text-[var(--color-black)]">So setzt du die Maßnahmen um</p>
      <p className="mt-1 text-[15px] text-[var(--color-gray)]">
        Schalte deinen vollständigen Bericht frei: Anleitung zu jeder Maßnahme, Tipps zu allen Prüfpunkten und deine Suchbegriffe
        bei Google. Wir schicken dir den Link zusätzlich per Mail.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="ul-name" className="mb-1 block text-[13px] font-semibold text-[var(--color-black)]">
            Name
          </label>
          <input id="ul-name" className={input} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
        </div>
        <div>
          <label htmlFor="ul-email" className="mb-1 block text-[13px] font-semibold text-[var(--color-black)]">
            E-Mail
          </label>
          <input
            id="ul-email"
            type="email"
            className={input}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="ul-phone" className="mb-1 block text-[13px] font-semibold text-[var(--color-black)]">
            Telefon <span className="font-normal text-[var(--color-gray)]">(optional, für den Rückruf)</span>
          </label>
          <input id="ul-phone" type="tel" className={input} value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" />
        </div>
      </div>
      <label className="mt-4 flex cursor-pointer items-start gap-3 text-[15px] text-[var(--color-black)]">
        <input type="checkbox" checked={wantsCall} onChange={(e) => setWantsCall(e.target.checked)} className="mt-1 h-4 w-4 accent-[var(--color-blue)]" />
        Ruf mich an und geh das Ergebnis 15 Minuten mit mir durch (kostenlos).
      </label>
      <div className="hidden" aria-hidden="true">
        <label>
          Website (nicht ausfüllen)
          <input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
        </label>
      </div>
      {error && (
        <p role="alert" className="mt-3 rounded-[12px] bg-[var(--color-fail-bg)] px-3 py-2 text-[15px] text-[var(--color-fail)]">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={sending}
        className="btn btn-primary mt-4 w-full justify-center whitespace-normal! px-5! text-center disabled:opacity-50 sm:w-auto"
      >
        {sending ? 'Wird freigeschaltet …' : 'Vollständigen Bericht freischalten'}
      </button>
      <p className="mt-3 text-[12px] text-[var(--color-gray)]">
        Wir nutzen deine Angaben nur für den Bericht und um dich zu deinem Ergebnis zu kontaktieren. Mehr in der{' '}
        <a href="/datenschutz.html" className="underline">
          Datenschutzerklärung
        </a>
        .
      </p>
    </form>
  );
}
