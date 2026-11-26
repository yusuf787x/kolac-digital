'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { FunnelByline } from './FunnelSections';
import VslPlayer from './VslPlayer';
import { site } from '@/lib/site-config';
import {
  CATEGORY_LABELS,
  type CheckCategory,
  type CheckItem,
  type CheckStatus,
  type SeoCheckResponse,
} from '@/lib/seo-check/types';
import {
  BRANCHEN,
  VSL_VIDEOS,
  FUNNEL_MEETING_EMBED_URL,
  FUNNEL_MEETING_URL,
  WEBSITE_ALTER,
  type Branche,
  type FunnelVariant,
  type LeadSource,
  type WebsiteAlter,
} from '@/lib/seo-check/funnel';
import { emitLeadCaptured } from '@/lib/seo-check/lead-event';
import { emailProblem, phoneProblem } from '@/lib/seo-check/contact-check';
import { readMarketingConsent } from '@/lib/seo-check/meta';

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
  if (score >= 85) return { color: 'var(--color-ok)', label: 'Gut aufgestellt' };
  if (score >= 60) return { color: 'var(--color-warn)', label: 'Ausbaufähig' };
  return { color: 'var(--color-fail)', label: 'Viel Luft nach oben' };
}

function rankingErrorText(error?: string): string {
  if (!error) return 'Unbekannter Grund.';
  if (error === 'not-configured') return 'DATAFORSEO_LOGIN oder DATAFORSEO_PASSWORD fehlen in dieser Umgebung (Vercel: Production gesetzt und neu deployt?).';
  return error;
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

/** Herkunft aus der Adresszeile lesen (utm_*, fbclid). Kein Cookie. */
function readSource(landing: string): LeadSource {
  const q = new URLSearchParams(window.location.search);
  const src: LeadSource = { landing };
  for (const k of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'fbclid'] as const) {
    const v = q.get(k);
    if (v) src[k] = v.slice(0, 200);
  }
  return src;
}

