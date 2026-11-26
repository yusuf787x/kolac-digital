import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { findPortfolioProject, type PortfolioProject } from '@/lib/portfolio';
import { site } from '@/lib/site-config';
import Reveal from '@/components/marketing/Reveal';
import { FaqListe, Kontakt, ProjektKarten, Stars } from '../../webseiten/sections';
import { CheckBand, PraxisBeleg, SeoReviews } from '../sections';

/**
 * SEO für Handwerker (26.11.2026). Besitzt „seo für handwerker“ (260 Suchen
 * im Monat, Schwierigkeit 0, steigend), „seo handwerker“ und „seo für
 * handwerksbetriebe“. Vorne standen Blogartikel kleiner Agenturen und
 * Freiberufler, keine Portale. Deutschlandweit gedacht, nicht nur OWL.
 * Abgrenzung: „website für handwerker“ gehört /webseiten/handwerker, der
 * Ratgeber /blog/lokales-seo-handwerker-owl bleibt die Anleitung zum Selbermachen.
 */

const PAGE_URL = `${site.baseUrl}/seo/handwerker`;
const TITLE = 'SEO für Handwerker · Aufträge über Google | Kolac Digital';
const DESCRIPTION =
  'SEO für Handwerker: Google-Profil, eine Seite pro Leistung, echte Bewertungen und jeden Monat echte Zahlen. Für Handwerksbetriebe in ganz Deutschland.';

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
        url: `${site.baseUrl}/images/portfolio/motorenfachmann.webp`,
        alt: 'Website von Motorenfachmann, einem Kfz-Meisterbetrieb aus Lage',
      },
    ],
  },
};

const suchArten = [
  {
    title: 'Die schnelle Suche',
    beispiel: '„Rohrreinigung“, „Schlüsseldienst“, „Heizung fällt aus“',
    text: 'Hier will jemand sofort Hilfe und ruft einen der ersten Treffer an. Es zählt fast nur die Karte bei Google: Wer dort mit guten Bewertungen und Telefonnummer steht, bekommt den Anruf.',
  },
  {
    title: 'Die geplante Suche',
    beispiel: '„Bad sanieren“, „Dach neu decken“, „Wärmepumpe einbauen“',
    text: 'Hier vergleichen Leute mehrere Betriebe, oft über Wochen. Sie lesen Leistungsseiten, schauen sich Fotos an und fragen bei dem an, der zeigt, dass er genau das schon oft gemacht hat.',
  },
];

const hebel = [
  {
    title: 'Das Google-Unternehmensprofil',
    text: 'Die passende Hauptkategorie, etwa „Dachdecker“ statt einer allgemeinen, jede Leistung einzeln eingetragen, echte Fotos und ein Einzugsgebiet, wenn du nur beim Kunden arbeitest. Das Profil ist die Grundlage für die Karte.',
    link: { href: '/seo/google-unternehmensprofil', label: 'Google-Unternehmensprofil optimieren' },
  },
  {
    title: 'Eine Seite pro Leistung',
    text: 'Wer „Badsanierung“ sucht, soll auf einer Seite zur Badsanierung landen, nicht auf einer Liste mit allem. Jede wichtige Leistung bekommt eine eigene Seite mit Ablauf, Fotos und den Fragen, die am Telefon kommen. Erst danach lohnen sich Seiten für einzelne Orte.',
  },
  {
    title: 'Echte Bewertungen, gleichmäßig',
    text: 'Der beste Moment ist die Abnahme, wenn der Kunde zufrieden vor der fertigen Arbeit steht. Ein kurzer Link oder QR-Code reicht. Lieber jede Woche eine Bewertung als zwanzig auf einmal, das wirkt für Google natürlich. Gegenleistungen für Bewertungen sind tabu.',
    link: { href: '/blog/google-bewertungen-bekommen', label: 'Ratgeber: Google-Bewertungen bekommen' },
  },
  {
    title: 'Technik und Firmendaten',
    text: 'Name, Adresse und Telefonnummer überall gleich, auf der Website, im Google-Profil und in Verzeichnissen. Dazu eine Seite, die am Handy schnell lädt und deren Titel und Überschriften Google sagen, worum es geht.',
  },
];

/** Eigene Kurzfassung aus lib/portfolio.ts (motorenfachmann), keine neuen Fakten. */
const schritteMotorenfachmann = [
  'Nur noch eine Adresse: Aufrufe mit www, mit „.html“ oder über alte Adressen landen in einem Schritt auf der richtigen Seite.',
  'Alle 34 Seiten mit eigenem Titel, eigener Beschreibung und genau einer klaren Hauptüberschrift.',
  'Firmendaten, Bildbeschreibungen und eine Sitemap, die direkt bei Google eingereicht ist.',
  'Neue Seiten für gezielt gesuchte Motoren, angefangen mit der VW-T5-Motorinstandsetzung, und Städteseiten mit echter Fahrzeit nach Lage.',
];

