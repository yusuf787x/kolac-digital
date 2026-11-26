import Link from 'next/link';
import { site } from '@/lib/site-config';
import { FUNNEL_REVIEWS, PRAXIS_DAILY, PRAXIS_MARKER, PRAXIS_MASSNAHMEN } from '@/lib/seo-check/proof-data';
import ProofChart from '../seo-check/ProofChart';
import Reveal from '@/components/marketing/Reveal';

/**
 * Abschnitte, die /seo und /seo/paderborn gemeinsam nutzen. Der Beleg
 * stammt aus lib/seo-check/proof-data.ts (anonyme Praxis-Referenz, echte
 * Search-Console-Werte) und wird dort gepflegt.
 */

const fmt = (n: number) => n.toLocaleString('de-DE');
const dm = (iso: string) => `${Number(iso.slice(8, 10))}.${Number(iso.slice(5, 7))}.`;

/** Erste gegen letzte Woche der Tageswerte. */
function weekCompare() {
  const first = PRAXIS_DAILY.slice(0, 7);
  const last = PRAXIS_DAILY.slice(-7);
  const sum = (rows: typeof PRAXIS_DAILY, k: 1 | 2) => rows.reduce((s, r) => s + r[k], 0);
  return {
    firstFrom: first[0][0],
    firstTo: first[first.length - 1][0],
    lastFrom: last[0][0],
    lastTo: last[last.length - 1][0],
    impFirst: sum(first, 2),
    impLast: sum(last, 2),
    clkFirst: sum(first, 1),
    clkLast: sum(last, 1),
  };
}

/**
 * Google-Bewertungen ohne die Bewertung der Praxis-Referenz (FUNNEL_REVIEWS),
 * sonst wäre der anonyme Beleg auf derselben Seite nicht mehr anonym.
 */
export function SeoReviews() {
  return (
    <section className="bg-gray-50 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <header className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <div className="max-w-xl">
            <p className="text-sm font-medium uppercase tracking-wider text-brand-blue">Bewertungen</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
              Was unsere Kunden sagen.
            </h2>
            <p className="mt-3 text-sm text-gray-600">
              <span className="text-yellow-500" aria-hidden>
                ★★★★★
              </span>{' '}
              <strong className="text-gray-900">{site.rating.value.toFixed(1)} von 5</strong> ·{' '}
              {site.rating.count} Bewertungen auf Google
            </p>
          </div>
          <a href={site.googleReviewsUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary">
            Alle Bewertungen ansehen
          </a>
        </header>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {FUNNEL_REVIEWS.map((r) => (
            <figure key={r.author} className="flex flex-col rounded-2xl border border-gray-100 bg-white p-6 shadow-xs">
              <span className="text-yellow-500" aria-hidden>
                ★★★★★
              </span>
              <blockquote className="mt-3 flex-1 text-sm leading-relaxed text-gray-700">„{r.text}“</blockquote>
              <figcaption className="mt-4 text-sm font-semibold text-gray-900">{r.author}, bei Google</figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Großer Verweis auf den kostenlosen SEO-Check, die Hauptaktion der Seiten. */
export function CheckBand({ title, text }: { title: string; text: string }) {
  return (
    <section className="bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="rounded-3xl bg-gray-50 px-6 py-10 sm:px-12 sm:py-14">
          <div className="grid items-center gap-8 lg:grid-cols-[1fr_auto]">
            <div className="max-w-2xl">
              <p className="text-sm font-medium uppercase tracking-wider text-brand-blue">
                Kostenlos und in 30 Sekunden
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
                {title}
              </h2>
              <p className="mt-4 text-base leading-relaxed text-gray-700">{text}</p>
            </div>
            <div className="flex flex-col items-start gap-3">
              <Link href="/seo-check" className="btn-primary px-6 py-3 text-base">
                SEO-Check starten
              </Link>
              <a
                href={site.meetingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-brand-blue underline underline-offset-2 hover:opacity-80"
              >
                Lieber gleich ein Erstgespräch buchen
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Echte Search-Console-Kurve der anonymen Praxis-Referenz. */
export function PraxisBeleg({ eyebrow, title }: { eyebrow: string; title: string }) {
  const w = weekCompare();
  const ratio = w.impLast / w.impFirst;
  const clickPlus = Math.round((w.clkLast / w.clkFirst - 1) * 100);
  return (
    <section className="bg-gray-50 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <header className="max-w-2xl">
          <p className="text-sm font-medium uppercase tracking-wider text-brand-blue">{eyebrow}</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">{title}</h2>
        </header>

        <Reveal delay={100}>
          <div className="mt-10 rounded-3xl border border-gray-100 bg-white p-5 shadow-xs sm:p-8">
            <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-end">
              <div>
                <p className="text-sm font-semibold text-gray-900">Eine Praxis aus OWL</p>
                <p className="mt-2 text-4xl font-extrabold tracking-tight text-brand-blue sm:text-5xl">
                  über {Math.floor(ratio)}-mal
                </p>
                <p className="mt-2 text-base font-semibold text-gray-900">
                  so oft bei Google angezeigt wie in der ersten Woche
                </p>
                <p className="mt-1 max-w-xl text-sm leading-relaxed text-gray-600">
                  Erste Woche ({dm(w.firstFrom)} bis {dm(w.firstTo)}): {fmt(w.impFirst)} Einblendungen.
                  Letzte Oktoberwoche ({dm(w.lastFrom)} bis {dm(w.lastTo)}): {fmt(w.impLast)}.
                  Einblendungen heißt: so oft hat Google die Praxis in den Suchergebnissen gezeigt.
                </p>
              </div>
              <div className="rounded-2xl bg-gray-50 px-5 py-4">
                <p className="text-sm text-gray-600">Klicks pro Woche</p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-gray-900">
                  {fmt(w.clkFirst)} <span className="text-gray-400">→</span> {fmt(w.clkLast)}
                </p>
                <p className="mt-1 text-sm font-semibold text-brand-blue">+{clickPlus} %</p>
              </div>
            </div>

            <div className="mt-8">
              <ProofChart data={PRAXIS_DAILY} marker={PRAXIS_MARKER} />
            </div>

            <div className="mt-8">
              <h3 className="text-base font-semibold text-gray-900">Was wir gemacht haben</h3>
              <ul className="mt-4 grid gap-x-8 gap-y-2 md:grid-cols-2">
                {PRAXIS_MASSNAHMEN.map((m) => (
                  <li key={m} className="flex items-start gap-2 text-sm text-gray-700">
                    <span aria-hidden className="mt-0.5 text-brand-blue">
                      ✓
                    </span>
                    {m}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
