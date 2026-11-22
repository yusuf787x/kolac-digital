import Image from 'next/image';
import type { FunnelVariant } from '@/lib/seo-check/funnel';
import { NFC_AUFSTELLER_VORRAT, VSL_VIDEO_URL } from '@/lib/seo-check/funnel';
import { BELEG_SCREENSHOTS, FUNNEL_REVIEWS, PRAXIS_DAILY, PRAXIS_MARKER, PRAXIS_MASSNAHMEN } from '@/lib/seo-check/proof-data';
import { site } from '@/lib/site-config';
import { Icon, type IconName } from './FunnelIcons';
import NfcAufsteller from './NfcAufsteller';
import ProofChart from './ProofChart';

/**
 * Bausteine der Branchen-Landingpages (/seo-check/<branche>, siehe FUNNEL_VARIANTS).
 * Aufbau angelehnt an Hormozis Workshop-Seite, aber kurz: Symptome, drei
 * Gründe, Belege, Paket als Zeitstrahl, Garantien, Über mich, zweiter
 * Einstieg. Nur echte Zahlen, keine Kundennamen, kein Preis.
 *
 * Signalfarben (Tokens in public/css/style.css, siehe DESIGN.md): Grün für
 * Garantien und Inklusives, Bernstein für Knappheit, Rot und Orange dezent
 * für Probleme. Blau bleibt Hauptaktion und Kennzahl.
 */

const H2 = 'text-[28px] md:text-[36px] font-bold leading-[1.15] tracking-tight text-[var(--color-black)]';
const EYEBROW = 'text-[13px] font-semibold uppercase tracking-[0.08em]';