const zeitplan = [
  { wann: 'Woche 1 bis 4', was: 'Analyse, Google-Profil, Seiten für die wichtigsten Leistungen, Verzeichnisse. Das Fundament steht.' },
  { wann: '4 bis 6 Wochen später', was: 'Google hat die Änderungen eingeordnet. Jetzt sehen wir, welche Suchen sich bewegen, und steuern nach.' },
  { wann: 'Monat 2 bis 3', was: 'Oft deutlich mehr Einblendungen bei Google. Die neuen Leistungsseiten fangen an, Besucher zu bringen.' },
  { wann: 'Danach', was: 'Weitere Leistungen und Orte, laufend neue Bewertungen und Fotos. Sichtbarkeit wächst mit.' },
];

const faqs = [
  {
    question: 'Lohnt sich SEO für einen kleinen Handwerksbetrieb?',
    answer:
      'Meistens ja, weil die Konkurrenz bei Google oft schwach ist. Wir haben die Websites von 122 Betrieben aus OWL geprüft: Bei 48 standen höchstens zwei ihrer wichtigen Suchbegriffe auf Seite 1, bei 24 davon kein einziger. Wer Google-Profil und Leistungsseiten sauber aufbaut, steht damit vor vielen anderen. Ob es sich bei dir lohnt, zeigt der kostenlose SEO-Check.',
  },
  {
    question: 'Meine Auftragsbücher sind voll. Warum sollte ich in SEO investieren?',
    answer:
      'Volle Bücher heißen nicht, dass die richtigen Aufträge kommen. Mit SEO steuerst du, wofür man dich findet: für die Arbeiten, die dir am meisten bringen, und in den Orten, in die du gern fährst. Und wird es ruhiger, musst du nicht bei null anfangen.',
  },
  {
    question: 'Was muss ich selbst machen und was übernehmt ihr?',
    answer:
      'Du machst zwei Dinge: Kunden nach der Abnahme um eine Bewertung bitten und uns ab und zu Fotos von fertigen Arbeiten schicken. Den Rest übernehmen wir, also Google-Profil, Seiten für deine Leistungen, Technik, Verzeichnisse und den Monatsbericht. Im ersten Monat brauchst du rund eine Stunde für Zugänge und Freigaben.',
  },
  {
    question: 'Brauche ich dafür eine neue Website?',
    answer:
      'Nicht unbedingt. Bei Motorenfachmann, einem Kfz-Meisterbetrieb aus Lage, haben wir die bestehende Seite übernommen und aufgeräumt. Der Onpage-Score der Startseite stieg von 60 auf 95 Prozent. Ist deine Seite veraltet oder am Handy kaum nutzbar, sagen wir dir das ehrlich. Dann lohnt sich eher eine neue Website.',
  },
  {
    question: 'Wie lange dauert es, bis mehr Anfragen kommen?',
    answer:
      'Das Fundament steht nach rund 30 Tagen. Danach braucht Google meist einige Wochen, um Änderungen am Profil und neue Seiten einzuordnen. Mehr Einblendungen siehst du oft ab dem zweiten oder dritten Monat, bei sehr neuen Websites dauert es länger. Einen ersten Platz garantiert dir niemand seriös.',
  },
  {
    question: 'Arbeitet ihr nur mit Handwerkern aus OWL?',
    answer:
      'Nein. Unser Büro ist in Bielefeld, die Zusammenarbeit läuft per Telefon und Video Call. Für Google-Profil, Seiten und Bericht müssen wir nicht vor Ort sein. Betriebe aus Ostwestfalen-Lippe besuchen wir auf Wunsch auch persönlich.',
  },
  {
    question: 'Was kostet SEO für Handwerker?',
    answer:
      'Das hängt davon ab, wie viel schon da ist und wie stark die Konkurrenz in deinem Gewerk und deiner Gegend ist. Nach einer kurzen Analyse bekommst du ein festes Angebot mit allen Positionen. Den ersten Überblick gibt dir der kostenlose SEO-Check.',
  },
];

