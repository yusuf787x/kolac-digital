import Image from 'next/image';
import type { FunnelVariant } from '@/lib/seo-check/funnel';
import { NFC_AUFSTELLER_VORRAT, VSL_VIDEO_URL } from '@/lib/seo-check/funnel';
import { BELEG_SCREENSHOTS, FUNNEL_REVIEWS, PRAXIS_MASSNAHMEN, PRAXIS_WEEKS } from '@/lib/seo-check/proof-data';
import { site } from '@/lib/site-config';

/**
 * Bausteine der Branchen-Landingpages (/seo-check/<branche>, siehe FUNNEL_VARIANTS).
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

/** Bausteine des Gefunden-Garantie-Pakets: Nummer, Name, Zeitpunkt, was man bekommt, was danach kommt. */
const PAKET_BAUSTEINE: Array<[string, string, string, string]> = [
  ['Startwert-Scan', 'Tag 0', 'Wir richten die Search Console ein, schauen uns deine Konkurrenz an und schreiben deinen Startwert auf.', 'Entwurf deiner Startseite'],
  ['Erst-sehen-Entwurf', 'bis Tag 7', 'Du siehst den Entwurf deiner neuen Startseite. Gefällt er dir nicht, kostet es dich nichts.', 'Neubau nach deiner Freigabe'],
  ['Neubau ohne Nachteile', 'Woche 2 bis 4', 'Eine eigene Seite für jede Leistung und jeden Ort. Alles, was deine alte Seite bei Google schon hat, nehmen wir mit.', 'Livegang'],
  ['Maps-Makeover', 'Woche 1 bis 4', 'Dein Google-Profil machen wir komplett fertig, dazu einheitliche Firmendaten und ein einfacher Weg zu mehr Bewertungen.', 'Erste Zahlen im Kundenportal'],
  ['Themen-Turbo', '90 Tage nach Livegang', '10 bis 20 neue Seiten zu genau dem, was deine Kunden bei Google suchen.', 'Prüfung der Garantie an Tag 90'],
  ['Zahlen-Zentrale', 'jeden Monat', 'Dein Kundenportal mit allen Zahlen und jeder Maßnahme. Der Bericht kommt in normalem Deutsch.', 'Plan für den nächsten Monat'],
];

const GARANTIE_REGELN = [
  'Gemessen werden die Klicks aus der Google-Suche ohne Suchen mit deinem Firmennamen, in der Google Search Console. Die Zahlen siehst du auch in deinem Kundenportal.',
  'Startwert sind deine Klicks in den 28 Tagen vor dem Livegang. Gibt es schon ältere Daten, zählt der Schnitt der letzten 3 Monate.',
  'Ziel: in den Tagen 63 bis 90 nach dem Livegang mindestens doppelt so viele Klicks. Liegt der Startwert unter 10, gelten 20 Klicks als Ziel.',
  'Du machst mit: Zugänge innerhalb von 7 Tagen, Freigaben innerhalb von 5 Werktagen, Kunden um Bewertungen bitten und nichts ohne Absprache ändern.',
  'Nach dem Check sagen wir dir, ob die Garantie für deine Website gilt. Ist eine Seite schon sehr stark, vereinbaren wir ein kleineres Ziel.',
  'Keine Garantie auf Platzierungen oder auf eine bestimmte Zahl an Anfragen.',
];

