import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { findPortfolioProject, type PortfolioProject } from '@/lib/portfolio';
import { BELEG_SCREENSHOTS } from '@/lib/seo-check/proof-data';
import { site } from '@/lib/site-config';
import Reveal from '@/components/marketing/Reveal';
import { FaqListe, Kontakt, ProjektKarten, Stars } from '../webseiten/sections';
import { CheckBand, PraxisBeleg, SeoReviews } from './sections';

/**
 * Leistungsseite SEO. Besitzt die Suchbegriffe „seo bielefeld“, „seo agentur
 * bielefeld“, „lokale seo agentur“ und „seo owl“ (Entscheidung 26.11.2026,
 * docs/SEO-PLAN-KOLAC.md). „seo paderborn“ hat eine eigene Seite unter
 * /seo/paderborn, weil dort Seiten mit Paderborn in Titel und Überschrift vorne
 * stehen. Webdesign-Begriffe gehören /webseiten, nicht dieser Seite.
 * Preise stehen bewusst nicht auf der Seite, nur im Gespräch.
 */

const PAGE_URL = `${site.baseUrl}/seo`;
const TITLE = 'SEO Agentur Bielefeld · Lokale SEO für OWL | Kolac Digital';
const DESCRIPTION =
  'SEO für Betriebe in Bielefeld und OWL: Google-Profil, Seiten für deine Suchbegriffe, Bewertungen und echte Zahlen jeden Monat. Start mit kostenlosem SEO-Check.';

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
    images: [{ url: `${site.baseUrl}${BELEG_SCREENSHOTS[0].src}`, alt: BELEG_SCREENSHOTS[0].alt }],
  },
};

const problems = [
  'Wer bei Google nach deiner Leistung sucht, sieht in der Karte zuerst drei andere Betriebe.',
  'Deine Website gibt es, aber sie steht erst auf Seite 3. Dort schaut niemand mehr hin.',
  'Die Konkurrenz hat viel mehr Google-Bewertungen, obwohl deine Arbeit nicht schlechter ist.',
  'Du hast schon mal für SEO bezahlt und nie erfahren, was eigentlich gemacht wurde.',
];

const leistungen = [
  {
    icon: '📍',
    title: 'Google-Unternehmensprofil',
    text: 'Wir richten dein Profil komplett ein: passende Kategorien, Leistungen mit Text, echte Fotos und regelmäßige Beiträge. Damit du in der Karte auftauchst, wenn jemand in deiner Nähe sucht.',
  },
  {
    icon: '🔎',
    title: 'Seiten für deine Suchbegriffe',
    text: 'Wir finden heraus, welche Wörter deine Kunden bei Google eintippen. Für die wichtigsten bekommt deine Website eigene Seiten oder Abschnitte, mit Ort, Leistung und Antworten auf echte Fragen.',
  },
  {
    icon: '🔗',
    title: 'Links und Verzeichnisse',
    text: 'Wir tragen deinen Betrieb in die passenden Verzeichnisse ein, überall mit denselben Firmendaten. Links von anderen Seiten zeigen Google, dass man dir vertrauen kann.',
  },
  {
    icon: '⭐',
    title: 'Mehr echte Bewertungen',
    text: 'Wir bauen dir einen einfachen Weg, wie zufriedene Kunden dich bewerten, zum Beispiel mit einem Aufsteller für die Theke. Gekaufte oder erfundene Bewertungen gibt es bei uns nicht.',
  },
  {
    icon: '⚡',
    title: 'Technik und Ladezeit',
    text: 'Wir prüfen, ob Google deine Seite sauber lesen kann: Titel, Überschriften, Ladezeit am Handy und strukturierte Daten. Was bremst, beheben wir oder sagen dir ehrlich, ob sich ein Neubau lohnt.',
  },
  {
    icon: '📊',
    title: 'Jeden Monat ein Bericht',
    text: 'In deinem eigenen Kundenportal siehst du echte Zahlen aus der Google Search Console: wie oft du angezeigt und angeklickt wurdest. Dazu jede Maßnahme, die wir umgesetzt haben, in einfacher Sprache.',
  },
];

const fundament = [
  'Startwerte messen und mit den drei stärksten Konkurrenten vergleichen',
  'Plan mit den zehn wichtigsten Suchbegriffen für deinen Betrieb',
  'Google-Unternehmensprofil komplett einrichten',
  'Website auf diese Suchbegriffe ausrichten',
  'Einträge in Verzeichnissen mit einheitlichen Firmendaten',
  'Messen, wie viele Anfragen über Google kommen',
];