export default function SeoCheckClient({
  initialId,
  variant,
  measureEnabled = false,
}: {
  initialId?: string;
  variant?: FunnelVariant;
  /** Conversions API aktiv (Pixel-ID und Schlüssel gesetzt). Einwilligung kommt aus dem Banner. */
  measureEnabled?: boolean;
}) {
  const basePath = variant ? `/seo-check/${variant.slug}` : '/seo-check';
  const sourceRef = useRef<LeadSource | null>(null);
  const [url, setUrl] = useState('');
  const [phase, setPhase] = useState<Phase>(initialId ? { kind: 'loading-report' } : { kind: 'idle' });
  const resultRef = useRef<HTMLDivElement>(null);
  // Testmodus: ?test=1 an der Adresse (Beispielbericht, keine Kosten, keine Mails, nichts an Meta)
  const testRef = useRef(false);

  // Herkunft einmal beim Laden merken, bevor die Adresszeile ersetzt wird.
  useEffect(() => {
    sourceRef.current = readSource(basePath);
    testRef.current = new URLSearchParams(window.location.search).get('test') === '1';
  }, [basePath]);

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
    if (!value) {
      document.getElementById('seo-url')?.focus();
      return;
    }
    setPhase({ kind: 'running', url: value });
    try {
      const res = await apiFetch('/api/seo-check', {
        method: 'POST',
        body: JSON.stringify({ url: value, source: sourceRef.current ?? readSource(basePath), ...(testRef.current ? { test: true } : {}) }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPhase({ kind: 'error', message: json.error ?? 'Der Check ist fehlgeschlagen.', code: json.code, lastCheckId: json.lastCheckId });
        return;
      }
      const data = json as SeoCheckResponse;
      window.history.replaceState(null, '', `${basePath}?id=${data.id}${data.test ? '&test=1' : ''}`);
      setPhase({ kind: 'done', data });
    } catch {
      setPhase({ kind: 'error', message: 'Keine Verbindung. Bitte prüf dein Internet und versuch es noch einmal.' });
    }
  }

  function reset() {
    window.history.replaceState(null, '', testRef.current ? `${basePath}?test=1` : basePath);
    setUrl('');
    setPhase({ kind: 'idle' });
  }

  const running = phase.kind === 'running';
  const owner = phase.kind === 'done' && phase.data.owner;

  return (
    <>
      <section
        className={`bg-[var(--color-offwhite)] pb-16 md:pb-20 ${variant ? 'pt-8 md:pt-14' : 'pt-[calc(var(--nav-height)+48px)]'}`}
      >
        <div
          className="mx-auto max-w-[800px] px-4 md:px-6 text-center"
        >
          <div>
          <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[var(--color-blue)]">
            {variant?.eyebrow ?? 'Kostenloser SEO-Check'}
          </p>
          <h1 className={`mt-3 font-extrabold leading-[1.1] tracking-tight text-[var(--color-black)] ${variant ? 'text-[32px] md:text-[44px]' : 'text-[32px] md:text-[48px]'}`}>
            {variant?.title ?? 'Wird deine Website bei Google gefunden?'}
          </h1>
          <p className={`mt-4 mx-auto max-w-[600px] text-[17px] leading-relaxed text-[var(--color-gray)]`}>
            {variant?.subline ??
              'Gib deine Adresse ein. In rund 30 Sekunden siehst du, wie gut deine Seite gebaut ist, für welche Suchbegriffe sie angezeigt wird und was die fünf wichtigsten Schritte sind.'}
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
                className="min-w-0 flex-1 scroll-mt-[calc(var(--nav-height)+96px)] rounded-[12px] border border-[#d1d1d6] bg-white px-4 py-[14px] text-[17px] text-[var(--color-black)] outline-none focus:border-[var(--color-blue)] focus:ring-2 focus:ring-[var(--color-blue)]/30 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={running}
                className="btn btn-primary justify-center disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none"
              >
                {running ? 'Check läuft …' : 'Check starten'}
              </button>
            </div>
            <p className="mt-3 text-[13px] text-[var(--color-gray)]">
              Kostenlos und ohne Anmeldung. Ein Check pro Person und Tag.
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
          {variant && <FunnelByline />}
          </div>
        </div>
      </section>

      {phase.kind === 'done' && (
        <div ref={resultRef} className="scroll-mt-[var(--nav-height)]">
          <Report data={phase.data} variant={variant} measureEnabled={measureEnabled} onUpdate={(data) => setPhase({ kind: 'done', data })} onNew={reset} />
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
            <a href={FUNNEL_MEETING_URL} target="_blank" rel="noopener" className="btn btn-primary">
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
  variant,
  measureEnabled,
  onUpdate,
  onNew,
}: {
  data: SeoCheckResponse;
  variant?: FunnelVariant;
  measureEnabled: boolean;
  onUpdate: (d: SeoCheckResponse) => void;
  onNew: () => void;
}) {
  const r = data.result;
  const tone = scoreTone(r.score);
  const checkedAt = new Date(r.checkedAt).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const [copied, setCopied] = useState(false);
  const [justUnlocked, setJustUnlocked] = useState(false);
  const bookingRef = useRef<HTMLDivElement>(null);

  // Nach dem Freischalten direkt zum Termin-Block springen.
  useEffect(() => {
    if (justUnlocked) bookingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [justUnlocked]);

  return (
    <section className="bg-white py-12 md:py-16">
      <div className="mx-auto max-w-[1000px] px-4 md:px-6 space-y-6">
        {data.test && (
          <p className="rounded-[12px] border border-[var(--color-warn)] bg-[var(--color-warn-bg)] px-4 py-3 text-[15px] text-[var(--color-black)]">
            <span className="font-semibold">Testmodus:</span> Beispielbericht von {r.domain}. Kostet nichts, verbraucht keinen Gratis-Check,
            schickt keine Mails und meldet nichts an Meta.
          </p>
        )}
        {data.unlocked && !data.owner && (
          <div ref={bookingRef} className="scroll-mt-[calc(var(--nav-height)+16px)]">
            <BookingBlock variant={variant} />
          </div>
        )}

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
              {data.owner && (
                <span className="mt-2 block text-[13px] font-semibold text-[var(--color-fail)]">
                  Nur für dich sichtbar: {rankingErrorText(r.rankings.error)}
                </span>
              )}
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
        {data.unlocked && (r.rankings.available || r.pagespeed.available) && (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {r.rankings.available && (
              <>
                <Stat value={r.rankings.top10} label={r.rankings.brand ? 'Suchbegriffe auf Seite 1 (ohne deinen Firmennamen)' : 'Suchbegriffe auf Seite 1'} />
                <Stat value={r.rankings.total} label="Suchbegriffe in den Top 100" />
                <Stat value={r.rankings.estTraffic} label="Geschätzte Besuche pro Monat über Google" />
              </>
            )}
            {r.pagespeed.available && typeof r.pagespeed.score === 'number' && (
              <Stat value={r.pagespeed.score} suffix="/100" label="Ladezeit-Wertung auf dem Handy" />
            )}
          </div>
        )}

        {/* Massnahmen (freigeschaltet) bzw. Vorschau mit Formular (gesperrt) */}
        {data.unlocked ? (
          <div className="rounded-[24px] border border-[#e5e7eb] p-4 sm:p-6 md:p-8">
            <h2 className="text-[22px] md:text-[26px] font-bold tracking-tight text-[var(--color-black)]">Deine 5 wichtigsten Maßnahmen</h2>
            <p className="mt-1 text-[15px] text-[var(--color-gray)]">Sortiert nach dem, was dir bei Google am meisten bringt.</p>
            <ol className="mt-6 space-y-4">
              {r.measures.map((m, i) => (
                <li key={m.title || i} className="flex gap-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-blue)] text-[15px] font-bold text-white">
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[17px] font-semibold text-[var(--color-black)]">{m.title}</p>
                    <p className="mt-1 text-[15px] leading-relaxed text-[var(--color-gray)]">{m.why}</p>
                    {m.how && (
                      <p className="mt-2 rounded-[12px] bg-[var(--color-offwhite)] px-3 py-2 text-[15px] text-[var(--color-black)]">
                        <span className="font-semibold">So geht&apos;s: </span>
                        {m.how}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        ) : (
          <div className="rounded-[24px] border border-[#e5e7eb] p-4 sm:p-6 md:p-8">
            <LockedTeaser result={r} />
            <UnlockForm
              id={data.id}
              test={!!data.test}
              measureCount={r.measures.length}
              defaultBranche={variant?.defaultBranche}
              landing={variant ? `/seo-check/${variant.slug}` : '/seo-check'}
              measureEnabled={measureEnabled}
              onUnlocked={(d) => {
                setJustUnlocked(true);
                onUpdate(d);
              }}
            />
          </div>
        )}

        {/* Leistung + Ort, live geprüft (nur freigeschaltet) */}
        {data.unlocked && (r.rankings.local?.length ?? 0) > 0 && <LocalKeywordTable rows={r.rankings.local!} brandRow={r.rankings.brand ?? null} />}

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

        {/* Alle Pruefpunkte (nur freigeschaltet) */}
        {data.unlocked && (
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
        )}

        {/* Abschluss */}
        <div className="rounded-[24px] bg-[var(--color-black)] p-6 md:p-10 text-white">
          <h2 className="text-[24px] md:text-[30px] font-bold tracking-tight">{variant?.closingTitle ?? 'Soll ich das für dich umsetzen?'}</h2>
          <p className="mt-3 max-w-[620px] text-[17px] leading-relaxed text-white/80">
            {variant?.closingText ??
              'Mit „Sichtbar in 90 Tagen“ richten wir dein Google-Profil ein, optimieren deine Website auf die zehn wichtigsten Suchbegriffe und du siehst jeden Monat die Zahlen in deinem eigenen Kundenportal. Mit doppelter Garantie.'}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href={FUNNEL_MEETING_URL} target="_blank" rel="noopener" className="btn btn-primary">
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

function LocalKeywordTable({
  rows,
  brandRow,
}: {
  rows: NonNullable<SeoCheckResponse['result']['rankings']['local']>;
  brandRow: SeoCheckResponse['result']['rankings']['top'][number] | null;
}) {
  const leaders = rows.find((k) => k.hasMapPack && !k.mapPosition && (k.volume ?? 0) > 0);
  return (
    <div className="rounded-[18px] border border-[#e5e7eb] p-5 md:p-6">
      <h3 className="text-[17px] font-semibold text-[var(--color-black)]">Deine wichtigsten Suchbegriffe mit Ort</h3>
      <p className="text-[13px] text-[var(--color-gray)]">Live bei Google geprüft. So suchen neue Kunden nach dir.</p>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[420px] text-[15px]">
          <thead>
            <tr className="text-left text-[13px] text-[var(--color-gray)]">
              <th className="py-1 font-medium">Suchbegriff</th>
              <th className="py-1 text-right font-medium">Suchen/Monat</th>
              <th className="py-1 text-right font-medium">Platz</th>
              <th className="py-1 text-right font-medium">In der Karte</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((k) => (
              <tr key={k.keyword} className="border-t border-[#f0f0f2]">
                <td className="py-2 pr-2 break-words text-[var(--color-black)]">{k.keyword}</td>
                <td className="py-2 text-right text-[var(--color-gray)]">{k.volume ? k.volume.toLocaleString('de-DE') : 'kaum'}</td>
                <td className="py-2 text-right font-semibold text-[var(--color-black)]">{k.position ?? 'nicht in Top 20'}</td>
                <td className="py-2 text-right text-[var(--color-black)]">{!k.hasMapPack ? 'keine Karte' : k.mapPosition ? `Platz ${k.mapPosition}` : 'nein'}</td>
              </tr>
            ))}
            {brandRow && (
              <tr className="border-t border-[#f0f0f2]">
                <td className="py-2 pr-2 break-words text-[var(--color-gray)]">{brandRow.keyword} (dein Name)</td>
                <td className="py-2 text-right text-[var(--color-gray)]">{brandRow.volume ? brandRow.volume.toLocaleString('de-DE') : ''}</td>
                <td className="py-2 text-right font-semibold text-[var(--color-black)]">{brandRow.position}</td>
                <td className="py-2 text-right text-[var(--color-gray)]" />
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {leaders && leaders.mapPack.length > 0 && (
        <p className="mt-3 text-[13px] text-[var(--color-gray)]">
          In der Karte bei „{leaders.keyword}“ stehen:{' '}
          {leaders.mapPack
            .map((e) => `${e.name}${e.reviews != null ? ` (${e.reviews.toLocaleString('de-DE')} Bewertungen)` : ''}`)
            .join(', ')}
          .
        </p>
      )}
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

type FieldKey = 'name' | 'email' | 'phone' | 'branche' | 'business';

function LockedTeaser({ result }: { result: SeoCheckResponse['result'] }) {
  const top = result.checks.find((c) => c.title);
  const others = result.checks.filter((c) => c !== top && (c.status === 'fail' || c.status === 'warn'));
  const urgent = others.filter((c) => c.status === 'fail').length;
  const measures = result.measures.length;
  // Auf dem Handy liegt das Formular weit unten: Klick auf „Gesperrt“ führt direkt hin.
  const jumpToForm = () => {
    document.getElementById('ul-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => document.getElementById('ul-name')?.focus({ preventScroll: true }), 500);
  };
  return (
    <div>
      <h2 className="text-[22px] md:text-[26px] font-bold tracking-tight text-[var(--color-black)]">Der wichtigste Befund</h2>
      {top ? (
        <div className="mt-4 flex gap-3 rounded-[18px] bg-[var(--color-offwhite)] p-4 md:p-5">
          <span className={`mt-0.5 h-fit shrink-0 rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${STATUS_STYLE[top.status].cls}`}>
            {STATUS_STYLE[top.status].label}
          </span>
          <div className="min-w-0">
            <p className="text-[17px] font-semibold text-[var(--color-black)]">{top.title}</p>
            <p className="mt-1 break-words text-[15px] leading-relaxed text-[var(--color-gray)]">{top.detail}</p>
          </div>
        </div>
      ) : (
        <p className="mt-3 text-[15px] text-[var(--color-gray)]">Wir haben keine großen Probleme gefunden. Die Details stehen im vollständigen Bericht.</p>
      )}

      {(others.length > 0 || measures > 0) && (
        <div className="mt-6">
          <p className="text-[17px] font-semibold text-[var(--color-black)]">
            {others.length > 0
              ? `${others.length} weitere ${others.length === 1 ? 'Befund' : 'Befunde'}${urgent > 0 ? `, davon ${urgent} dringend` : ''}`
              : 'Dein vollständiger Bericht'}
          </p>
          <p className="mt-1 text-[15px] text-[var(--color-gray)]">
            {measures > 0 ? `Dazu deine ${measures} wichtigsten Maßnahmen mit Anleitung und deine Suchbegriffe bei Google.` : 'Dazu deine Suchbegriffe bei Google.'}
          </p>
          <div className="relative mt-4 overflow-hidden rounded-[18px] border border-[#e5e7eb]">
            <ul className="select-none blur-[5px]" aria-hidden="true">
              {Array.from({ length: Math.min(Math.max(others.length, 3), 4) }).map((_, i) => (
                <li key={i} className="flex gap-3 border-b border-[#f0f0f2] px-5 py-4 last:border-b-0">
                  <span className={`h-5 w-16 shrink-0 rounded-full ${i < urgent ? 'bg-[var(--color-fail-bg)]' : 'bg-[var(--color-warn-bg)]'}`} />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 w-2/5 rounded bg-[#d9dbe0]" />
                    <div className="h-3 w-4/5 rounded bg-[#e8e9ed]" />
                  </div>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={jumpToForm}
              className="group absolute inset-0 flex cursor-pointer items-center justify-center bg-white/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-[var(--color-blue)]"
            >
              <span className="flex min-h-[44px] items-center gap-2 rounded-full bg-[var(--color-blue)] px-5 py-2 text-[15px] font-semibold text-white shadow-[var(--shadow-sm)] transition-transform group-hover:-translate-y-0.5">
                Gesperrt. Unten freischalten
                <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M8 3v10m0 0l-4-4m4 4l4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function BookingBlock({ variant }: { variant?: FunnelVariant }) {
  // Branchenseiten: Video mit Branchen-Einstieg; allgemeine Seite: dasselbe Video ohne Branchen-Einstieg
  const vsl = VSL_VIDEOS[variant?.slug ?? 'allgemein'];
  return (
    <div className="rounded-[24px] bg-[var(--color-blue-light)] p-6 md:p-8">
      <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[var(--color-blue)]">Dein Bericht ist freigeschaltet</p>
      {vsl ? (
        <>
          <h2 className="mt-2 text-[24px] md:text-[30px] font-bold tracking-tight text-[var(--color-black)]">
            Bevor du weiterliest: 2 Minuten von mir
          </h2>
          <p className="mt-2 max-w-[640px] text-[17px] leading-relaxed text-[var(--color-gray)]">
            Ich zeige dir, warum Google viele Websites nicht anzeigt und was ich bei dir machen würde.
          </p>
          <div className="mt-6">
            <VslPlayer src={vsl.src} poster={vsl.poster} />
          </div>
          <h3 className="mt-8 text-[20px] md:text-[24px] font-bold tracking-tight text-[var(--color-black)]">
            Sollen wir dein Ergebnis gemeinsam durchgehen?
          </h3>
        </>
      ) : (
        <h2 className="mt-2 text-[24px] md:text-[30px] font-bold tracking-tight text-[var(--color-black)]">
          Sollen wir dein Ergebnis gemeinsam durchgehen?
        </h2>
      )}
      <p className="mt-2 max-w-[640px] text-[17px] leading-relaxed text-[var(--color-gray)]">
        In einem kurzen Gespräch zeige ich dir, was dir bei Google am meisten bringt. Und wie das
        Gefunden-Garantie-Paket bei dir aussehen würde. Kostenlos und unverbindlich.
      </p>
      <p className="mt-2 text-[15px] text-[var(--color-black)]">
        Ich schaue mir dein Ergebnis vor dem Gespräch an. Wir prüfen gemeinsam, ob wir dir helfen können.
      </p>
      {/* Auf dem Handy fast randlos, sonst schneidet Googles Kalender die Uhrzeiten rechts ab */}
      <div className="mt-5 -mx-5 sm:mx-0">
        <BookingCalendar />
      </div>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
        <a href={`tel:${site.phoneE164}`} className="btn btn-outline justify-center">
          {site.phone} anrufen
        </a>
        <p className="text-[15px] text-[var(--color-gray)]">Kein passender Termin dabei? Kein Problem, ich rufe dich kurz an.</p>
      </div>
    </div>
  );
}

const CALENDAR_OK_KEY = 'kd-calendar-ok';

/**
 * Freie Termine direkt auf der Seite. Der Google-Kalender setzt Cookies, darum
 * lädt er erst nach einem Klick (danach in diesem Browser automatisch).
 */
function BookingCalendar() {
  // Nur im Browser gerendert (Bericht lädt immer erst nach dem Check), darum direkt lesbar.
  const [show, setShow] = useState(() => {
    try {
      return localStorage.getItem(CALENDAR_OK_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [loaded, setLoaded] = useState(false);

  function open() {
    setShow(true);
    try {
      localStorage.setItem(CALENDAR_OK_KEY, '1');
    } catch {
      /* egal */
    }
  }

  if (!show) {
    return (
      <div className="rounded-[18px] border border-[#e5e7eb] bg-white p-5 md:p-6">
        <p className="text-[17px] font-semibold text-[var(--color-black)]">Freie Termine ansehen</p>
        <p className="mt-1 text-[15px] text-[var(--color-gray)]">
          Such dir direkt hier einen Termin aus, ohne die Seite zu verlassen. Der Kalender kommt von Google.{' '}
          <a href="/datenschutz.html#termin" className="underline">
            Datenschutz
          </a>
        </p>
        <button type="button" onClick={open} className="btn btn-primary mt-4 w-full justify-center sm:w-auto">
          Freie Termine anzeigen
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="relative overflow-hidden rounded-[18px] border border-[#e5e7eb] bg-white">
        {!loaded && (
          <p className="absolute inset-x-0 top-10 text-center text-[15px] text-[var(--color-gray)]" aria-live="polite">
            Freie Termine werden geladen …
          </p>
        )}
        <iframe
          src={FUNNEL_MEETING_EMBED_URL}
          title="Freie Termine für ein kostenloses Gespräch"
          onLoad={() => setLoaded(true)}
          className="relative block h-[1420px] w-full border-0 md:h-[1000px]"
        />
      </div>
      <p className="mt-2 text-[13px] text-[var(--color-gray)]">
        Kalender lädt nicht?{' '}
        <a href={FUNNEL_MEETING_URL} target="_blank" rel="noopener" className="underline">
          In neuem Fenster öffnen
        </a>
      </p>
    </div>
  );
}

function Choice<T extends string>({
  name,
  options,
  value,
  onChange,
  invalid,
}: {
  name: string;
  options: { value: T; label: string }[];
  value: T | '';
  onChange: (v: T) => void;
  invalid?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const active = value === o.value;
        return (
          <label
            key={o.value}
            className={`cursor-pointer rounded-full border px-4 py-2 text-[15px] transition-colors focus-within:ring-2 focus-within:ring-[var(--color-blue)]/30 ${
              active
                ? 'border-[var(--color-blue)] bg-[var(--color-blue)] text-white'
                : `bg-white text-[var(--color-black)] ${invalid ? 'border-[var(--color-fail)]' : 'border-[#d1d1d6] hover:border-[var(--color-blue)]'}`
            }`}
          >
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={active}
              onChange={() => onChange(o.value)}
              className="sr-only"
            />
            {o.label}
          </label>
        );
      })}
    </div>
  );
}

function UnlockForm({
  id,
  test,
  measureCount,
  defaultBranche,
  landing,
  measureEnabled,
  onUnlocked,
}: {
  id: string;
  test: boolean;
  measureCount: number;
  defaultBranche?: Branche;
  landing: string;
  measureEnabled: boolean;
  onUnlocked: (d: SeoCheckResponse) => void;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [branche, setBranche] = useState<Branche | ''>(defaultBranche ?? '');
  const [websiteAlter, setWebsiteAlter] = useState<WebsiteAlter | ''>('');
  const [business, setBusiness] = useState(false);
  const [website, setWebsite] = useState('');
  const [sending, setSending] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const setFieldError = (field: FieldKey, message: string | null) =>
    setErrors((e) => {
      const next = { ...e };
      if (message) next[field] = message;
      else delete next[field];
      return next;
    });

  function checkAll(): Partial<Record<FieldKey, string>> {
    const found: Partial<Record<FieldKey, string>> = {};
    if (!name.trim()) found.name = 'Bitte gib deinen Namen an.';
    const mail = emailProblem(email);
    if (mail) found.email = mail;
    const tel = phoneProblem(phone);
    if (tel) found.phone = tel;
    if (!branche) found.branche = 'Bitte wähl deine Branche aus.';
    if (!business) found.business = 'Bitte bestätige das Häkchen, damit wir deinen Bericht freischalten können.';
    return found;
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    const found = checkAll();
    setErrors(found);
    const first = (['name', 'email', 'phone', 'branche', 'business'] as FieldKey[]).find((f) => found[f]);
    if (first) {
      document.getElementById(`ul-${first}`)?.focus();
      return;
    }
    setSending(true);
    try {
      const res = await fetch(`/api/seo-check/${encodeURIComponent(id)}/unlock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          phone,
          branche,
          websiteAlter: websiteAlter || undefined,
          business,
          // Das Häkchen schließt den Rückruf zum Ergebnis ein.
          wantsCall: true,
          // Erfolgsmessung an Meta nur mit „Akzeptieren“ im Banner (freiwillig, getrennt vom Formular).
          measureConsent: measureEnabled && !test && readMarketingConsent() === 'granted' ? true : undefined,
          website,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const message = json.error ?? 'Das Freischalten hat nicht geklappt. Bitte prüf deine Verbindung und versuch es noch einmal.';
        const field = json.field as FieldKey | undefined;
        if (field) {
          setFieldError(field, message);
          document.getElementById(`ul-${field}`)?.focus();
        } else setFormError(message);
        return;
      }
      if (!test) emitLeadCaptured({ checkId: id, branche: branche || undefined, landing });
      onUnlocked(json as SeoCheckResponse);
    } catch {
      setFormError('Keine Verbindung. Bitte prüf dein Internet und versuch es noch einmal. Deine Angaben bleiben stehen.');
    } finally {
      setSending(false);
    }
  }

  const input = (field: FieldKey) =>
    `w-full rounded-[12px] border bg-white px-4 py-3 text-[16px] text-[var(--color-black)] outline-none focus:border-[var(--color-blue)] focus:ring-2 focus:ring-[var(--color-blue)]/30 ${
      errors[field] ? 'border-[var(--color-fail)]' : 'border-[#d1d1d6]'
    }`;
  const label = 'mb-1 block text-[13px] font-semibold text-[var(--color-black)]';
  const star = (
    <span aria-hidden="true" className="text-[var(--color-fail)]">
      {' '}
      *
    </span>
  );
  const fieldError = (field: FieldKey) =>
    errors[field] ? (
      <p id={`ul-${field}-error`} className="mt-1 text-[13px] text-[var(--color-fail)]">
        {errors[field]}
      </p>
    ) : null;
  const a11y = (field: FieldKey) => ({
    'aria-required': true,
    'aria-invalid': !!errors[field],
    'aria-describedby': errors[field] ? `ul-${field}-error` : undefined,
  });

  return (
    <form
      id="ul-form"
      onSubmit={submit}
      noValidate
      className="mt-8 scroll-mt-[calc(var(--nav-height)+16px)] rounded-[18px] bg-[var(--color-blue-light)] p-4 md:p-6"
    >
      <p className="text-[17px] font-semibold text-[var(--color-black)]">
        {measureCount > 0 ? `Alle Befunde und deine ${measureCount} Maßnahmen freischalten` : 'Deinen vollständigen Bericht freischalten'}
      </p>
      <p className="mt-1 text-[15px] text-[var(--color-gray)]">
        Du bekommst den vollständigen Bericht: was wir bei jedem Prüfpunkt gefunden haben, deine Maßnahmen mit Anleitung und deine
        Suchbegriffe bei Google. Den Link schicken wir dir zusätzlich per Mail.
      </p>

      <fieldset className="mt-5">
        <legend className="text-[15px] font-semibold text-[var(--color-black)]">So erreichen wir dich</legend>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="ul-name" className={label}>
              Name{star}
            </label>
            <input
              id="ul-name"
              className={input('name')}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setFieldError('name', null);
              }}
              autoComplete="name"
              {...a11y('name')}
            />
            {fieldError('name')}
          </div>
          <div>
            <label htmlFor="ul-email" className={label}>
              E-Mail{star}
            </label>
            <input
              id="ul-email"
              type="email"
              inputMode="email"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="name@firma.de"
              className={input('email')}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email && !emailProblem(e.target.value)) setFieldError('email', null);
              }}
              onBlur={() => email.trim() && setFieldError('email', emailProblem(email))}
              autoComplete="email"
              {...a11y('email')}
            />
            {fieldError('email')}
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="ul-phone" className={label}>
              Telefon{star}
            </label>
            <input
              id="ul-phone"
              type="tel"
              inputMode="tel"
              placeholder="0171 2345678"
              className={input('phone')}
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                if (errors.phone && !phoneProblem(e.target.value)) setFieldError('phone', null);
              }}
              onBlur={() => phone.trim() && setFieldError('phone', phoneProblem(phone))}
              autoComplete="tel"
              {...a11y('phone')}
            />
            {fieldError('phone')}
          </div>
        </div>
      </fieldset>

      <fieldset className="mt-5">
        <legend className="text-[15px] font-semibold text-[var(--color-black)]">Zu deinem Betrieb</legend>
        <div className="mt-3 space-y-4">
          <div id="ul-branche" tabIndex={-1} className="outline-none">
            <p className={label}>Branche{star}</p>
            <Choice
              name="branche"
              options={BRANCHEN}
              value={branche}
              onChange={(v) => {
                setBranche(v);
                setFieldError('branche', null);
              }}
              invalid={!!errors.branche}
            />
            {fieldError('branche')}
          </div>
          <div>
            <p className={label}>
              Seit wann gibt es eure Website? <span className="font-normal text-[var(--color-gray)]">(optional)</span>
            </p>
            <Choice name="websiteAlter" options={WEBSITE_ALTER} value={websiteAlter} onChange={setWebsiteAlter} />
          </div>
        </div>
      </fieldset>

      <label className="mt-5 flex cursor-pointer items-start gap-3 text-[15px] text-[var(--color-black)]">
        <input
          id="ul-business"
          type="checkbox"
          checked={business}
          onChange={(e) => {
            setBusiness(e.target.checked);
            setFieldError('business', null);
          }}
          className="mt-1 h-5 w-5 shrink-0 accent-[var(--color-blue)]"
          {...a11y('business')}
        />
        <span>
          Ich frage für ein Unternehmen an und bin einverstanden, dass ihr mich anruft, um mein Ergebnis mit mir durchzugehen. Die{' '}
          <a href="/datenschutz.html#seo-check" className="underline">
            Datenschutzerklärung
          </a>{' '}
          habe ich gelesen.{star}
        </span>
      </label>
      {fieldError('business')}
      <div className="hidden" aria-hidden="true">
        <label>
          Website (nicht ausfüllen)
          <input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
        </label>
      </div>
      {formError && (
        <p role="alert" className="mt-3 rounded-[12px] bg-[var(--color-fail-bg)] px-3 py-2 text-[15px] text-[var(--color-fail)]">
          {formError}
        </p>
      )}
      <button
        type="submit"
        disabled={sending}
        className="btn btn-primary mt-5 w-full justify-center whitespace-normal! px-5! text-center disabled:opacity-50 sm:w-auto"
      >
        {sending ? 'Wird freigeschaltet …' : 'Vollständigen Bericht freischalten'}
      </button>
      <p className="mt-3 text-[12px] text-[var(--color-gray)]">
        <span className="text-[var(--color-fail)]">*</span> Pflichtfeld. Wir nutzen deine Angaben nur für den Bericht und um dich zu
        deinem Ergebnis zu kontaktieren.
      </p>
    </form>
  );
}