function PaketSection({ variant }: { variant: FunnelVariant }) {
  return (
    <section className="bg-[var(--color-offwhite)] py-16 md:py-24">
      <div className="mx-auto max-w-[1100px] px-4 md:px-6">
        <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[var(--color-blue)]">Was du bekommst</p>
        <h2 className={`${H2} mt-2`}>Das Gefunden-Garantie-Paket</h2>
        <p className="mt-3 max-w-[620px] text-[17px] text-[var(--color-gray)]">
          Ein fester Ablauf. Du weißt bei jedem Schritt, was als Nächstes kommt.
        </p>

        {/* Fahrplan: auf dem Handy senkrecht mit Linie, ab md als Raster */}
        <ol className="mt-10 grid gap-0 md:grid-cols-3 md:gap-4">
          {PAKET_BAUSTEINE.map(([title, when, text, next], i) => (
            <li key={title} className="flex gap-4 md:block">
              <div className="flex flex-col items-center md:hidden">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-blue)] text-[15px] font-bold text-white">
                  {i + 1}
                </span>
                {i < PAKET_BAUSTEINE.length - 1 && <span aria-hidden className="w-px flex-1 bg-[var(--color-blue)] opacity-25" />}
              </div>
              <div className="mb-4 flex-1 rounded-[18px] bg-white p-5 shadow-[var(--shadow-sm)] md:mb-0 md:h-full md:p-6">
                <div className="flex items-center gap-3">
                  <span className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-blue)] text-[15px] font-bold text-white md:flex">
                    {i + 1}
                  </span>
                  <span className="rounded-full bg-[var(--color-blue-light)] px-3 py-1 text-[13px] font-semibold text-[var(--color-blue)]">{when}</span>
                </div>
                <h3 className="mt-3 text-[17px] font-semibold text-[var(--color-black)]">{title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-[var(--color-gray)]">{text}</p>
                <p className="mt-3 text-[13px] text-[var(--color-gray)]">
                  <span className="font-semibold text-[var(--color-black)]">Als Nächstes:</span> {next}
                </p>
              </div>
            </li>
          ))}
        </ol>

        {/* Garantien */}
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {[
            ['Erst-sehen-Garantie', 'Du siehst den Entwurf deiner neuen Startseite, bevor du zahlst. Gefällt er dir nicht, kostet es dich 0 €.'],
            [
              'Doppelt-gefunden-Garantie',
              'Finden dich 90 Tage nach dem Livegang nicht doppelt so viele neue Leute über Google wie vorher, arbeiten wir ohne Monatsbeitrag weiter, bis es so ist.',
            ],
          ].map(([title, text]) => (
            <div key={title} className="rounded-[18px] border-2 border-[var(--color-blue)] bg-white p-6">
              <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[var(--color-blue)]">Garantie</p>
              <h3 className="mt-1 text-[20px] font-bold text-[var(--color-black)]">{title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-[var(--color-black)]">{text}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-[15px] text-[var(--color-gray)]">Die genauen Regeln bekommst du schriftlich im Angebot.</p>
        <details className="group mt-2 rounded-[12px] bg-white px-4 py-3 shadow-[var(--shadow-sm)]">
          <summary className="cursor-pointer list-none text-[15px] font-semibold text-[var(--color-black)] [&::-webkit-details-marker]:hidden">
            <span className="inline-block transition-transform group-open:rotate-90" aria-hidden>
              ›
            </span>{' '}
            Die Spielregeln der Doppelt-gefunden-Garantie kurz
          </summary>
          <ul className="mt-3 space-y-2 pb-1">
            {GARANTIE_REGELN.map((r) => (
              <li key={r} className="flex gap-3 text-[14px] leading-relaxed text-[var(--color-gray)]">
                <span aria-hidden className="mt-[1px] text-[var(--color-blue)]">•</span>
                {r}
              </li>
            ))}
          </ul>
        </details>

        {/* Boni */}
        <ul className="mt-8 grid gap-3 md:grid-cols-2">
          <li className="flex gap-3 rounded-[12px] bg-white px-4 py-3 text-[15px] leading-snug text-[var(--color-black)]">
            <span aria-hidden className="font-bold text-[var(--color-blue)]">+</span>
            <span>
              <span className="font-semibold">Texte inklusive:</span> Du redest 30 Minuten mit uns, wir schreiben alle Texte.
            </span>
          </li>
          {NFC_AUFSTELLER_VORRAT > 0 && (
            <li className="flex gap-3 rounded-[12px] bg-white px-4 py-3 text-[15px] leading-snug text-[var(--color-black)]">
              <span aria-hidden className="font-bold text-[var(--color-blue)]">+</span>
              <span>
                <span className="font-semibold">Bewertungs-Aufsteller:</span> Die ersten {NFC_AUFSTELLER_VORRAT} Betriebe bekommen{' '}
                {variant.nfcText ??
                  'einen NFC-Aufsteller für die Theke. Kunde hält das Handy dran und landet direkt bei deinen Google-Bewertungen.'}
              </span>
            </li>
          )}
        </ul>

        <a href="#seo-url" className="btn btn-outline mt-8 justify-center">
          Erst Website prüfen
        </a>
      </div>
    </section>
  );
}

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
              {variant.symptomsFazit ?? 'Das sind keine einzelnen Probleme. Google zeigt deine Website einfach nicht.'}
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
            {(variant.reasons ?? REASONS).map(([n, title, text]) => (
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

          {variant.proof === 'kfz' && (
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

      {/* Das Paket: erst Beweis, dann was man bekommt, dann wie man startet */}
      <PaketSection variant={variant} />

      {/* Ablauf */}
      <section className="bg-white py-16 md:py-24">
        <div className="mx-auto max-w-[1100px] px-4 md:px-6">
          <h2 className={H2}>So läuft der Check</h2>
          <ol className="mt-10 grid gap-4 md:grid-cols-3">
            {STEPS.map(([title, text], i) => (
              <li key={title} className="rounded-[18px] bg-[var(--color-offwhite)] p-6">
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
      <section className="bg-[var(--color-offwhite)] py-16 md:py-24">
        <div className="mx-auto grid max-w-[900px] items-center gap-8 px-4 md:grid-cols-[auto_1fr] md:gap-12 md:px-6">
          <div className="relative mx-auto h-40 w-40 overflow-hidden rounded-full bg-white shadow-[var(--shadow-md)] md:h-52 md:w-52">
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
              <p>
                {variant.nationwide
                  ? 'Ich baue Websites für Betriebe in ganz Deutschland und kümmere mich darum, dass Google sie auch zeigt. Das mache ich selbst. Die Gespräche laufen per Video.'
                  : 'Ich baue Websites für Betriebe aus OWL und kümmere mich darum, dass Google sie auch zeigt. Das mache ich selbst.'}
              </p>
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
      <section className="bg-white py-16 md:py-20">
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