/** Kleine Zeile mit Porträt im Hero. */
export function FunnelByline() {
  return (
    <div className="mt-6 flex items-center justify-center gap-3 text-left">
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

/** Passendes Symbol zur Gründe-Karte, nach dem Titel. */
const REASONS: Array<[string, string, string]> = [
  ['01', 'Eine Seite für alles', 'Alle Leistungen stehen auf einer Seite. Google weiß dann gar nicht, wofür du eigentlich gefunden werden willst.'],
  [
    '02',
    'Google-Profil halb ausgefüllt',
    'Dein Google-Profil ist dein Eintrag bei Google Maps. Wer dort oben steht, bekommt die Anrufe. Fehlen Kategorien, Fotos und Bewertungen, stehen andere vor dir.',
  ],
  ['03', 'Seit Jahren nichts Neues', 'Kommt nie etwas dazu, wirkt deine Seite für Google wie ein Laden, der zu hat.'],
];

/** Passendes Symbol zur Gründe-Karte, nach dem Titel. */
function reasonIcon(title: string): IconName {
  if (/eine seite/i.test(title)) return 'pages';
  if (/profil|maps/i.test(title)) return 'mapPin';
  if (/neues/i.test(title)) return 'clock';
  if (/fragen/i.test(title)) return 'question';
  if (/anfrage/i.test(title)) return 'phone';
  if (/hersteller/i.test(title)) return 'building';
  return 'alert';
}

function Stars() {
  return (
    <span aria-hidden className="text-[13px] tracking-[1px] text-[var(--color-star)]">
      ★★★★★
    </span>
  );
}

const fmt = (n: number) => n.toLocaleString('de-DE');
const dm = (iso: string) => `${Number(iso.slice(8, 10))}.${Number(iso.slice(5, 7))}.`;

/** Erste gegen letzte Woche der Tageswerte, für die Kennzahl über der Grafik. */
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

const STEPS: Array<[IconName, string, string]> = [
  ['search', 'Adresse eingeben', 'Nur deine Website, keine Anmeldung.'],
  ['clock', 'Ergebnis in 30 Sekunden', 'Du siehst deine Note und das wichtigste Problem sofort.'],
  ['filePlus', 'Vollen Bericht freischalten', 'Mit allen Befunden und Lösungen. Auf Wunsch gehen wir ihn gemeinsam durch.'],
];

type Station = {
  icon: IconName;
  when: string;
  title: string;
  text: string;
  next?: string;
  tone?: 'guarantee' | 'milestone';
  badge?: string;
  nfc?: boolean;
};

/** Das Gefunden-Garantie-Paket als Zeitstrahl: wann, was, was danach kommt. */
const STATIONEN: Station[] = [
  {
    icon: 'search',
    when: 'Tag 0',
    title: 'Startwert-Scan',
    text: 'Wir richten die Search Console ein, das ist Googles kostenloses Messwerkzeug. Dann schauen wir uns deine Konkurrenz an und schreiben deinen Startwert auf.',
    next: 'Entwurf deiner Startseite',
  },
  {
    icon: 'eye',
    when: 'bis Tag 7',
    title: 'Erst-sehen-Entwurf',
    text: 'Du siehst den Entwurf deiner neuen Startseite. Gefällt er dir nicht, kostet es dich nichts.',
    next: 'Neubau nach deiner Freigabe',
    tone: 'guarantee',
    badge: 'Erst-sehen-Garantie',
  },
  {
    icon: 'layout',
    when: 'Woche 2 bis 4',
    title: 'Neubau ohne Nachteile',
    text: 'Eine eigene Seite für jede Leistung und jeden Ort. Alles, was deine alte Seite bei Google schon erreicht hat, nehmen wir mit.',
    next: 'Livegang',
  },
  {
    icon: 'mapPin',
    when: 'Woche 1 bis 4, parallel',
    title: 'Maps-Makeover',
    text: 'Wir machen dein Google-Profil komplett fertig, das ist dein Eintrag bei Google Maps. Dazu einheitliche Firmendaten überall im Netz und ein einfacher Weg zu mehr Bewertungen.',
    next: 'Erste Zahlen im Kundenportal',
    nfc: true,
  },
  {
    icon: 'flag',
    when: 'Livegang',
    title: 'Deine neue Website ist online',
    text: 'Ab jetzt läuft die Uhr für die Doppelt-gefunden-Garantie.',
    tone: 'milestone',
  },
  {
    icon: 'filePlus',
    when: 'Tag 1 bis 90 nach dem Livegang',
    title: 'Themen-Turbo',
    text: '10 bis 20 neue Seiten zu genau dem, was deine Kunden bei Google suchen.',
    next: 'Prüfung der Garantie',
  },
  {
    icon: 'shieldCheck',
    when: 'Tag 90',
    title: 'Garantie-Prüfung',
    text: 'Finden dich doppelt so viele neue Leute über Google wie vorher? Wenn nicht, arbeiten wir ohne Monatsbeitrag weiter, bis es so ist.',
    tone: 'guarantee',
    badge: 'Doppelt-gefunden-Garantie',
    next: 'Jeden Monat dein Bericht',
  },
  {
    icon: 'chart',
    when: 'jeden Monat',
    title: 'Zahlen-Zentrale',
    text: 'Dein Kundenportal mit allen Zahlen und jeder Maßnahme. Den Bericht bekommst du in normalem Deutsch.',
    next: 'Plan für den nächsten Monat',
  },
];

/** Garantie-Stempel: Kreis mit umlaufender Schrift und Schild. */
function GuaranteeSeal({ id }: { id: string }) {
  return (
    <svg viewBox="0 0 96 96" className="h-[100px] w-[100px] shrink-0 -rotate-[8deg]" aria-hidden>
      <defs>
        <path id={`${id}-ring`} d="M48 48m-31 0a31 31 0 1 1 62 0a31 31 0 1 1-62 0" />
      </defs>
      <circle cx="48" cy="48" r="45" fill="var(--color-guarantee-bg)" stroke="var(--color-guarantee)" strokeWidth="2.5" />
      <circle cx="48" cy="48" r="38" fill="none" stroke="var(--color-guarantee)" strokeWidth="1" strokeDasharray="2.5 2.5" />
      <text fill="var(--color-guarantee)" fontSize="10.5" fontWeight="800">
        <textPath href={`#${id}-ring`} startOffset="0" textLength="190" lengthAdjust="spacing">
          GARANTIE ★ GARANTIE ★
        </textPath>
      </text>
      <circle cx="48" cy="48" r="20" fill="var(--color-guarantee)" />
      <g transform="translate(36 36)" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3 4.5 6v5.5c0 4.8 3.2 8.2 7.5 9.5 4.3-1.3 7.5-4.7 7.5-9.5V6z" />
        <path d="m8.5 12 2.5 2.5 4.5-5" />
      </g>
    </svg>
  );
}

function Timeline({ variant }: { variant: FunnelVariant }) {
  return (
    <ol id="ablauf" className="relative mt-12">
      {/* Linie: grau als Spur, farbig füllt sich beim Scrollen */}
      <span aria-hidden className="absolute bottom-6 left-[19px] top-6 w-[3px] -translate-x-1/2 rounded-full bg-[#e3e6ea] md:left-1/2" />
      <span
        aria-hidden
        className="fz-line-fill absolute bottom-6 left-[19px] top-6 w-[3px] -translate-x-1/2 rounded-full md:left-1/2"
        style={{ background: 'linear-gradient(to bottom, var(--color-blue), var(--color-blue) 55%, var(--color-guarantee))' }}
      />
      {STATIONEN.map((s, i) => {
        const left = i % 2 === 0;
        const isG = s.tone === 'guarantee';
        const isM = s.tone === 'milestone';
        const showNfc = s.nfc && NFC_AUFSTELLER_VORRAT > 0;
        return (
          <li key={s.title} className="relative grid grid-cols-[40px_1fr] gap-x-4 pb-6 last:pb-0 md:grid-cols-[1fr_56px_1fr] md:gap-x-6 md:pb-8 md:[&:not(:first-of-type)]:-mt-28">
            {/* Punkt auf der Linie */}
            <span
              className={`col-start-1 row-start-1 mt-3 flex h-10 w-10 items-center justify-center rounded-full ring-[6px] ring-[var(--color-offwhite)] md:col-start-2 md:mx-auto md:mt-4 md:h-12 md:w-12 ${
                isG
                  ? 'bg-[var(--color-guarantee)] text-white'
                  : isM
                    ? 'bg-[var(--color-blue)] text-white'
                    : 'bg-white text-[var(--color-blue)] shadow-[var(--shadow-sm)]'
              }`}
            >
              <Icon name={s.icon} className="h-5 w-5 md:h-6 md:w-6" />
            </span>

            <div
              className={`fz-reveal col-start-2 row-start-1 ${left ? 'md:col-start-1 md:justify-self-end' : 'md:col-start-3 md:justify-self-start'} w-full md:max-w-[440px]`}
            >
              <div
                className={`rounded-[18px] p-5 md:p-6 ${
                  isG
                    ? 'bg-[var(--color-guarantee-bg)] ring-1 ring-[var(--color-guarantee-line)]'
                    : isM
                      ? 'bg-[var(--color-blue-light)]'
                      : 'bg-white shadow-[var(--shadow-sm)]'
                }`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-3 py-1 text-[13px] font-semibold ${
                      isG ? 'bg-white text-[var(--color-guarantee)]' : isM ? 'bg-white text-[var(--color-blue)]' : 'bg-[var(--color-blue-light)] text-[var(--color-blue)]'
                    }`}
                  >
                    {s.when}
                  </span>
                  {s.badge && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-guarantee)] px-2.5 py-1 text-[12px] font-semibold text-white">
                      <Icon name="shieldCheck" className="h-3.5 w-3.5" />
                      {s.badge}
                    </span>
                  )}
                </div>
                <div className={showNfc ? 'mt-3 flex gap-4' : 'mt-3'}>
                  <div className="flex-1">
                    <h3 className={`text-[18px] font-bold ${isG ? 'text-[var(--color-guarantee)]' : 'text-[var(--color-black)]'}`}>{s.title}</h3>
                    <p className="mt-1.5 text-[15px] leading-relaxed text-[var(--color-black)]/80">{s.text}</p>
                  </div>
                  {showNfc && <NfcAufsteller id="nfc-zeitstrahl" className="w-[76px] shrink-0 self-start md:w-[96px]" />}
                </div>
                {showNfc && (
                  <p className="mt-2 text-[13px] font-semibold text-[var(--color-scarcity)]">
                    Dazu ein Bewertungs-Aufsteller{variant.nfcText ? '' : ' für die Theke'}, solange der Vorrat reicht.
                  </p>
                )}
                {s.next && (
                  <p className="mt-3 flex items-center gap-1.5 border-t border-black/5 pt-3 text-[13px] text-[var(--color-gray)]">
                    <span aria-hidden className="text-[var(--color-blue)]">→</span>
                    <span>
                      <span className="font-semibold text-[var(--color-black)]">Als Nächstes:</span> {s.next}
                    </span>
                  </p>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function PaketSection({ variant }: { variant: FunnelVariant }) {
  return (
    <section className="bg-[var(--color-offwhite)] py-16 md:py-24">
      <div className="mx-auto max-w-[1100px] px-4 md:px-6">
        <div className="md:text-center">
          <p className={`${EYEBROW} text-[var(--color-blue)]`}>Was du bekommst</p>
          <h2 className={`${H2} mt-2`}>Das Gefunden-Garantie-Paket</h2>
          <p className="mt-3 max-w-[620px] text-[17px] text-[var(--color-gray)] md:mx-auto">
            Ein fester Ablauf. Du weißt bei jedem Schritt, was als Nächstes kommt.
          </p>
        </div>

        <Timeline variant={variant} />

        {/* Garantien */}
        <div id="garantien" className="mt-16 scroll-mt-[calc(var(--nav-height)+24px)]">
          <div className="md:text-center">
            <p className={`${EYEBROW} text-[var(--color-guarantee)]`}>Zwei Garantien</p>
            <h2 className={`${H2} mt-2`}>Das Risiko liegt bei mir</h2>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {[
              ['g1', 'Garantie 1', 'Erst-sehen-Garantie', 'Du siehst den Entwurf deiner neuen Startseite, bevor du zahlst. Gefällt er dir nicht, kostet es dich 0 €.'],
              [
                'g2',
                'Garantie 2',
                'Doppelt-gefunden-Garantie',
                'Finden dich 90 Tage nach dem Livegang nicht doppelt so viele neue Leute über Google wie vorher, arbeiten wir ohne Monatsbeitrag weiter, bis es so ist.',
              ],
            ].map(([id, label, title, text]) => (
              <div key={id} className="flex flex-col gap-4 rounded-[18px] border-2 border-[var(--color-guarantee)] bg-white p-6 sm:flex-row sm:items-start sm:gap-5">
                <GuaranteeSeal id={`seal-${id}`} />
                <div>
                  <p className={`${EYEBROW} text-[var(--color-guarantee)]`}>{label}</p>
                  <h3 className="mt-1 text-[21px] font-bold text-[var(--color-black)]">{title}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-[var(--color-black)]">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Boni */}
        <div id="boni" className="mt-14">
          <p className={`${EYEBROW} flex items-center gap-2 text-[var(--color-black)]`}>
            <Icon name="gift" className="h-4 w-4 text-[var(--color-guarantee)]" />
            Obendrauf
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="flex gap-4 rounded-[18px] bg-[var(--color-guarantee-bg)] p-6 ring-1 ring-[var(--color-guarantee-line)]">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--color-guarantee)] text-white">
                <Icon name="pen" className="h-5 w-5" />
              </span>
              <div>
                <p className="inline-flex items-center gap-1.5 text-[19px] font-bold text-[var(--color-guarantee)]">
                  Texte inklusive <Icon name="check" className="h-5 w-5" />
                </p>
                <p className="mt-1.5 text-[15px] leading-relaxed text-[var(--color-black)]">
                  Du redest 30 Minuten mit uns, wir schreiben alle Texte. Du musst nichts selbst formulieren.
                </p>
              </div>
            </div>
            {NFC_AUFSTELLER_VORRAT > 0 && (
              <div className="flex items-center gap-5 rounded-[18px] bg-white p-6 shadow-[var(--shadow-sm)]">
                <NfcAufsteller id="nfc-bonus" className="w-[112px] shrink-0 md:w-[140px]" />
                <div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-scarcity-bg)] px-3 py-1 text-[12px] font-semibold text-[var(--color-scarcity)]">
                    <span aria-hidden className="h-2 w-2 rounded-full bg-[var(--color-scarcity-fill)]" />
                    Noch {NFC_AUFSTELLER_VORRAT} auf Lager
                  </span>
                  <p className="mt-2 text-[19px] font-bold text-[var(--color-black)]">Bewertungs-Aufsteller</p>
                  <p className="mt-1.5 text-[15px] leading-relaxed text-[var(--color-black)]">
                    Die ersten {NFC_AUFSTELLER_VORRAT} Betriebe bekommen{' '}
                    {variant.nfcText ??
                      'einen NFC-Aufsteller für die Theke. Kunde hält das Handy dran und landet direkt bei deinen Google-Bewertungen.'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-10 md:text-center">
          <a href="#seo-url" className="btn btn-outline justify-center">
            Erst Website prüfen
          </a>
        </div>
      </div>
    </section>
  );
}

export default function FunnelSections({ variant }: { variant: FunnelVariant }) {
  const w = weekCompare();
  const ratio = w.impLast / w.impFirst;
  const clickPlus = Math.floor(((w.clkLast - w.clkFirst) / w.clkFirst) * 100);
  return (
    <>
      {/* Kommt dir das bekannt vor? */}
      <section className="bg-white py-16 md:py-24">
        <div className="mx-auto grid max-w-[1100px] gap-10 px-4 md:grid-cols-[0.9fr_1.1fr] md:items-center md:gap-16 md:px-6">
          <h2 className={H2}>Kommt dir das bekannt vor?</h2>
          <div>
            <ul className="space-y-3">
              {variant.symptoms.map((s) => (
                <li key={s} className="fz-reveal flex items-start gap-3 rounded-[12px] bg-[var(--color-offwhite)] px-4 py-3 text-[16px] leading-snug text-[var(--color-black)]">
                  <span aria-hidden className="mt-[1px] flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--color-warn-bg)] text-[var(--color-warn)]">
                    <Icon name="alert" className="h-4 w-4" />
                  </span>
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
              <div key={n} className="fz-reveal rounded-[18px] bg-white p-6 shadow-[var(--shadow-sm)]">
                <div className="flex items-center justify-between">
                  <span className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-[var(--color-fail-bg)] text-[var(--color-fail)]">
                    <Icon name={reasonIcon(title)} className="h-6 w-6" />
                  </span>
                  <span className="text-[15px] font-bold tabular-nums text-[var(--color-gray)]">{n}</span>
                </div>
                <h3 className="mt-4 text-[17px] font-semibold text-[var(--color-black)]">{title}</h3>
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

          <div className="mt-10 rounded-[24px] bg-[var(--color-offwhite)] p-5 md:p-10">
            <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-end">
              <div>
                <p className={`${EYEBROW} text-[var(--color-blue)]`}>Eine Praxis aus OWL</p>
                <p className="mt-2 flex items-center gap-3 text-[44px] font-extrabold leading-none tracking-tight text-[var(--color-guarantee)] md:text-[56px]">
                  über {Math.floor(ratio)}-mal
                  <svg viewBox="0 0 24 24" className="h-9 w-9 md:h-11 md:w-11" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M3 17l6-6 4 4 8-8M15 7h6v6" />
                  </svg>
                </p>
                <p className="mt-2 text-[17px] font-semibold text-[var(--color-black)]">so oft bei Google angezeigt wie in der ersten Woche</p>
                <p className="mt-1 max-w-[560px] text-[15px] leading-relaxed text-[var(--color-gray)]">
                  Erste Woche ({dm(w.firstFrom)} bis {dm(w.firstTo)}): {fmt(w.impFirst)} Einblendungen. Letzte Oktoberwoche ({dm(w.lastFrom)} bis{' '}
                  {dm(w.lastTo)}): {fmt(w.impLast)}. Einblendungen heißt: so oft hat Google die Praxis in den Suchergebnissen gezeigt.
                </p>
              </div>
              <div className="rounded-[18px] bg-white px-5 py-4 shadow-[var(--shadow-sm)]">
                <p className="text-[13px] text-[var(--color-gray)]">Klicks pro Woche</p>
                <p className="mt-1 text-[22px] font-bold tabular-nums text-[var(--color-black)]">
                  {fmt(w.clkFirst)} <span className="text-[var(--color-gray)]">→</span> {fmt(w.clkLast)}
                </p>
                <p className="mt-1 inline-flex rounded-full bg-[var(--color-guarantee-bg)] px-2.5 py-0.5 text-[13px] font-semibold text-[var(--color-guarantee)]">
                  +{clickPlus} %
                </p>
              </div>
            </div>

            <div className="mt-8 rounded-[18px] bg-white p-4 shadow-[var(--shadow-sm)] md:p-6">
              <ProofChart data={PRAXIS_DAILY} marker={PRAXIS_MARKER} />
            </div>

            <div className="mt-8">
              <h3 className="text-[17px] font-semibold text-[var(--color-black)]">Was wir gemacht haben</h3>
              <ul className="mt-4 grid gap-x-8 gap-y-3 md:grid-cols-2">
                {PRAXIS_MASSNAHMEN.map((m) => (
                  <li key={m} className="flex gap-3 text-[15px] leading-snug text-[var(--color-black)]">
                    <span aria-hidden className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--color-guarantee-bg)] text-[var(--color-guarantee)]">
                      <Icon name="check" className="h-3.5 w-3.5" />
                    </span>
                    {m}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {BELEG_SCREENSHOTS.length > 0 && (
            <div className="mt-6">
              <p className="text-[15px] font-semibold text-[var(--color-black)]">Original aus der Search Console, Stand 18.11.2026</p>
              <div className="mt-3 grid gap-4 md:grid-cols-2">
                {BELEG_SCREENSHOTS.map((b) => (
                  <figure key={b.src} className="overflow-hidden rounded-[18px] bg-white shadow-[var(--shadow-sm)] ring-1 ring-black/5">
                    <a href={b.src} target="_blank" rel="noopener noreferrer" aria-label={`${b.caption} Bild groß öffnen`}>
                      <Image src={b.src} alt={b.alt} width={b.width} height={b.height} sizes="(min-width: 768px) 520px, 100vw" className="h-auto w-full" />
                    </a>
                    <figcaption className="px-4 py-3 text-[13px] leading-snug text-[var(--color-gray)]">{b.caption}</figcaption>
                  </figure>
                ))}
              </div>
              <p className="mt-2 text-[12px] text-[var(--color-gray)]">Name des Betriebs auf Wunsch weggelassen. Impressionen ist Googles Wort für Einblendungen.</p>
            </div>
          )}

          {variant.proof === 'kfz' && (
            <div className="mt-6 rounded-[24px] bg-[var(--color-offwhite)] p-6 md:p-10">
              <p className={`${EYEBROW} text-[var(--color-blue)]`}>Kfz-Meisterbetrieb aus Lage</p>
              <h3 className="mt-2 text-[22px] font-bold leading-snug text-[var(--color-black)] md:text-[26px]">
                Motorenfachmann: Onpage-Score von 60 auf 95 Prozent
              </h3>
              <p className="mt-2 max-w-[640px] text-[15px] leading-relaxed text-[var(--color-gray)]">
                Der Onpage-Score zeigt, wie sauber eine Seite für Google gebaut ist. Wir haben die bestehende Website übernommen und aufgeräumt: eine
                Adresse statt mehrerer, eigener Titel und eigene Beschreibung für alle 34 Seiten, klare Überschriften, veraltete Angaben korrigiert.
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
                <figure key={r.author} className="fz-reveal flex flex-col rounded-[18px] bg-[var(--color-offwhite)] p-5">
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
            {STEPS.map(([icon, title, text], i) => (
              <li key={title} className="rounded-[18px] bg-[var(--color-offwhite)] p-6">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-blue)] text-white">
                    <Icon name={icon} className="h-5 w-5" />
                  </span>
                  <span className="text-[13px] font-semibold text-[var(--color-gray)]">Schritt {i + 1}</span>
                </div>
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
