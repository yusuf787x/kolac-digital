import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { findPortfolioProject, type PortfolioProject } from '@/lib/portfolio';
import { site } from '@/lib/site-config';
import Reveal from '@/components/marketing/Reveal';
import { FaqListe, Kontakt, ProjektKarten, Stars } from '../../webseiten/sections';
import { CheckBand, PraxisBeleg, SeoReviews } from '../sections';

/**
 * SEO Paderborn. Eigene Seite statt Abschnitt auf /seo, weil bei
 * „seo paderborn“ (Google-Ergebnisse vom 26.11.2026) vorne Seiten mit
 * Paderborn in Titel und Überschrift stehen. Eigener Text mit den zwei
 * Paderborner Projekten, nie nur der Ortsname getauscht.
 * „webdesign paderborn“ gehört /webdesign/paderborn.
 */

const PAGE_URL = `${site.baseUrl}/seo/paderborn`;
const TITLE = 'SEO Paderborn · Bei Google gefunden werden | Kolac Digital';
const DESCRIPTION =
  'SEO für Betriebe in Paderborn und im Kreis: Google-Profil, Seiten für Leistung und Stadtteil, echte Zahlen jeden Monat. Mit Projekten aus Paderborn.';

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
    images: [{ url: `${site.baseUrl}/images/portfolio/paderpuls.jpg`, alt: 'Website von PaderPuls Krankenfahrdienst aus Paderborn' }],
  },
};

const orte = ['Schloß Neuhaus', 'Elsen', 'Sande', 'Wewer', 'Marienloh', 'Dahl', 'Benhausen', 'Neuenbeken'];
const kreis = ['Delbrück', 'Salzkotten', 'Bad Lippspringe', 'Büren', 'Hövelhof', 'Borchen', 'Altenbeken', 'Lichtenau'];

const schritte = [
  {
    title: 'Zuerst die Suchen, die Aufträge bringen',
    text: 'Bevor wir etwas bauen, schauen wir, wonach in Paderborn wirklich gesucht wird und wer dort vorne steht. Bei Pader Automobilzentrum stand diese Analyse am Anfang, noch vor der ersten Zeile der Website.',
  },
  {
    title: 'Eine Seite pro Leistung',
    text: 'Wer „Dialysefahrt Paderborn“ sucht, will nicht auf einer Seite landen, auf der alles steht. Jede wichtige Leistung bekommt eine eigene Seite mit Ablauf, Kosten und Antworten auf die Fragen, die am Telefon kommen.',
  },
  {
    title: 'Stadtteile und Orte im Kreis, die du wirklich bedienst',
    text: 'Viele suchen mit ihrem Stadtteil oder Nachbarort. Seiten dafür lohnen sich nur mit echtem Inhalt, etwa Fahrzeiten, Kliniken oder Einsatzgebiete vor Ort. Kopierte Ortsseiten mit getauschtem Namen bauen wir nicht.',
  },
  {
    title: 'Google-Profil und Bewertungen',
    text: 'In der Karte entscheidet sich, wen Leute in Paderborn zuerst anrufen. Wir richten dein Unternehmensprofil komplett ein und bauen dir einen einfachen Weg zu mehr echten Bewertungen.',
  },
];

const faqs = [
  {
    question: 'Muss meine Website neu, damit SEO in Paderborn wirkt?',
    answer:
      'Nicht immer. Ist die Seite technisch in Ordnung, richten wir sie auf deine Suchbegriffe aus und bauen das Google-Profil auf. Ist sie veraltet wie damals bei PaderPuls, lohnt sich meist ein Relaunch. Dabei leiten wir alle alten Adressen weiter, damit nichts verloren geht. Was bei dir passt, zeigt der kostenlose SEO-Check.',
  },
  {
    question: 'Lohnen sich eigene Seiten für Stadtteile wie Schloß Neuhaus oder Elsen?',
    answer:
      'Wenn du dort wirklich arbeitest und es etwas Eigenes zu sagen gibt, ja. PaderPuls hat Seiten für alle Paderborner Stadtteile und die Orte im Kreis Paderborn und im Kreis Höxter, jeweils mit echten Fahrzeiten und den Kliniken vor Ort. Seiten, die sich nur im Ortsnamen unterscheiden, schaden eher, als dass sie helfen.',
  },
  {
    question: 'Ich gründe gerade in Paderborn. Wann sollte ich mit SEO anfangen?',
    answer:
      'Am besten vor dem Start. Google braucht einige Wochen, bis eine neue Seite gut einsortiert ist. Bei Pader Automobilzentrum waren Website und Google-Unternehmensprofil zur Eröffnung fertig und von Anfang an auf Suchen wie Autoankauf in Paderborn ausgerichtet.',
  },
  {
    question: 'Wie sehe ich, ob sich das lohnt?',
    answer:
      'In deinem eigenen Kundenportal. Dort stehen jeden Monat die echten Zahlen aus der Google Search Console, also wie oft du angezeigt und angeklickt wurdest, und jede Maßnahme mit Datum. Einen ersten Platz verspricht dir niemand seriös, aber du siehst genau, was sich bewegt.',
  },
  {
    question: 'Kommt ihr für Termine nach Paderborn?',
    answer:
      'Ja, wenn du das möchtest. Unser Büro ist in Bielefeld, über die A33 ist Paderborn gut zu erreichen. Die meisten Gespräche laufen aber per Telefon oder Video Call, das spart dir Zeit.',
  },
  {
    question: 'Was kostet SEO in Paderborn?',
    answer:
      'Das hängt davon ab, wie stark die Konkurrenz in deiner Branche ist und was schon da ist. Nach einer kurzen Analyse bekommst du ein festes Angebot mit allen Positionen. Den ersten Überblick gibt dir der kostenlose SEO-Check.',
  },
];

