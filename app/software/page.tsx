import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { findPortfolioProject, type PortfolioProject } from '@/lib/portfolio';
import { site } from '@/lib/site-config';
import Reveal from '@/components/marketing/Reveal';
import ZeitfresserRechner from '@/components/marketing/ZeitfresserRechner';
import {
  About,
  FaqListe,
  Kontakt,
  ProjektKarten,
  Reviews,
  Stars,
} from '../webseiten/sections';

const PAGE_URL = `${site.baseUrl}/software`;
const TITLE = 'Individuelle Software entwickeln lassen · für kleine Betriebe | Kolac Digital';
const DESCRIPTION =
  'Individuelle Software für kleine und mittlere Betriebe: Excel ablösen, interne Tools, Kundenportale und Schnittstellen zu DATEV, Lexware und Co. Referenzen: wagenpuls und Akquise-Helfer.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: {
    type: 'website',
    locale: 'de_DE',
    url: PAGE_URL,
    title: TITLE,
    description: DESCRIPTION,
    siteName: 'Kolac Digital',
    images: [
      {
        url: `${site.baseUrl}/images/wagenpuls/ueberblick.webp`,
        alt: 'Überblick in der Software wagenpuls, entwickelt von Kolac Digital',
      },
    ],
  },
};

const problems = [
  'Die wichtigsten Zahlen stecken in Excel-Listen, die nur eine Person versteht.',
  'Daten werden doppelt eingetippt: ins Angebot, in die Rechnung und noch mal in die Buchhaltung.',
  'Fünf Programme, die nicht miteinander reden, und jedes kostet ein Abo pro Nutzer.',
  'Die Standardsoftware deiner Branche kann vieles, nur nicht das, was dein Unternehmen anders macht.',
];

const leistungen = [
  {
    icon: '📊',
    title: 'Excel ablösen',
    text: 'Aus gewachsenen Excel-Listen wird eine Anwendung mit Eingabemasken, Rechten und Auswertungen. Deine bestehenden Daten übernehmen wir.',
  },
  {
    icon: '🧰',
    title: 'Interne Tools und Dashboards',
    text: 'Auftragsverwaltung, Zeiterfassung, Kalkulation oder Belege: genau die Funktionen, die dein Betrieb braucht, mit einem Dashboard für die wichtigsten Zahlen.',
  },
  {
    icon: '🤝',
    title: 'Kundenportale',
    text: 'Kunden sehen Termine, Dokumente, Rechnungen oder den Stand ihres Auftrags online, ohne bei dir anzurufen.',
  },
  {
    icon: '🔗',
    title: 'Schnittstellen',
    text: 'Wir verbinden deine Software mit dem, was du schon nutzt, zum Beispiel DATEV, Lexware Office, sevdesk, mobile.de, Kalender oder Cloud-Ordner.',
  },
  {
    icon: '🚀',
    title: 'Eigene Branchensoftware',
    text: 'Du hast eine Idee für eine Software, die auch andere Betriebe brauchen? Wie bei wagenpuls wird daraus ein Produkt mit Registrierung, Paketen und Bezahlung.',
  },
  {
    icon: '🤖',
    title: 'Automatisierung mit KI',
    text: 'Belege auslesen, Anfragen vorsortieren, Texte vorbereiten: Wo KI echte Arbeit abnimmt, bauen wir sie direkt in deine Software ein.',
  },
];

const standardPasst = [
  'dein Ablauf dem entspricht, was in deiner Branche üblich ist',
  'du sofort starten willst und keine Anpassungen brauchst',
  'die Abo-Kosten pro Nutzer im Rahmen bleiben',
];

const individuellLohnt = [
  'dein Betrieb anders arbeitet, als die Standardsoftware es vorsieht',
  'du mehrere Programme und Excel-Listen in einem System zusammenführen willst',
  'deine Daten auf deinem eigenen Server liegen sollen',
  'du aus deiner Idee ein eigenes Produkt machen willst',
];

const steps = [
  {
    n: '01',
    title: 'Anforderungen klären',
    text: 'Wir schauen uns an, wie du heute arbeitest, wo Zeit verloren geht und was die Software können muss. Aus dieser Anforderungsanalyse entstehen Ziele und Plan. Das erste Gespräch ist kostenlos.',
  },
  {
    n: '02',
    title: 'Konzept und Prototyp',
    text: 'Du bekommst ein klares Konzept und früh einen Prototyp zum Ausprobieren. So siehst du schnell, ob die Richtung stimmt.',
  },
  {
    n: '03',
    title: 'Entwicklung in Etappen',
    text: 'Wir arbeiten agil: Schritt für Schritt, mit jedem Zwischenstand zum Ansehen. Änderungen fließen direkt in die Umsetzung ein, statt am Ende alles umzuwerfen.',
  },
  {
    n: '04',
    title: 'Betrieb und Weiterentwicklung',
    text: 'Nach dem Start kümmern wir uns um Hosting, Wartung und Weiterentwicklung. Deine Software wächst mit deinem Unternehmen.',
  },
];