const betreuung = [
  'Monatlicher Bericht im Kundenportal',
  'Website und Google-Profil laufend verbessern',
  'Beiträge im Google-Profil',
  'Suchbegriffe nachsteuern, wenn sich etwas ändert',
];

const steps = [
  {
    n: '01',
    title: 'Kostenloser SEO-Check',
    text: 'Du gibst deine Website ein und siehst in rund 30 Sekunden, wie gut Google dich findet und wo es hakt.',
  },
  {
    n: '02',
    title: 'Kurze Analyse und Gespräch',
    text: 'Wir schauen uns deine Suchbegriffe und die Konkurrenz an und besprechen das Ergebnis mit dir. Danach bekommst du ein festes Angebot.',
  },
  {
    n: '03',
    title: 'Fundament in vier Wochen',
    text: 'Google-Profil, Seiten, Verzeichnisse und Messung setzen wir für dich um. Du gibst nur Zugänge und Freigaben, rund eine Stunde im ersten Monat.',
  },
  {
    n: '04',
    title: 'Betreuung mit Zahlen',
    text: 'Ab dem zweiten Monat verbessern wir weiter und zeigen dir jeden Monat im Kundenportal, was sich bewegt hat.',
  },
];

const faqs = [
  {
    question: 'Was kostet SEO für meinen Betrieb?',
    answer:
      'Das hängt davon ab, wie viel zu tun ist: Gibt es schon ein Google-Profil, wie stark ist die Konkurrenz, passt die Website? Nach einer kurzen Analyse bekommst du ein festes Angebot mit allen Positionen. Einen Pauschalpreis ohne Blick auf deine Lage nennen wir nicht.',
  },
  {
    question: 'Wie schnell sehe ich Ergebnisse?',
    answer:
      'Das Fundament steht nach rund 30 Tagen, die ersten Zahlen siehst du dann im Kundenportal. Mehr Einblendungen bei Google kommen meist ab dem zweiten oder dritten Monat. Bei ganz neuen Websites dauert es oft länger, weil Google einer neuen Seite erst vertrauen muss.',
  },
  {
    question: 'Garantiert ihr mir Platz 1 bei Google?',
    answer:
      'Nein. Platzierungen kann niemand seriös garantieren, Google entscheidet selbst. Wir arbeiten an dem, was wir beeinflussen können, und machen es messbar: Einblendungen, Klicks und Anfragen siehst du jeden Monat schwarz auf weiß.',
  },
  {
    question: 'Was ist lokale SEO?',
    answer:
      'Lokale SEO heißt, dass dich Menschen aus deiner Gegend finden, wenn sie nach deiner Leistung suchen. Zum Beispiel „Kfz-Werkstatt Bielefeld“ oder „Reinigungsfirma in der Nähe“. Dafür zählen vor allem dein Google-Unternehmensprofil, Bewertungen, einheitliche Firmendaten und Seiten, die Leistung und Ort klar nennen.',
  },
  {
    question: 'Brauche ich dafür eine neue Website?',
    answer:
      'Nicht unbedingt. Oft reicht es, die bestehende Seite auszurichten und das Google-Profil aufzubauen. Ist die Seite technisch veraltet oder am Handy kaum nutzbar, sagen wir dir das ehrlich. Dann bauen wir sie auf Wunsch neu, ohne dass alte Adressen verloren gehen.',
  },
  {
    question: 'Woher weiß ich, dass ihr wirklich etwas macht?',
    answer:
      'Du bekommst einen Zugang zu deinem eigenen Kundenportal. Dort steht jede Maßnahme mit Datum, dazu die echten Zahlen aus der Google Search Console und ein Monatsbericht in einfacher Sprache. Kein Fachchinesisch, keine geschönten Diagramme.',
  },
  {
    question: 'Arbeitet ihr nur in Bielefeld?',
    answer:
      'Unser Büro ist in Bielefeld, die meisten SEO-Kunden kommen aus Ostwestfalen-Lippe, etwa aus Herford, Bünde, Lage oder Paderborn. Für Paderborn haben wir eine eigene Seite. Die Arbeit läuft genauso gut per Telefon und Video Call, auch für Betriebe außerhalb von OWL.',
  },
];