function StructuredData() {
  const service = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    serviceType: 'Suchmaschinenoptimierung',
    name: 'SEO Paderborn',
    description: DESCRIPTION,
    url: PAGE_URL,
    provider: { '@id': `${site.baseUrl}/#business` },
    areaServed: [
      { '@type': 'City', name: 'Paderborn' },
      { '@type': 'AdministrativeArea', name: 'Kreis Paderborn' },
    ],
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
      { '@type': 'ListItem', position: 2, name: 'SEO', item: `${site.baseUrl}/seo` },
      { '@type': 'ListItem', position: 3, name: 'SEO Paderborn', item: PAGE_URL },
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

function Hero({ haupt }: { haupt: PortfolioProject }) {
  return (
    <section className="relative overflow-hidden border-b border-gray-100 bg-linear-to-b from-white to-gray-50">
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-10 sm:px-6 sm:pt-16 lg:pb-24 lg:pt-20">
        <nav aria-label="Brotkrumen" className="text-sm text-gray-500">
          <Link href="/seo" className="hover:text-brand-blue">
            SEO
          </Link>
          <span aria-hidden className="mx-2">
            ›
          </span>
          <span className="text-gray-700">SEO Paderborn</span>
        </nav>

        <div className="mt-6 grid items-center gap-12 lg:grid-cols-2">
          <Reveal>
            <p className="text-sm font-medium uppercase tracking-wider text-brand-blue">SEO Paderborn</p>
            <h1 className="mt-3 text-4xl font-semibold leading-tight tracking-tight text-gray-900 sm:text-5xl">
              SEO für Paderborn: gefunden werden, in der Stadt und im ganzen Kreis.
            </h1>
            <p className="mt-5 max-w-xl text-base text-gray-600 sm:text-lg">
              Wer in Paderborn eine Werkstatt, einen Fahrdienst oder eine Praxis sucht, ruft fast immer
              einen der ersten Treffer bei Google an. Wir sorgen dafür, dass du dort stehst: mit einem
              gepflegten Google-Profil und Seiten für deine Leistungen und die Orte, in denen du
              arbeitest. Zwei Paderborner Betriebe begleiten wir schon dabei.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/seo-check" className="btn-primary px-5 py-3 text-base">
                Kostenlosen SEO-Check starten
              </Link>
              <a href="#projekte" className="btn-secondary px-5 py-3 text-base">
                Projekte aus Paderborn
              </a>
            </div>
            <p className="mt-3 text-sm text-gray-600">
              Oder{' '}
              <a
                href={site.meetingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-brand-blue underline underline-offset-2 hover:opacity-80"
              >
                direkt ein Erstgespräch buchen
              </a>
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-gray-600">
              <span className="flex items-center gap-1.5">
                <Stars />
                <strong className="text-gray-900">{site.rating.value.toFixed(1)}</strong> bei Google (
                {site.rating.count} Bewertungen)
              </span>
              <span>·</span>
              <span>Zahlen jeden Monat im Kundenportal</span>
            </div>
          </Reveal>

          <Reveal delay={150}>
            <div className="relative">
              <div className="absolute inset-0 -z-10 rounded-4xl bg-linear-to-tr from-brand-blue/20 via-blue-100 to-white blur-2xl" />
              <div className="relative rounded-2xl border border-gray-100 bg-white p-3 shadow-xl">
                <div className="relative aspect-16/10 w-full overflow-hidden rounded-xl">
                  <Image
                    src={haupt.overviewImage}
                    alt={haupt.imageAlt}
                    fill
                    sizes="(min-width: 1024px) 560px, 100vw"
                    className="object-cover object-top"
                    priority
                  />
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function Vorgehen() {
  return (
    <section className="bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <p className="text-sm font-medium uppercase tracking-wider text-brand-blue">Aus der Region</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
          So gehen wir in Paderborn vor.
        </h2>
        <p className="mt-5 text-base leading-relaxed text-gray-700">
          Paderborn ist groß genug, dass in fast jeder Branche mehrere Betriebe um dieselben Suchen
          kämpfen. Und klein genug, dass viele Leute nicht nach der Stadt suchen, sondern nach ihrem
          Stadtteil oder Ort: Schloß Neuhaus, Elsen, Delbrück oder Bad Lippspringe. Wer das abdeckt, hat
          einen Vorsprung.
        </p>
        <div className="mt-8 space-y-4">
          {schritte.map((s, i) => (
            <div key={s.title} className="flex gap-4 rounded-2xl border border-gray-100 bg-gray-50 p-5">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-blue text-sm font-semibold text-white">
                {i + 1}
              </span>
              <div>
                <h3 className="text-base font-semibold text-gray-900">{s.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-gray-600">{s.text}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-8 text-base leading-relaxed text-gray-700">
          Das gilt für Betriebe aus jedem Stadtteil, ob {orte.slice(0, -1).join(', ')} oder{' '}
          {orte[orte.length - 1]}, und aus dem ganzen Kreis, etwa {kreis.slice(0, -1).join(', ')} oder{' '}
          {kreis[kreis.length - 1]}. Alles, was zu SEO dazugehört, findest du auf unserer Seite{' '}
          <Link href="/seo" className="font-medium text-brand-blue underline underline-offset-2 hover:opacity-80">
            SEO für Bielefeld und OWL
          </Link>
          .
        </p>
      </div>
    </section>
  );
}

function Projekte({ projekte }: { projekte: PortfolioProject[] }) {
  return (
    <section id="projekte" className="scroll-mt-24 bg-gray-50 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <header className="max-w-2xl">
          <p className="text-sm font-medium uppercase tracking-wider text-brand-blue">Referenzen</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
            Zwei Betriebe aus Paderborn.
          </h2>
          <p className="mt-3 text-base text-gray-600">
            PaderPuls hatte eine alte Baukasten-Seite mit fünf dünnen Seiten. Heute sind es über 40 Seiten
            mit echtem Inhalt für Paderborn, den Kreis Paderborn und den Kreis Höxter, und der Fahrdienst
            bekommt spürbar mehr Anfragen und Anrufe über die Website. Pader Automobilzentrum ist eine
            Neugründung: Am Anfang stand die SEO-Analyse, darauf folgten 13 Leistungsseiten, Seiten für
            die Stadtteile und das Google-Unternehmensprofil.
          </p>
        </header>
        <div className="mt-10">
          <ProjektKarten projects={projekte} />
        </div>
      </div>
    </section>
  );
}

function WeitereSeiten() {
  return (
    <section className="border-t border-gray-100 bg-white py-10">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 text-sm text-gray-600 sm:px-6">
        <span>Außerdem:</span>
        <Link href="/seo" className="font-medium text-brand-blue hover:underline">
          SEO Agentur Bielefeld
        </Link>
        <Link href="/webdesign/paderborn" className="font-medium text-brand-blue hover:underline">
          Webdesign Paderborn
        </Link>
        <Link href="/seo/google-unternehmensprofil" className="font-medium text-brand-blue hover:underline">
          Google-Unternehmensprofil optimieren
        </Link>
        <Link href="/seo-check" className="font-medium text-brand-blue hover:underline">
          Kostenloser SEO-Check
        </Link>
      </div>
    </section>
  );
}

export default function SeoPaderbornPage() {
  const projekte = ['paderpuls', 'pader-automobilzentrum']
    .map(findPortfolioProject)
    .filter((p): p is PortfolioProject => Boolean(p));
  return (
    <>
      <StructuredData />
      <Hero haupt={projekte[0]} />
      <Vorgehen />
      <Projekte projekte={projekte} />
      <CheckBand
        title="Wie gut findet Google dich in Paderborn?"
        text="Der kostenlose SEO-Check zeigt dir in rund 30 Sekunden deine Note, deine Platzierungen und wer in der Karte vor dir steht. Ohne Anmeldung."
      />
      <PraxisBeleg eyebrow="Noch ein Beispiel aus OWL" title="Was passiert, wenn Google dir vertraut." />
      <SeoReviews />
      <FaqListe title="Häufige Fragen zu SEO in Paderborn" faqs={faqs} />
      <Kontakt source="SEO-Seite Paderborn" />
      <WeitereSeiten />
    </>
  );
}
