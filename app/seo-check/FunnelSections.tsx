import Image from 'next/image';
import type { FunnelVariant } from '@/lib/seo-check/funnel';
import { VSL_VIDEO_URL } from '@/lib/seo-check/funnel';
import { BELEG_SCREENSHOTS, FUNNEL_REVIEWS, PRAXIS_MASSNAHMEN, PRAXIS_WEEKS } from '@/lib/seo-check/proof-data';
import { site } from '@/lib/site-config';

/**
 * Bausteine der Branchen-Landingpages (/seo-check/werkstatt, /seo-check/makler).
 * Aufbau angelehnt an Hormozis Workshop-Seite, aber kurz: Symptome, drei
 * Gründe, Belege, Ablauf, Über mich, zweiter Einstieg. Nur echte Zahlen,
 * keine Kundennamen, kein Preis.
 */

const H2 = 'text-[28px] md:text-[36px] font-bold leading-[1.15] tracking-tight text-[var(--color-black)]';

/** Kleine Zeile mit Porträt im Hero. */
export function FunnelByline() {
  return (
    <div className="mt-6 flex items-center gap-3">
      <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-[var(--color-offwhite)] ring-2 ring-white shadow-[var(--shadow-sm)]">
        <Image src="/images/yk-portrait.webp" alt="" fill sizes="40px" className="object-cover" />
      </span>
      <div className="text-[13px] leading-snug text-[var(--color-gray)]">
        <p>
          Von <span className="font-semibold text-[var(--color-black)]">Yusuf Kolac</span>, Webdesigner aus Bielefeld
        </p>
        <a href={site.googleReviewsUrl} target="_blank" rel="noopener noreferrer" className="mt-0.5 inline-flex items-center gap-1 hover:text-[var(--color-black)]">
          <Stars />
          <span>
            <span className="font-semibold text-[var(--color-black)]">{site.rating.value.toFixed(1).replace('.', ',')}</span> bei Google,{' '}
            {site.rating.count} Bewertungen
          </span>
        </a>
      </div>
    </div>
  );
}

/**
 * Rechte Seite im Hero: das Verkaufsvideo, sobald es eine Datei gibt, sonst
 * eine gebaute Beispiel-Ergebniskarte (klar als Beispiel gekennzeichnet).
 */
export function FunnelHeroVisual() {
  if (VSL_VIDEO_URL) {
    return (
      <div className="overflow-hidden rounded-[24px] bg-black shadow-[var(--shadow-md)]">
        <video src={VSL_VIDEO_URL} controls playsInline preload="metadata" className="aspect-video w-full" />
      </div>
    );
  }
  return <ExampleResultCard />;
}