function StructuredData() {
  const service = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    serviceType: 'Suchmaschinenoptimierung',
    name: 'SEO für Handwerker',
    description: DESCRIPTION,
    url: PAGE_URL,
    provider: { '@id': `${site.baseUrl}/#business` },
    areaServed: { '@type': 'Country', name: 'Deutschland' },
    audience: { '@type': 'BusinessAudience', name: 'Handwerksbetriebe' },
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
      { '@type': 'ListItem', position: 3, name: 'SEO für Handwerker', item: PAGE_URL },
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
          <span className="text-gray-700">SEO für Handwerker</span>
        </nav>

        <div className="mt-6 grid items-center gap-12 lg:grid-cols-2">
          <Reveal>
            <p className="text-sm font-medium uppercase tracking-wider text-brand-blue">SEO für Handwerker</p>
            <h1 className="mt-3 text-4xl font-semibold leading-tight tracking-tight text-gray-900 sm:text-5xl">
              SEO für Handwerker: gefunden werden, wenn jemand in deiner Gegend sucht.
            </h1>
            <p className="mt-5 max-w-xl text-base text-gray-600 sm:text-lg">
              SEO für Handwerker heißt: Dein Betrieb taucht bei Google auf, wenn jemand in deiner Nähe
              nach deiner Arbeit sucht, zum Beispiel „Dachdecker“ oder „Bad sanieren“ plus Ort. Dafür
              zählen drei Dinge am meisten: ein gepflegtes Google-Unternehmensprofil, eine eigene Seite
              für jede Leistung und echte Bewertungen. Wir setzen das für dich um und zeigen dir jeden
              Monat, was es bringt.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/seo-check" className="btn-primary px-5 py-3 text-base">
                Kostenlosen SEO-Check starten
              </Link>
              <a href="#beispiel" className="btn-secondary px-5 py-3 text-base">
                Beispiel ansehen
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

function SuchArten() {
  return (
    <section className="bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <header className="max-w-2xl">
          <p className="text-sm font-medium uppercase tracking-wider text-brand-blue">So suchen deine Kunden</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
            Zwei Arten von Suchen. Beide bringen Aufträge.
          </h2>
          <p className="mt-3 text-base text-gray-600">
            Handwerk wird anders gesucht als ein Restaurant oder ein Onlineshop. Wer weiß, welche Art von
            Suche bei seinem Gewerk überwiegt, weiß auch, wo er anfangen sollte.
          </p>
        </header>
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {suchArten.map((s) => (
            <article key={s.title} className="rounded-2xl border border-gray-100 bg-gray-50 p-6">
              <h3 className="text-lg font-semibold text-gray-900">{s.title}</h3>
              <p className="mt-1 text-sm text-gray-500">{s.beispiel}</p>
              <p className="mt-3 text-sm leading-relaxed text-gray-700">{s.text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Hebel() {
  return (
    <section className="bg-gray-50 py-16 sm:py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <p className="text-sm font-medium uppercase tracking-wider text-brand-blue">Was wir machen</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
          Vier Hebel für deinen Handwerksbetrieb.
        </h2>
        <div className="mt-8 space-y-4">
          {hebel.map((h, i) => (
            <div key={h.title} className="flex gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-xs">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-blue text-sm font-semibold text-white">
                {i + 1}
              </span>
              <div>
                <h3 className="text-base font-semibold text-gray-900">{h.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-gray-600">{h.text}</p>
                {h.link && (
                  <Link
                    href={h.link.href}
                    className="mt-2 inline-block text-sm font-medium text-brand-blue underline underline-offset-2 hover:opacity-80"
                  >
                    {h.link.label}
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
        <p className="mt-8 text-base leading-relaxed text-gray-700">
          Du willst es lieber selbst angehen? Die Schritte zum Nachmachen stehen in unserem Ratgeber{' '}
          <Link
            href="/blog/lokales-seo-handwerker-owl"
            className="font-medium text-brand-blue underline underline-offset-2 hover:opacity-80"
          >
            Lokales SEO für Handwerker
          </Link>
          .
        </p>
      </div>
    </section>
  );
}

function Beispiel({ projekt, weitere }: { projekt: PortfolioProject; weitere: PortfolioProject[] }) {
  const ba = projekt.beforeAfter;
  return (
    <section id="beispiel" className="scroll-mt-24 bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <header className="max-w-2xl">
          <p className="text-sm font-medium uppercase tracking-wider text-brand-blue">Beispiel aus dem Handwerk</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
            Ein Kfz-Meisterbetrieb aus Lage.
          </h2>
          <p className="mt-3 text-base text-gray-600">
            Motorenfachmann setzt Motoren instand und liefert Austauschmotoren, mit Abholung in ganz
            Deutschland. Die Website hatte gute Inhalte, aber Google kam mit ihr schlecht zurecht: mehrere
            Adressen, Titel ohne klare Aussage, durcheinander geratene Überschriften. Wir haben aufgeräumt
            statt neu gebaut und neue Seiten für gezielt gesuchte Motoren angelegt.
          </p>
        </header>

        {ba && (
          <Reveal delay={100}>
            <div className="mt-10 rounded-3xl border border-gray-100 bg-gray-50 p-5 sm:p-8">
              <div className="grid gap-8 md:grid-cols-[auto_1fr] md:items-center">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{projekt.company}</p>
                  <p className="mt-2 text-4xl font-extrabold tracking-tight text-brand-blue sm:text-5xl">
                    {ba.before.score} <span className="text-gray-400">→</span> {ba.after.score} %
                  </p>
                  <p className="mt-2 max-w-xs text-sm leading-relaxed text-gray-600">{ba.measure}</p>
                </div>
                <ul className="grid gap-3 sm:grid-cols-2">
                  {ba.metrics.map((m) => (
                    <li key={m.label} className="rounded-xl bg-white px-4 py-3 shadow-xs">
                      <p className="text-sm text-gray-600">{m.label}</p>
                      <p className="mt-0.5 text-lg font-bold tabular-nums text-gray-900">
                        {m.before} <span className="text-gray-400">→</span> {m.after} %
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
              <ul className="mt-8 space-y-2">
                {schritteMotorenfachmann.map((a) => (
                  <li key={a} className="flex items-start gap-2 text-sm text-gray-700">
                    <span aria-hidden className="mt-0.5 shrink-0 text-brand-blue">
                      ✓
                    </span>
                    <span>{a}</span>
                  </li>
                ))}
              </ul>
              <Link
                href={`/portfolio/${projekt.slug}`}
                className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-brand-blue px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-blue-hover"
              >
                Projekt ansehen
                <span aria-hidden>→</span>
              </Link>
            </div>
          </Reveal>
        )}

        <div className="mt-14">
          <h3 className="text-lg font-semibold text-gray-900">Zwei weitere Betriebe, bei denen Google mitzählt</h3>
          <p className="mt-2 max-w-2xl text-sm text-gray-600">
            Eine Gebäudereinigung, deren Anfragen jetzt online reinkommen, und eine Einbau-Werkstatt für
            Soundanlagen mit 74 Prozent mehr Kundenanfragen.
          </p>
          <div className="mt-5">
            <ProjektKarten projects={weitere} />
          </div>
        </div>
      </div>
    </section>
  );
}

function Zeitplan() {
  return (
    <section className="bg-gray-50 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <header className="max-w-2xl">
          <p className="text-sm font-medium uppercase tracking-wider text-brand-blue">Ehrlich gesagt</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
            Was schnell geht und was Zeit braucht.
          </h2>
          <p className="mt-3 text-base text-gray-600">
            SEO ist kein Schalter. Aber es ist planbar, und du siehst jeden Monat im Kundenportal, wo du
            stehst: wie oft Google dich gezeigt hat, wie oft du angeklickt wurdest und was wir gemacht haben.
          </p>
        </header>
        <ol className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {zeitplan.map((z) => (
            <li key={z.wann} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xs">
              <p className="text-xs font-semibold uppercase tracking-wider text-brand-blue">{z.wann}</p>
              <p className="mt-2 text-sm leading-relaxed text-gray-700">{z.was}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function WeitereSeiten() {
  return (
    <section className="border-t border-gray-100 bg-white py-10">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 text-sm text-gray-600 sm:px-6">
        <span>Außerdem:</span>
        <Link href="/webseiten/handwerker" className="font-medium text-brand-blue hover:underline">
          Website für Handwerker
        </Link>
        <Link href="/seo/google-unternehmensprofil" className="font-medium text-brand-blue hover:underline">
          Google-Unternehmensprofil optimieren
        </Link>
        <Link href="/webseiten/kfz-werkstatt" className="font-medium text-brand-blue hover:underline">
          Webseite für Kfz-Werkstätten
        </Link>
        <Link href="/webseiten/gebaeudereinigung" className="font-medium text-brand-blue hover:underline">
          Webseite für Gebäudereinigung
        </Link>
        <Link href="/seo" className="font-medium text-brand-blue hover:underline">
          SEO Agentur Bielefeld
        </Link>
      </div>
    </section>
  );
}

export default function SeoHandwerkerPage() {
  const [haupt, ...weitere] = ['motorenfachmann', 'af-gebaeudeservice', 'carhifi-herford']
    .map(findPortfolioProject)
    .filter((p): p is PortfolioProject => Boolean(p));
  return (
    <>
      <StructuredData />
      <Hero haupt={haupt} />
      <SuchArten />
      <Hebel />
      <Beispiel projekt={haupt} weitere={weitere} />
      <CheckBand
        title="Wie gut findet Google deinen Betrieb?"
        text="Gib deine Website ein und sieh in rund 30 Sekunden deine Note, deine Platzierungen und wer in der Karte vor dir steht. Kostenlos, ohne Anmeldung."
      />
      <Zeitplan />
      <PraxisBeleg
        eyebrow="Kein Handwerksbetrieb, aber dasselbe Prinzip"
        title="Was passiert, wenn Google einem Betrieb vertraut."
      />
      <SeoReviews />
      <FaqListe title="Das fragen uns Handwerker oft." faqs={faqs} />
      <Kontakt source="SEO-Seite Handwerker" />
      <WeitereSeiten />
    </>
  );
}