const faqs = [
  {
    question: 'Lohnt sich individuelle Software für einen kleinen Betrieb?',
    answer:
      'Wenn dein Team jede Woche Stunden mit Excel, doppelter Eingabe oder Suchen verbringt, oft ja. Rechne mit dem Zeitfresser-Rechner auf dieser Seite einmal durch, was dich das im Jahr kostet. Im Erstgespräch schauen wir gemeinsam, ob sich eine eigene Lösung rechnet oder ob ein Standardprogramm reicht.',
  },
  {
    question: 'Was kostet es, eine Software entwickeln zu lassen?',
    answer:
      'Das hängt vom Aufwand ab. Ein internes Tool für einen Ablauf ist etwas anderes als ein System für mehrere Unternehmen. Nach dem Erstgespräch und dem Konzept bekommst du ein festes Angebot zum Festpreis, mit allen Positionen. Wie Wartung und Weiterentwicklung danach laufen, legen wir vorher gemeinsam fest.',
  },
  {
    question: 'Wie lange dauert die Entwicklung?',
    answer:
      'Kleine Tools stehen oft nach wenigen Wochen. wagenpuls, eine komplette Software für Autohändler mit Schnittstellen und Bezahlung, war nach rund acht Wochen am Markt. Den Zeitplan legen wir nach dem Konzept gemeinsam fest.',
  },
  {
    question: 'Wo liegen meine Daten?',
    answer:
      'Wo du willst: auf deinem eigenen Server, wie bei Akquise-Helfer, oder bei einem Anbieter mit Servern in Deutschland. Datenschutz und Zugriffsrechte planen wir von Anfang an mit.',
  },
  {
    question: 'Mit welchen Technologien entwickelt ihr?',
    answer:
      'Mit bewährten Web-Technologien, zum Beispiel TypeScript, React und Next.js mit einer Datenbank dahinter. Auf Wunsch läuft alles in Containern auf deinem eigenen Server. Die Architektur planen wir so, dass deine Software skalierbar bleibt und mit deinem Unternehmen mitwächst.',
  },
  {
    question: 'Können wir unsere alten Daten übernehmen?',
    answer:
      'Ja. Excel-Listen, Exporte aus alten Programmen oder bestehende Datenbanken übernehmen wir, damit du nicht bei null startest.',
  },
  {
    question: 'Arbeitet ihr nur in OWL?',
    answer:
      'Nein. Unser Büro ist in Bielefeld, unsere Software-Kunden sitzen zum Beispiel in Göttingen und Hofbieber. Konzept, Abstimmung und Übergabe laufen per Video Call.',
  },
];