function StructuredData() {
  const service = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    serviceType: 'Suchmaschinenoptimierung',
    name: 'SEO für lokale Betriebe in Bielefeld und OWL',
    description: DESCRIPTION,
    url: PAGE_URL,
    provider: { '@id': `${site.baseUrl}/#business` },
    areaServed: [
      { '@type': 'City', name: 'Bielefeld' },
      { '@type': 'AdministrativeArea', name: 'Ostwestfalen-Lippe' },
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
      { '@type': 'ListItem', position: 2, name: 'SEO', item: PAGE_URL },
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
  const beleg = BELEG_SCREENSHOTS[0];
  return (
    <section className="relative overflow-hidden border-b border-gray-100 bg-linear-to-b from-white to-gray-50">
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-10 sm:px-6 sm:pt-16 lg:pb-24 lg:pt-24">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <Reveal>
            <p className="text-sm font-medium uppercase tracking-wider text-brand-blue">
              SEO Agentur Bielefeld
            </p>
            <h1 className="mt-3 text-4xl font-semibold leading-tight tracking-tight text-gray-900 sm:text-5xl">
              SEO für Bielefeld und OWL: Kunden finden dich, nicht die Konkurrenz.
            </h1>
            <p className="mt-5 max-w-xl text-base text-gray-600 sm:text-lg">
              Wir sorgen dafür, dass dein Betrieb bei Google auftaucht, wenn jemand in deiner Gegend
              nach deiner Leistung sucht. Das nennt man lokale SEO, also Suchmaschinenoptimierung für
              deinen Ort: in der Karte und in den normalen Ergebnissen. Was wir machen und was es
              bringt, siehst du jeden Monat mit echten Zahlen.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/seo-check" className="btn-primary px-5 py-3 text-base">
                Kostenlosen SEO-Check starten
              </Link>
              <a
                href={site.meetingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary px-5 py-3 text-base"
              >
                📅 Erstgespräch buchen
              </a>
            </div>
            <p className="mt-3 text-sm text-gray-600">
              Der Check zeigt dir in rund 30 Sekunden, wie gut Google deine Website findet.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-gray-600">
              <span className="flex items-center gap-1.5">
                <Stars />
                <strong className="text-gray-900">{site.rating.value.toFixed(1)}</strong> bei Google (
                {site.rating.count} Bewertungen)
              </span>
              <span>·</span>
              <span>Zahlen jeden Monat im Kundenportal</span>
              <span>·</span>
              <span>Kostenloses Gespräch</span>
            </div>
          </Reveal>

          <Reveal delay={150}>
            <figure className="relative">
              <div className="absolute inset-0 -z-10 rounded-4xl bg-linear-to-tr from-brand-blue/20 via-blue-100 to-white blur-2xl" />
              <div className="relative rounded-2xl border border-gray-100 bg-white p-3 shadow-xl">
                <Image
                  src={beleg.src}
                  alt={beleg.alt}
                  width={beleg.width}
                  height={beleg.height}
                  sizes="(min-width: 1024px) 560px, 100vw"
                  className="h-auto w-full rounded-xl"
                  priority
                />
              </div>
              <figcaption className="mt-3 text-sm text-gray-600">
                Google Search Console einer Praxis aus OWL, die wir betreuen. {beleg.caption}
              </figcaption>
            </figure>
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
        <p className="text-sm font-medium uppercase tracking-wider text-brand-blue">Das Problem</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
          Gute Arbeit, aber bei Google unsichtbar?
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
          Damit bist du nicht allein. Wir haben die Websites von 122 Betrieben aus OWL geprüft. Bei 48
          standen höchstens zwei ihrer wichtigen Suchbegriffe auf Seite 1 bei Google, bei 24 davon kein
          einziger. Wer dort sucht, findet die anderen und ruft dort an.{' '}
          <strong className="text-gray-900">
            Und der Betrieb merkt es nicht einmal, weil niemand die Anrufe zählt, die nie kommen.
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
          <p className="text-sm font-medium uppercase tracking-wider text-brand-blue">Was wir machen</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
            Sechs Hebel für deine lokale Sichtbarkeit.
          </h2>
          <p className="mt-3 text-base text-gray-600">
            Keine Geheimnisse und keine Tricks, die Google irgendwann bestraft. Wir setzen die Dinge um,
            die für lokale Suchen zählen, und erledigen das für dich.
          </p>
        </header>

        <Reveal delay={100}>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {leistungen.map((l) => (
              <article key={l.title} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xs">
                <div className="text-3xl" aria-hidden>
                  {l.icon}
                </div>
                <h3 className="mt-3 text-base font-semibold text-gray-900">{l.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">{l.text}</p>
              </article>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Angebot() {
  return (
    <section id="angebot" className="scroll-mt-24 bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <header className="max-w-2xl">
          <p className="text-sm font-medium uppercase tracking-wider text-brand-blue">Das Angebot</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
            Sichtbar in 90 Tagen.
          </h2>
          <p className="mt-3 text-base text-gray-600">
            Unser Paket für lokale Betriebe: In 90 Tagen von „online, aber unsichtbar“ zu „bei Google
            angezeigt, mit Zahlen, die du jeden Monat selbst siehst“. Wir setzen alles für dich um.
          </p>
        </header>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-brand-blue/30 bg-brand-blue/5 p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-brand-blue">Woche 1 bis 4</p>
            <h3 className="mt-1 text-lg font-semibold text-gray-900">Das Fundament</h3>
            <ul className="mt-4 space-y-2">
              {fundament.map((t) => (
                <li key={t} className="flex items-start gap-2 text-sm text-gray-700">
                  <span aria-hidden className="mt-0.5 text-brand-blue">
                    ✓
                  </span>
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Ab Monat 2</p>
            <h3 className="mt-1 text-lg font-semibold text-gray-900">Die Betreuung</h3>
            <ul className="mt-4 space-y-2">
              {betreuung.map((t) => (
                <li key={t} className="flex items-start gap-2 text-sm text-gray-700">
                  <span aria-hidden className="mt-0.5 text-gray-400">
                    ✓
                  </span>
                  {t}
                </li>
              ))}
            </ul>
            <p className="mt-5 text-sm leading-relaxed text-gray-600">
              Den Preis nennen wir dir nach einer kurzen Analyse deiner Lage, fest und schriftlich. Das
              Paket kommt mit doppelter Garantie. Was sie genau abdeckt, erklären wir dir im Gespräch.
            </p>
          </div>
        </div>

        <p className="mt-8 text-sm text-gray-600">
          Deine Website ist zu alt für gute Platzierungen?{' '}
          <Link
            href="/webseiten"
            className="font-medium text-brand-blue underline underline-offset-2 hover:opacity-80"
          >
            Webdesign aus Bielefeld
          </Link>{' '}
          mit sauberer Technik von Anfang an.
        </p>
      </div>
    </section>
  );
}

function Projekte() {
  const projekte = ['motorenfachmann', 'mc-autopflege', 'paderpuls']
    .map(findPortfolioProject)
    .filter((p): p is PortfolioProject => Boolean(p));
  return (
    <section id="projekte" className="scroll-mt-24 bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <header className="max-w-2xl">
          <p className="text-sm font-medium uppercase tracking-wider text-brand-blue">Weitere Projekte</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
            SEO bei Betrieben aus OWL.
          </h2>
          <p className="mt-3 text-base text-gray-600">
            Eine Werkstatt aus Lage, ein Autoaufbereiter aus Herford und ein Krankenfahrdienst aus
            Paderborn: drei Projekte, bei denen Sichtbarkeit bei Google im Mittelpunkt stand.
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
    <section className="bg-gray-50 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <header className="max-w-2xl">
          <p className="text-sm font-medium uppercase tracking-wider text-brand-blue">So läuft es ab</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
            Vier Schritte. Du weißt immer, wo wir stehen.
          </h2>
        </header>

        <ol className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((s) => (
            <li key={s.n} className="relative rounded-2xl border border-gray-100 bg-white p-6 shadow-xs">
              <span className="absolute -top-3 left-6 inline-flex items-center rounded-full bg-brand-blue px-3 py-1 text-xs font-semibold tracking-wider text-white">
                Schritt {s.n}
              </span>
              <h3 className="mt-4 text-lg font-semibold text-gray-900">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">{s.text}</p>
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
        <span>Außerdem bei uns:</span>
        <Link href="/seo/paderborn" className="font-medium text-brand-blue hover:underline">
          SEO Paderborn
        </Link>
        <Link href="/seo-check" className="font-medium text-brand-blue hover:underline">
          Kostenloser SEO-Check
        </Link>
        <Link href="/webseiten" className="font-medium text-brand-blue hover:underline">
          Webdesign
        </Link>
        <Link href="/software" className="font-medium text-brand-blue hover:underline">
          Software
        </Link>
      </div>
    </section>
  );
}

export default function SeoPage() {
  return (
    <>
      <StructuredData />
      <Hero />
      <Problems />
      <Leistungen />
      <PraxisBeleg eyebrow="Ergebnis aus der Praxis" title="So sieht es aus, wenn Google dich findet." />
      <Angebot />
      <CheckBand
        title="Erst mal schauen, wo du stehst?"
        text="Gib deine Website ein und sieh sofort, wie gut Google dich findet: Technik, Inhalte, Platzierungen und deine Lage in der Karte. Kostenlos, ohne Anmeldung."
      />
      <Projekte />
      <Ablauf />
      <SeoReviews />
      <FaqListe title="Das wirst du sicher wissen wollen." faqs={faqs} />
      <Kontakt source="SEO-Seite" />
      <WeitereSeiten />
    </>
  );
}