function ExampleResultCard() {
  const score = 38;
  const r = 36;
  const c = 2 * Math.PI * r;
  const bars: Array<[string, number, string]> = [
    ['Sichtbarkeit bei Google', 14, 'var(--color-fail)'],
    ['Technik', 71, 'var(--color-warn)'],
    ['Inhalte', 46, 'var(--color-fail)'],
    ['Lokale Auffindbarkeit', 52, 'var(--color-warn)'],
  ];
  return (
    <figure aria-label="Beispiel für ein Ergebnis des Website-Checks" className="relative rounded-[24px] bg-white p-6 shadow-[var(--shadow-md)] md:p-7">
      <span className="absolute right-5 top-5 rounded-full bg-[var(--color-offwhite)] px-3 py-1 text-[12px] font-semibold text-[var(--color-gray)]">
        Beispiel
      </span>
      <div className="flex items-center gap-5">
        <svg width="88" height="88" viewBox="0 0 88 88" aria-hidden className="shrink-0">
          <circle cx="44" cy="44" r={r} fill="none" stroke="#e5e7eb" strokeWidth="8" />
          <circle
            cx="44"
            cy="44"
            r={r}
            fill="none"
            stroke="var(--color-fail)"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${(score / 100) * c} ${c}`}
            transform="rotate(-90 44 44)"
          />
          <text x="44" y="50" textAnchor="middle" className="fill-[var(--color-black)]" fontSize="22" fontWeight="800">
            {score}
          </text>
        </svg>
        <div>
          <p className="text-[13px] text-[var(--color-gray)]">beispiel-betrieb.de</p>
          <p className="text-[20px] font-bold text-[var(--color-fail)]">Viel Luft nach oben</p>
        </div>
      </div>
      <div className="mt-5 space-y-3">
        {bars.map(([label, value, color]) => (
          <div key={label}>
            <div className="flex justify-between text-[13px]">
              <span className="text-[var(--color-black)]">{label}</span>
              <span className="font-semibold text-[var(--color-black)]">{value}</span>
            </div>
            <div className="mt-1 h-1.5 rounded-full bg-[#eef0f3]">
              <div className="h-1.5 rounded-full" style={{ width: `${value}%`, background: color }} />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-5 rounded-[12px] bg-[#fdeceb] p-3 text-[13px] leading-snug text-[var(--color-black)]">
        <span className="font-semibold text-[var(--color-fail)]">Wichtigster Befund: </span>
        Nur 2 Suchbegriffe stehen auf Seite 1.
      </div>
    </figure>
  );
}

const REASONS: Array<[string, string, string]> = [
  ['01', 'Eine Seite für alles', 'Alle Leistungen stehen auf einer Seite. Google weiß dann gar nicht, wofür du eigentlich gefunden werden willst.'],
  ['02', 'Google-Profil halb ausgefüllt', 'Wer bei Google Maps oben steht, bekommt die Anrufe. Fehlen Kategorien, Fotos und Bewertungen, stehen andere vor dir.'],
  ['03', 'Seit Jahren nichts Neues', 'Kommt nie etwas dazu, wirkt deine Seite für Google wie ein Laden, der zu hat.'],
];

function Stars() {
  return (
    <span aria-hidden className="text-[13px] tracking-[1px] text-[#f5a623]">
      ★★★★★
    </span>
  );
}

const fmt = (n: number) => n.toLocaleString('de-DE');

/** Säulen der Einblendungen pro Woche, ohne Bibliothek, serverseitig gezeichnet. */
function WeeksChart() {
  const max = Math.max(...PRAXIS_WEEKS.map((w) => w.impressions));
  return (
    <figure aria-label="Einblendungen bei Google pro Woche, Praxis aus OWL">
      <div className="flex h-[200px] items-end gap-3 border-b border-[#e5e7eb] md:gap-5">
        {PRAXIS_WEEKS.map((w, i) => (
          <div key={w.label} className="flex h-full flex-1 flex-col items-center justify-end">
            <span className="mb-1 text-[12px] font-semibold tabular-nums text-[var(--color-black)]">{fmt(w.impressions)}</span>
            <div
              className="w-full max-w-[44px] rounded-t-[6px]"
              style={{ height: `${(w.impressions / max) * 100}%`, background: i === 0 ? '#c9d6ea' : 'var(--color-blue)' }}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-3 md:gap-5">
        {PRAXIS_WEEKS.map((w) => (
          <span key={w.label} className="flex-1 text-center text-[11px] tabular-nums text-[var(--color-gray)]">
            {w.label}
          </span>
        ))}
      </div>
      <figcaption className="mt-3 text-[12px] leading-snug text-[var(--color-gray)]">
        Einblendungen pro Woche. Echte Werte aus der Google Search Console, Name des Betriebs auf Wunsch weggelassen. Am 2. Oktober gingen 21 neue
        Ratgeber-Beiträge online.
      </figcaption>
      <details className="mt-2 text-[12px] text-[var(--color-gray)]">
        <summary className="cursor-pointer">Zahlen als Tabelle</summary>
        <table className="mt-2 w-full text-left tabular-nums">
          <thead>
            <tr>
              <th className="py-1 font-semibold">Woche</th>
              <th className="py-1 font-semibold">Einblendungen</th>
              <th className="py-1 font-semibold">Klicks</th>
            </tr>
          </thead>
          <tbody>
            {PRAXIS_WEEKS.map((w) => (
              <tr key={w.label}>
                <td className="py-0.5">{w.label}</td>
                <td className="py-0.5">{fmt(w.impressions)}</td>
                <td className="py-0.5">{fmt(w.clicks)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}

const STEPS: Array<[string, string]> = [
  ['Adresse eingeben', 'Nur deine Website, keine Anmeldung.'],
  ['Ergebnis in 30 Sekunden', 'Du siehst deine Note und das wichtigste Problem sofort.'],
  ['Vollen Bericht freischalten', 'Mit allen Befunden und Lösungen. Auf Wunsch gehen wir ihn gemeinsam durch.'],
];

export default function FunnelSections({ variant }: { variant: FunnelVariant }) {
  return (
    <>
      {/* Kommt dir das bekannt vor? */}
      <section className="bg-white py-16 md:py-24">
        <div className="mx-auto grid max-w-[1100px] gap-10 px-4 md:grid-cols-[0.9fr_1.1fr] md:items-center md:gap-16 md:px-6">
          <h2 className={H2}>Kommt dir das bekannt vor?</h2>
          <div>
            <ul className="space-y-3">
              {variant.symptoms.map((s) => (
                <li key={s} className="flex gap-3 rounded-[12px] bg-[var(--color-offwhite)] px-4 py-3 text-[16px] leading-snug text-[var(--color-black)]">
                  <span aria-hidden className="mt-[2px] font-bold text-[var(--color-blue)]">✓</span>
                  {s}
                </li>
              ))}
            </ul>
            <p className="mt-6 text-[17px] font-semibold leading-snug text-[var(--color-black)]">
              Das sind keine einzelnen Probleme. Google zeigt deine Website einfach nicht.
            </p>
          </div>
        </div>
      </section>

      {/* Drei Gründe */}
      <section className="bg-[var(--color-offwhite)] py-16 md:py-24">
        <div className="mx-auto max-w-[1100px] px-4 md:px-6">
          <h2 className={H2}>Warum Websites keine Anfragen bringen</h2>
          <p className="mt-3 max-w-[620px] text-[17px] text-[var(--color-gray)]">
            Technisch sind die meisten Seiten in Ordnung. Woran es meistens liegt:
          </p>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {REASONS.map(([n, title, text]) => (
              <div key={n} className="rounded-[18px] bg-white p-6 shadow-[var(--shadow-sm)]">
                <p className="text-[20px] font-extrabold text-[var(--color-blue)]">{n}</p>
                <h3 className="mt-2 text-[17px] font-semibold text-[var(--color-black)]">{title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-[var(--color-gray)]">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Belege */}
      <section className="bg-white py-16 md:py-24">
        <div className="mx-auto max-w-[1100px] px-4 md:px-6">
          <h2 className={H2}>Dass es anders geht</h2>

          <div className="mt-10 grid gap-8 rounded-[24px] bg-[var(--color-offwhite)] p-6 md:grid-cols-[1.15fr_0.85fr] md:gap-12 md:p-10">
            <div>
              <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[var(--color-blue)]">Eine Praxis aus OWL</p>
              <p className="mt-2 text-[44px] font-extrabold leading-none tracking-tight text-[var(--color-blue)] md:text-[56px]">3-mal</p>
              <p className="mt-2 text-[17px] font-semibold text-[var(--color-black)]">so oft bei Google angezeigt, in 28 Tagen</p>
              <p className="mt-1 text-[15px] text-[var(--color-gray)]">Von {fmt(19414)} auf {fmt(59666)} Einblendungen.</p>
              <div className="mt-8 rounded-[18px] bg-white p-5 shadow-[var(--shadow-sm)]">
                <WeeksChart />
              </div>
            </div>
            <div>
              <h3 className="text-[17px] font-semibold text-[var(--color-black)]">Was wir gemacht haben</h3>
              <ul className="mt-4 space-y-3">
                {PRAXIS_MASSNAHMEN.map((m) => (
                  <li key={m} className="flex gap-3 text-[15px] leading-snug text-[var(--color-black)]">
                    <span aria-hidden className="mt-[1px] font-bold text-[var(--color-blue)]">✓</span>
                    {m}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {variant.slug === 'werkstatt' && (
            <div className="mt-6 rounded-[24px] bg-[var(--color-offwhite)] p-6 md:p-10">
              <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[var(--color-blue)]">Kfz-Meisterbetrieb aus Lage</p>
              <h3 className="mt-2 text-[22px] font-bold leading-snug text-[var(--color-black)] md:text-[26px]">
                Motorenfachmann: Onpage-Score von 60 auf 95 Prozent
              </h3>
              <p className="mt-2 max-w-[640px] text-[15px] leading-relaxed text-[var(--color-gray)]">
                Bestehende Website übernommen und aufgeräumt: eine Adresse statt mehrerer, eigener Titel und eigene Beschreibung für alle 34 Seiten,
                klare Überschriften, veraltete Angaben korrigiert.
              </p>
              <div className="mt-6 grid gap-4">
                {[
                  ['Vorher: 60 Prozent', '/images/portfolio/motorenfachmann-seobility-vorher.webp', 'Seobility-Check der Startseite von motorenfachmann.de vor der Optimierung: Onpage-Score 60 Prozent, 4 kritische Probleme'],
                  ['Nachher: 95 Prozent', '/images/portfolio/motorenfachmann-seobility-nachher.webp', 'Seobility-Check der Startseite von motorenfachmann.de nach der Optimierung: Onpage-Score 95 Prozent, keine Probleme'],
                ].map(([label, src, alt]) => (
                  <figure key={src} className="overflow-hidden rounded-[18px] bg-white shadow-[var(--shadow-sm)]">
                    <figcaption className="px-4 pt-3 text-[14px] font-semibold text-[var(--color-black)]">{label}</figcaption>
                    <Image src={src} alt={alt} width={1216} height={320} sizes="(min-width: 1100px) 1000px, 100vw" className="h-auto w-full" />
                  </figure>
                ))}
              </div>
            </div>
          )}

          {BELEG_SCREENSHOTS.length > 0 && (
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {BELEG_SCREENSHOTS.map((b) => (
                <figure key={b.src} className="overflow-hidden rounded-[18px] bg-white shadow-[var(--shadow-sm)]">
                  <Image src={b.src} alt={b.alt} width={b.width} height={b.height} sizes="(min-width: 640px) 520px, 100vw" className="h-auto w-full" />
                  <figcaption className="px-4 py-3 text-[13px] text-[var(--color-gray)]">{b.caption}</figcaption>
                </figure>
              ))}
            </div>
          )}

          <div className="mt-6 rounded-[18px] border border-[#e5e7eb] p-5 md:flex md:items-center md:justify-between md:gap-6">
            <p className="text-[15px] text-[var(--color-black)]">
              <span className="font-semibold">Meine eigene Website:</span> rund 5-mal so viele Besucher über Google wie im Sommer, nach denselben Regeln umgebaut.
            </p>
          </div>

          {/* Google-Bewertungen */}
          <div className="mt-12">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h3 className="text-[20px] font-bold text-[var(--color-black)]">Was Kunden sagen</h3>
              <a href={site.googleReviewsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[14px] text-[var(--color-gray)] hover:text-[var(--color-black)]">
                <Stars />
                <span>
                  <span className="font-semibold text-[var(--color-black)]">{site.rating.value.toFixed(1).replace('.', ',')}</span> bei Google, {site.rating.count} Bewertungen
                </span>
              </a>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              {FUNNEL_REVIEWS.map((r) => (
                <figure key={r.author} className="flex flex-col rounded-[18px] bg-[var(--color-offwhite)] p-5">
                  <Stars />
                  <blockquote className="mt-2 flex-1 text-[15px] leading-relaxed text-[var(--color-black)]">„{r.text}“</blockquote>
                  <figcaption className="mt-3 text-[13px] text-[var(--color-gray)]">{r.author}, Google-Bewertung</figcaption>
                </figure>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Ablauf */}
      <section className="bg-[var(--color-offwhite)] py-16 md:py-24">
        <div className="mx-auto max-w-[1100px] px-4 md:px-6">
          <h2 className={H2}>So läuft der Check</h2>
          <ol className="mt-10 grid gap-4 md:grid-cols-3">
            {STEPS.map(([title, text], i) => (
              <li key={title} className="rounded-[18px] bg-white p-6 shadow-[var(--shadow-sm)]">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-blue-light)] text-[15px] font-bold text-[var(--color-blue)]">
                  {i + 1}
                </span>
                <h3 className="mt-4 text-[17px] font-semibold text-[var(--color-black)]">{title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-[var(--color-gray)]">{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Über mich */}
      <section className="bg-white py-16 md:py-24">
        <div className="mx-auto grid max-w-[900px] items-center gap-8 px-4 md:grid-cols-[auto_1fr] md:gap-12 md:px-6">
          <div className="relative mx-auto h-40 w-40 overflow-hidden rounded-full bg-[var(--color-offwhite)] shadow-[var(--shadow-md)] md:h-52 md:w-52">
            <Image
              src="/images/yk-portrait.webp"
              alt="Yusuf Kolac, Webdesigner aus Bielefeld"
              fill
              sizes="(min-width: 768px) 208px, 160px"
              className="object-cover"
            />
          </div>
          <div>
            <h2 className={H2}>Moin, ich bin Yusuf.</h2>
            <div className="mt-4 space-y-3 text-[17px] leading-relaxed text-[var(--color-gray)]">
              <p>Ich baue Websites für Betriebe aus OWL und kümmere mich darum, dass Google sie auch zeigt. Das mache ich selbst.</p>
              <p>{variant.aboutLine}</p>
              <p>
                Bevor wir sprechen, schaue ich mir dein Ergebnis genau an. Wenn ich dir nicht helfen kann, sag ich dir das ehrlich. Darum nehme ich
                pro Monat auch nur drei neue Betriebe an.
              </p>
            </div>
            <p className="mt-5 text-[17px] font-semibold text-[var(--color-black)]">Yusuf Kolac</p>
          </div>
        </div>
      </section>

      {/* Zweiter Einstieg */}
      <section className="bg-[var(--color-offwhite)] py-16 md:py-20">
        <div className="mx-auto max-w-[700px] px-4 text-center md:px-6">
          <h2 className={H2}>Wie steht deine Website da?</h2>
          <p className="mx-auto mt-3 max-w-[520px] text-[17px] text-[var(--color-gray)]">Kostenlos, ohne Anmeldung, in rund 30 Sekunden.</p>
          <a href="#seo-url" className="btn btn-primary mt-8 justify-center">
            Jetzt Website prüfen
          </a>
        </div>
      </section>
    </>
  );
}