function StructuredData() {
  const service = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    serviceType: 'Individuelle Softwareentwicklung',
    name: 'Individuelle Software für kleine und mittlere Betriebe',
    description: DESCRIPTION,
    url: PAGE_URL,
    provider: { '@id': `${site.baseUrl}/#business` },
    areaServed: { '@type': 'Country', name: 'Deutschland' },
  };
  const faq = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  };
  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Startseite', item: site.baseUrl },
      { '@type': 'ListItem', position: 2, name: 'Individuelle Software', item: PAGE_URL },
    ],
  };
  return (
    <>
      {[service, faq, breadcrumb].map((data) => (
        <script
          key={data['@type']}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
        />
      ))}
    </>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-gray-100 bg-linear-to-b from-white to-gray-50">
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-10 sm:px-6 sm:pt-16 lg:pb-24 lg:pt-24">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <Reveal>
            <p className="text-sm font-medium uppercase tracking-wider text-brand-blue">
              Individuelle Softwareentwicklung
            </p>
            <h1 className="mt-3 text-4xl font-semibold leading-tight tracking-tight text-gray-900 sm:text-5xl">
              Individuelle Software, die sich deinem Betrieb anpasst. Nicht
              andersrum.
            </h1>
            <p className="mt-5 max-w-xl text-base text-gray-600 sm:text-lg">
              Wenn Excel-Listen, Zettel und fünf verschiedene Programme den
              Alltag bestimmen, entwickeln wir dir eine eigene, maßgeschneiderte
              Software. Sie bildet genau deine Prozesse ab, verbindet die Tools,
              die du schon nutzt, und wächst mit deinem Unternehmen. Für kleine
              Betriebe und den Mittelstand, die mit Standardsoftware nicht
              weiterkommen.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <a
                href={site.meetingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary px-5 py-3 text-base"
              >
                📅 Termin buchen
              </a>
              <a href="#projekte" className="btn-secondary px-5 py-3 text-base">
                Projekte ansehen
              </a>
            </div>
            <p className="mt-3 text-sm text-gray-600">
              Oder{' '}
              <a
                href="#kontakt"
                className="font-medium text-brand-blue underline underline-offset-2 hover:opacity-80"
              >
                Formular ausfüllen und Rückruf anfordern
              </a>
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-gray-600">
              <span className="flex items-center gap-1.5">
                <Stars />
                <strong className="text-gray-900">
                  {site.rating.value.toFixed(1)}
                </strong>{' '}
                bei Google ({site.rating.count} Bewertungen)
              </span>
              <span>·</span>
              <span>Antwort in 24 Stunden</span>
              <span>·</span>
              <span>Kostenloses Gespräch</span>
            </div>
          </Reveal>

          <Reveal delay={150}>
            <div className="relative">
              <div className="absolute inset-0 -z-10 rounded-4xl bg-linear-to-tr from-brand-blue/20 via-blue-100 to-white blur-2xl" />
              <div className="relative rounded-2xl border border-gray-100 bg-white p-3 shadow-xl">
                <Image
                  src="/images/wagenpuls/ueberblick.webp"
                  alt="Überblick in wagenpuls, einer Software für Autohändler von Kolac Digital, mit Rohertrag, Verkäufen und Standzeit. Beispieldaten."
                  width={2880}
                  height={1800}
                  sizes="(min-width: 1024px) 560px, 100vw"
                  className="h-auto w-full rounded-xl"
                  priority
                />
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function Problems() {
  return (
    <section className="bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <p className="text-sm font-medium uppercase tracking-wider text-brand-blue">
          Das Problem
        </p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
          Kennst du das aus deinem Unternehmen?
        </h2>
        <ul className="mt-8 space-y-3">
          {problems.map((p) => (
            <li
              key={p}
              className="flex items-start gap-3 rounded-xl border border-gray-100 bg-gray-50 px-5 py-4 text-base text-gray-700"
            >
              <span
                aria-hidden
                className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-200 text-xs text-gray-500"
              >
                ×
              </span>
              {p}
            </li>
          ))}
        </ul>
        <p className="mt-8 text-base leading-relaxed text-gray-700">
          Jedes Programm für sich ist nicht das Problem. Das Problem ist, dass
          du dich nach der Software richten musst.{' '}
          <strong className="text-gray-900">
            Eine individuelle Softwarelösung dreht das um: Sie folgt deinen
            Abläufen.
          </strong>
        </p>
      </div>
    </section>
  );
}

function Leistungen() {
  return (
    <section className="bg-gray-50 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <header className="max-w-2xl">
          <p className="text-sm font-medium uppercase tracking-wider text-brand-blue">
            Was wir entwickeln
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
            Software für genau deinen Ablauf.
          </h2>
          <p className="mt-3 text-base text-gray-600">
            Von einem einzelnen Werkzeug bis zum System für mehrere
            Unternehmen. Softwareentwicklung, Programmierung, Integration in
            deine bestehenden Programme und Betrieb aus einer Hand. Du
            sprichst direkt mit dem Entwickler.
          </p>
        </header>

        <Reveal delay={100}>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {leistungen.map((l) => (
              <article
                key={l.title}
                className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xs"
              >
                <div className="text-3xl" aria-hidden>
                  {l.icon}
                </div>
                <h3 className="mt-3 text-base font-semibold text-gray-900">
                  {l.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">
                  {l.text}
                </p>
              </article>
            ))}
          </div>
        </Reveal>

        <p className="mt-8 text-sm text-gray-600">
          Mehr zur KI im Betrieb:{' '}
          <Link
            href="/ki-beratung"
            className="font-medium text-brand-blue underline underline-offset-2 hover:opacity-80"
          >
            KI-Beratung und Automatisierung
          </Link>
        </p>
      </div>
    </section>
  );
}

function Vergleich() {
  return (
    <section className="bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <header className="max-w-2xl">
          <p className="text-sm font-medium uppercase tracking-wider text-brand-blue">
            Ehrlich gesagt
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
            Individualsoftware oder Standardsoftware?
          </h2>
          <p className="mt-3 text-base text-gray-600">
            Die Vorteile einer eigenen Software liegen auf der Hand, aber
            nicht jedes Unternehmen braucht eine. Manchmal ist ein gutes
            Standardprogramm die bessere Wahl. Dann sagen wir dir das.
          </p>
        </header>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-6">
            <h3 className="text-lg font-semibold text-gray-900">
              Standardsoftware passt, wenn …
            </h3>
            <ul className="mt-4 space-y-2">
              {standardPasst.map((t) => (
                <li key={t} className="flex items-start gap-2 text-sm text-gray-700">
                  <span aria-hidden className="mt-0.5 text-gray-400">
                    ✓
                  </span>
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-brand-blue/30 bg-brand-blue/5 p-6">
            <h3 className="text-lg font-semibold text-gray-900">
              Individuelle Software lohnt sich, wenn …
            </h3>
            <ul className="mt-4 space-y-2">
              {individuellLohnt.map((t) => (
                <li key={t} className="flex items-start gap-2 text-sm text-gray-700">
                  <span aria-hidden className="mt-0.5 text-brand-blue">
                    ✓
                  </span>
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p className="mt-8 text-sm text-gray-600">
          Mehr dazu im Ratgeber:{' '}
          <Link
            href="/blog/branchensoftware-oder-eigene-loesung"
            className="font-medium text-brand-blue underline underline-offset-2 hover:opacity-80"
          >
            Branchensoftware oder eigene Lösung: ehrliche Entscheidungshilfe
          </Link>
        </p>
      </div>
    </section>
  );
}

function Projekte() {
  const projekte = ['wagenpuls', 'akquise-helfer']
    .map(findPortfolioProject)
    .filter((p): p is PortfolioProject => Boolean(p));
  return (
    <section id="projekte" className="scroll-mt-24 bg-gray-50 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <header className="max-w-2xl">
          <p className="text-sm font-medium uppercase tracking-wider text-brand-blue">
            Referenzen
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
            Software, die im Alltag läuft.
          </h2>
          <p className="mt-3 text-base text-gray-600">
            Auch hinter unseren Websites steckt oft Software: Bei{' '}
            <Link href="/case-studys/carhifi-herford" className="font-medium text-brand-blue hover:underline">
              CarHiFi Herford
            </Link>{' '}
            und{' '}
            <Link href="/case-studys/bacara-aesthetik" className="font-medium text-brand-blue hover:underline">
              Bacara Ästhetik
            </Link>{' '}
            laufen Anfragen, Buchungen und Rechnungen über ein eigenes
            Backend.
          </p>
        </header>
        <div className="mt-10">
          <ProjektKarten projects={projekte} />
        </div>
      </div>
    </section>
  );
}

function Ablauf() {
  return (
    <section className="bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <header className="max-w-2xl">
          <p className="text-sm font-medium uppercase tracking-wider text-brand-blue">
            So läuft ein Softwareprojekt
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
            Vier Schritte. Keine Überraschungen.
          </h2>
        </header>

        <ol className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((s) => (
            <li
              key={s.n}
              className="relative rounded-2xl border border-gray-100 bg-white p-6 shadow-xs"
            >
              <span className="absolute -top-3 left-6 inline-flex items-center rounded-full bg-brand-blue px-3 py-1 text-xs font-semibold tracking-wider text-white">
                Schritt {s.n}
              </span>
              <h3 className="mt-4 text-lg font-semibold text-gray-900">
                {s.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">
                {s.text}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function WeitereBereiche() {
  return (
    <section className="border-t border-gray-100 bg-white py-10">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 text-sm text-gray-600 sm:px-6">
        <span>Außerdem bei uns:</span>
        <Link href="/webseiten" className="font-medium text-brand-blue hover:underline">
          Webdesign
        </Link>
        <Link href="/ki-beratung" className="font-medium text-brand-blue hover:underline">
          KI-Beratung und Automatisierung
        </Link>
      </div>
    </section>
  );
}

export default function SoftwarePage() {
  return (
    <>
      <StructuredData />
      <Hero />
      <Problems />
      <Leistungen />
      <Vergleich />
      <Projekte />
      <Ablauf />
      <ZeitfresserRechner />
      <Reviews />
      <About thema="Software" />
      <FaqListe title="Das wirst du sicher wissen wollen." faqs={faqs} />
      <Kontakt source="Software-Seite" />
      <WeitereBereiche />
    </>
  );
}
