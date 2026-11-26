import type { Metadata } from 'next';
import Link from 'next/link';
import { findPortfolioProject, type PortfolioProject } from '@/lib/portfolio';
import { site } from '@/lib/site-config';
import Reveal from '@/components/marketing/Reveal';
import { FaqListe, Kontakt, ProjektKarten, Stars } from '../../webseiten/sections';
import { CheckBand, PraxisBeleg, SeoReviews } from '../sections';

/**
 * Google-Unternehmensprofil optimieren (26.11.2026). Besitzt „google
 * unternehmensprofil optimieren“ (90, Schwierigkeit 3), „google my business
 * optimierung“ (90, 8), „google maps seo“ (110, 7), „google maps ranking
 * verbessern“ (50, 7) und „google unternehmensprofil optimieren lassen“.
 * Vorne standen Anleitungen kleiner Agenturen, darum oben die Checkliste
 * und danach das Angebot, es für dich zu machen.
 * Abgrenzung: „google bewertungen bekommen“ gehört dem Ratgeber
 * /blog/google-bewertungen-bekommen, hier nur ein Verweis.
 * Die Regeln stammen aus der Arbeit an Kundenprofilen (Skill
 * kundenwebsites-seo, references/google-profil.md).
 */

const PAGE_URL = `${site.baseUrl}/seo/google-unternehmensprofil`;
const TITLE = 'Google Unternehmensprofil optimieren lassen | Kolac Digital';
const DESCRIPTION =
  'Google Unternehmensprofil optimieren: Kategorie, Leistungen, Fotos und Bewertungen, damit du in Google Maps vorne stehst. Mit Checkliste und Umsetzung.';

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
        url: `${site.baseUrl}/images/portfolio/pader-automobilzentrum.webp`,
        alt: 'Website von Pader Automobilzentrum aus Paderborn, Google-Profil passend zur Website eingerichtet',
      },
    ],
  },
};

const kurzListe = [
  'Hauptkategorie so genau wie möglich',
  'Jede Leistung einzeln eingetragen',
  'Adresse oder Einzugsgebiet richtig gesetzt',
  'Echte Fotos statt Stockbilder',
  'Website-Link auf die passende Seite',
  'Alle 1 bis 2 Wochen ein Beitrag',
  'Bewertungen gleichmäßig und jede beantwortet',
  'Firmendaten überall gleich',
];

const checkliste = [
  {
    title: 'Hauptkategorie so genau wie möglich',
    text: 'Die Hauptkategorie entscheidet, bei welchen Suchen du überhaupt in Frage kommst. Nimm die genaueste, die es in Googles deutscher Liste gibt, also „Dachdecker“ statt einer allgemeinen Kategorie. Nebenkategorien nur für das, was du wirklich anbietest.',
  },
  {
    title: 'Jede Leistung einzeln, mit kurzer Beschreibung',
    text: 'Trag jede Leistung als eigenen Punkt ein und beschreib sie in einem Satz. Am besten mit denselben Worten wie auf deiner Website. Bei Pader Automobilzentrum sind es 28 Leistungstexte, passend zu den Seiten der Website.',
  },
  {
    title: 'Eine sachliche Beschreibung',
    text: 'Sag in wenigen Sätzen, was du machst, für wen und wo. Preise, Werbesprüche wie „jetzt kostenlos testen“, fremde Markennamen und Sonderzeichen lehnt Google gern ab. Sachlich kommt durch.',
  },
  {
    title: 'Adresse oder Einzugsgebiet',
    text: 'Kommen Kunden zu dir, zeig die Adresse. Arbeitest du nur beim Kunden, blendest du sie aus und gibst die Orte an, in die du fährst. Bestätigen musst du den Eintrag trotzdem mit einer echten Anschrift.',
  },
  {
    title: 'Öffnungszeiten, auch an Feiertagen',
    text: 'Nichts ärgert mehr als eine verschlossene Tür, obwohl Google „geöffnet“ zeigt. Sonderzeiten für Feiertage und Urlaub trägst du vorher ein.',
  },
  {
    title: 'Eine Telefonnummer, die direkt bei dir klingelt',
    text: 'Google erlaubt keine Weiterleitungsnummern, die nicht direkt zu deinem Betrieb durchstellen. Nimm die Nummer, unter der du wirklich erreichbar bist, und dieselbe wie auf der Website.',
  },
  {
    title: 'Website-Link auf die passende Seite',
    text: 'Der Link im Profil muss nicht zur Startseite führen. Hast du nur eine Hauptleistung, führt er besser auf die Seite dazu. Wichtig ist, dass dort dieselben Leistungen und derselbe Ort stehen wie im Profil.',
  },
  {
    title: 'Echte Fotos',
    text: 'Dein Team, deine Fahrzeuge, dein Laden, fertige Arbeiten. Echte Fotos schaffen Vertrauen und zeigen Google, dass der Betrieb lebt. Stockbilder bringen nichts.',
  },
  {
    title: 'Regelmäßige Beiträge',
    text: 'Alle ein bis zwei Wochen ein kurzer Beitrag: ein fertiges Projekt, eine neue Leistung, ein Vorher und Nachher. Das dauert fünf Minuten und hält das Profil frisch.',
  },
  {
    title: 'Bewertungen, gleichmäßig und beantwortet',
    text: 'Bitte zufriedene Kunden direkt nach dem Auftrag, lieber jede Woche eine Bewertung als zwanzig auf einmal. Viele Bewertungen in kurzer Zeit von Konten mit nur einer Bewertung können Googles Spamfilter auslösen. Beantworte jede Bewertung, auch die kritischen, sachlich und mit Namen des Betriebs.',
  },
  {
    title: 'Firmendaten überall gleich',
    text: 'Name, Adresse und Telefonnummer müssen auf der Website, im Profil und in Verzeichnissen wie Bing Places, Apple Business, 11880 oder Gelbe Seiten genau gleich lauten. Unterschiede verunsichern Google.',
  },
];

const fehler = [
  'Stadt oder Suchbegriffe in den Firmennamen geschrieben, obwohl sie nicht zum echten Namen gehören. Das verstößt gegen Googles Richtlinien, und bei solchen Namen werden auch harmlose Änderungen oft automatisch abgelehnt.',
  'Alles auf einmal geändert und eine Woche später wieder. Besser wenige, gebündelte Änderungen, dann 4 bis 6 Wochen warten und vergleichen.',
  'Eine Kategorie gewählt, die nicht passt oder rechtlich heikel ist. Ein Krankenfahrdienst ist zum Beispiel kein Taxi.',
  'Bewertungen von Freunden und Familie oder gegen Rabatt. Das ist nicht erlaubt und fällt Google oft auf.',
  'Am Standort steht noch der Eintrag eines früheren Betriebs. So war es bei Pader Automobilzentrum in Paderborn. Das muss geklärt sein, bevor dein eigenes Profil richtig wirken kann.',
];

const leistungen = [
  {
    title: 'Profil prüfen und vergleichen',
    text: 'Wir schauen, an welcher Stelle du in der Karte für deine wichtigsten Suchbegriffe stehst und was die drei Betriebe vor dir anders machen: Bewertungen, Fotos, Kategorien, Website.',
  },
  {
    title: 'Alle Texte fertig vorbereitet',
    text: 'Beschreibung, Leistungen, Kategorien und Einzugsgebiet, passend zu deiner Website und zu den Regeln von Google. Wir tragen alles ein oder geben es dir fertig zum Einfügen.',
  },
  {
    title: 'Website und Profil zusammenbringen',
    text: 'Dieselben Leistungen und Firmendaten auf der Website, in den strukturierten Daten für Google und im Profil. So kann Google beides eindeutig verbinden.',
  },
  {
    title: 'Ein Weg zu echten Bewertungen',
    text: 'Ein kurzer Link, ein QR-Code oder ein Aufsteller für die Theke, damit zufriedene Kunden dich in einer Minute bewerten. Antworten auf neue Bewertungen bereiten wir dir vor.',
  },
  {
    title: 'Beiträge und Pflege',
    text: 'Regelmäßige Beiträge, neue Fotos, Sonderöffnungszeiten. Das Profil bleibt aktuell, ohne dass du daran denken musst.',
  },
  {
    title: 'Zahlen jeden Monat',
    text: 'Im Kundenportal siehst du, wie oft du bei Google gezeigt und angeklickt wurdest, dazu jede Maßnahme mit Datum, in einfacher Sprache.',
  },
];

const faqs = [
  {
    question: 'Wie komme ich in Google Maps weiter nach oben?',
    answer:
      'Google sortiert die Karte nach drei Dingen: wie gut dein Profil zur Suche passt, wie weit du vom Suchenden entfernt bist und wie bekannt dein Betrieb ist. Die Entfernung kannst du nicht ändern. Passender wirst du mit der richtigen Kategorie, vollständigen Leistungen und einer Website, die dieselben Leistungen nennt. Bekannter mit echten Bewertungen, Fotos, Beiträgen und Einträgen in Verzeichnissen.',
  },
  {
    question: 'Ist das dasselbe wie Google My Business?',
    answer:
      'Ja. Google My Business hieß der Dienst bis 2021, seitdem heißt er Google Unternehmensprofil, auf Englisch Google Business Profile. Gemeint ist immer derselbe Eintrag in der Karte und rechts neben den Suchergebnissen.',
  },
  {
    question: 'Kostet das Google-Unternehmensprofil etwas?',
    answer:
      'Nein, der Eintrag selbst ist bei Google kostenlos. Vorsicht bei Anrufen oder Briefen, die dir einen kostenpflichtigen Google-Eintrag verkaufen wollen. Geld kostet nur die Arbeit, das Profil gut einzurichten und zu pflegen, wenn du sie abgibst.',
  },
  {
    question: 'Darf ich meine Stadt in den Firmennamen schreiben?',
    answer:
      'Nur, wenn sie wirklich zu deinem Firmennamen gehört, so wie er auf Schild und Briefkopf steht. Zusätze wie „Dachdecker Bielefeld günstig“ verstoßen gegen Googles Richtlinien und können zur Sperre führen. Den Ort zeigst du besser über Adresse, Einzugsgebiet und deine Website.',
  },
  {
    question: 'Ich arbeite nur beim Kunden. Muss meine Adresse sichtbar sein?',
    answer:
      'Nein. Als Betrieb mit Einzugsgebiet blendest du die Adresse aus und gibst an, in welchen Orten du arbeitest. Bestätigen musst du den Eintrag trotzdem mit einer echten Anschrift.',
  },
  {
    question: 'Wie bekomme ich mehr Google-Bewertungen?',
    answer:
      'Frag zufriedene Kunden direkt nach dem Auftrag, am besten mit einem kurzen Link oder QR-Code. Gleichmäßig über das Jahr statt viele auf einmal. Rabatte oder Geschenke für Bewertungen sind nicht erlaubt. Ein ganzes System dafür steht in unserem Ratgeber zu Google-Bewertungen.',
  },
  {
    question: 'Wie lange dauert es, bis sich etwas tut?',
    answer:
      'Neue Angaben sind oft nach wenigen Tagen sichtbar. Ob sie deine Position in der Karte verbessern, siehst du meist nach 4 bis 6 Wochen. Darum ändern wir gebündelt und vergleichen erst danach, statt jede Woche etwas umzubauen.',
  },
  {
    question: 'Bleibt das Profil meins, wenn ihr es betreut?',
    answer:
      'Ja. Das Profil läuft auf deinen Namen. Für die Arbeit reicht uns ein Zugang als Verwalter, den du jederzeit selbst wieder entfernen kannst.',
  },
  {
    question: 'Macht ihr das auch ohne neue Website?',
    answer:
      'Ja. Das Profil wirkt aber am besten zusammen mit einer Website, die dieselben Leistungen und Orte nennt. Ob deine Seite dafür reicht, zeigt der kostenlose SEO-Check. Den Preis nennen wir dir nach einem kurzen Blick auf deine Lage, fest und schriftlich.',
  },
];

function StructuredData() {
  const service = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    serviceType: 'Optimierung des Google-Unternehmensprofils',
    name: 'Google Unternehmensprofil optimieren',
    description: DESCRIPTION,
    url: PAGE_URL,
    provider: { '@id': `${site.baseUrl}/#business` },
    areaServed: { '@type': 'Country', name: 'Deutschland' },
  };
  const howTo = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Checkliste: Google Unternehmensprofil optimieren',
    itemListElement: checkliste.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.title })),
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
      { '@type': 'ListItem', position: 3, name: 'Google-Unternehmensprofil', item: PAGE_URL },
    ],
  };
  return (
    <>
      {[service, howTo, faq, breadcrumb].map((data) => (
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
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-10 sm:px-6 sm:pt-16 lg:pb-24 lg:pt-20">
        <nav aria-label="Brotkrumen" className="text-sm text-gray-500">
          <Link href="/seo" className="hover:text-brand-blue">
            SEO
          </Link>
          <span aria-hidden className="mx-2">
            ›
          </span>
          <span className="text-gray-700">Google-Unternehmensprofil</span>
        </nav>

        <div className="mt-6 grid items-center gap-12 lg:grid-cols-2">
          <Reveal>
            <p className="text-sm font-medium uppercase tracking-wider text-brand-blue">
              Google-Unternehmensprofil
            </p>
            <h1 className="mt-3 text-4xl font-semibold leading-tight tracking-tight text-gray-900 sm:text-5xl">
              Google Unternehmensprofil optimieren: damit dich Kunden in der Karte zuerst sehen.
            </h1>
            <p className="mt-5 max-w-xl text-base text-gray-600 sm:text-lg">
              Dein Google-Unternehmensprofil, früher Google My Business, ist der Eintrag in Google Maps
              und rechts neben den Suchergebnissen. Optimieren heißt: die genaueste Kategorie, alle
              Leistungen einzeln, echte Fotos, regelmäßige Beiträge und Bewertungen, auf die du antwortest.
              Google sortiert die Karte nach Relevanz, also wie gut du zur Suche passt, nach Entfernung
              und nach Bekanntheit. Auf zwei davon hast du Einfluss, und genau daran arbeiten wir.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/seo-check" className="btn-primary px-5 py-3 text-base">
                Kostenlosen SEO-Check starten
              </Link>
              <a href="#checkliste" className="btn-secondary px-5 py-3 text-base">
                Zur Checkliste
              </a>
            </div>
            <p className="mt-3 text-sm text-gray-600">
              Der Check zeigt dir auch, wer in der Karte vor dir steht. Oder{' '}
              <a
                href={site.meetingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-brand-blue underline underline-offset-2 hover:opacity-80"
              >
                direkt ein Erstgespräch buchen
              </a>
              .
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-gray-600">
              <span className="flex items-center gap-1.5">
                <Stars />
                <strong className="text-gray-900">{site.rating.value.toFixed(1)}</strong> bei Google (
                {site.rating.count} Bewertungen)
              </span>
              <span>·</span>
              <span>Für Betriebe in ganz Deutschland</span>
            </div>
          </Reveal>

          <Reveal delay={150}>
            <div className="relative">
              <div className="absolute inset-0 -z-10 rounded-4xl bg-linear-to-tr from-brand-blue/20 via-blue-100 to-white blur-2xl" />
              <div className="relative rounded-2xl border border-gray-100 bg-white p-6 shadow-xl sm:p-8">
                <p className="text-sm font-semibold text-gray-900">Die Checkliste in Kürze</p>
                <ul className="mt-4 space-y-3">
                  {kurzListe.map((k) => (
                    <li key={k} className="flex items-start gap-3 text-sm text-gray-700">
                      <span
                        aria-hidden
                        className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-blue/10 text-xs font-bold text-brand-blue"
                      >
                        ✓
                      </span>
                      {k}
                    </li>
                  ))}
                </ul>
                <p className="mt-5 text-sm text-gray-600">
                  Jeder Punkt ist unten erklärt, mit dem, was Google erlaubt und was nicht.
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function Checkliste() {
  return (
    <section id="checkliste" className="scroll-mt-24 bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <p className="text-sm font-medium uppercase tracking-wider text-brand-blue">Checkliste</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
          So optimierst du dein Google-Unternehmensprofil.
        </h2>
        <p className="mt-4 text-base leading-relaxed text-gray-700">
          Elf Punkte, die wir bei jedem Profil prüfen. Du kannst sie selbst abhaken oder uns machen
          lassen.
        </p>
        <ol className="mt-8 space-y-4">
          {checkliste.map((c, i) => (
            <li key={c.title} className="flex gap-4 rounded-2xl border border-gray-100 bg-gray-50 p-5">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-blue text-sm font-semibold text-white">
                {i + 1}
              </span>
              <div>
                <h3 className="text-base font-semibold text-gray-900">{c.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-gray-600">{c.text}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-8 text-base leading-relaxed text-gray-700">
          Mehr zu Punkt 10 steht in unserem Ratgeber{' '}
          <Link
            href="/blog/google-bewertungen-bekommen"
            className="font-medium text-brand-blue underline underline-offset-2 hover:opacity-80"
          >
            Google-Bewertungen bekommen, ohne zu betteln
          </Link>
          .
        </p>
      </div>
    </section>
  );
}

function Fehler() {
  return (
    <section className="bg-gray-50 py-16 sm:py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <p className="text-sm font-medium uppercase tracking-wider text-brand-blue">Aus der Praxis</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
          Fehler, die wir oft sehen.
        </h2>
        <ul className="mt-8 space-y-3">
          {fehler.map((f) => (
            <li
              key={f}
              className="flex items-start gap-3 rounded-xl border border-gray-100 bg-white px-5 py-4 text-base text-gray-700"
            >
              <span
                aria-hidden
                className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-200 text-xs text-gray-500"
              >
                ×
              </span>
              {f}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Leistungen() {
  return (
    <section className="bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <header className="max-w-2xl">
          <p className="text-sm font-medium uppercase tracking-wider text-brand-blue">Was wir übernehmen</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
            Lieber machen lassen? Das übernehmen wir.
          </h2>
          <p className="mt-3 text-base text-gray-600">
            Das Profil ist Teil unseres SEO-Pakets für lokale Betriebe. Du gibst Zugänge und Freigaben, den
            Rest erledigen wir.
          </p>
        </header>
        <Reveal delay={100}>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {leistungen.map((l) => (
              <article key={l.title} className="rounded-2xl border border-gray-100 bg-gray-50 p-6">
                <h3 className="text-base font-semibold text-gray-900">{l.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">{l.text}</p>
              </article>
            ))}
          </div>
        </Reveal>
        <p className="mt-8 text-sm text-gray-600">
          Alles, was zu lokaler SEO dazugehört, steht auf unserer Seite{' '}
          <Link href="/seo" className="font-medium text-brand-blue underline underline-offset-2 hover:opacity-80">
            SEO Agentur Bielefeld
          </Link>
          . Für Handwerksbetriebe gibt es eine eigene Seite:{' '}
          <Link
            href="/seo/handwerker"
            className="font-medium text-brand-blue underline underline-offset-2 hover:opacity-80"
          >
            SEO für Handwerker
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
            Zwei Profile, die wir aufgesetzt haben.
          </h2>
          <p className="mt-3 text-base text-gray-600">
            Pader Automobilzentrum ist eine Neugründung in Paderborn: Das Profil haben wir mit
            Beschreibung, Öffnungszeiten, Einzugsgebiet und 28 Leistungstexten passend zur Website
            angelegt. Bei AF-Gebäudeservice war das Profil lieblos gepflegt und Anfragen kamen nur per
            Telefon. Heute ist es professionell eingerichtet, und Anfragen kommen auch online.
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
        <Link href="/seo/handwerker" className="font-medium text-brand-blue hover:underline">
          SEO für Handwerker
        </Link>
        <Link href="/seo/paderborn" className="font-medium text-brand-blue hover:underline">
          SEO Paderborn
        </Link>
        <Link href="/seo-check" className="font-medium text-brand-blue hover:underline">
          Kostenloser SEO-Check
        </Link>
      </div>
    </section>
  );
}

export default function GoogleUnternehmensprofilPage() {
  const projekte = ['pader-automobilzentrum', 'af-gebaeudeservice']
    .map(findPortfolioProject)
    .filter((p): p is PortfolioProject => Boolean(p));
  return (
    <>
      <StructuredData />
      <Hero />
      <Checkliste />
      <Fehler />
      <Leistungen />
      <CheckBand
        title="Wo stehst du in der Karte?"
        text="Der kostenlose SEO-Check zeigt dir in rund 30 Sekunden deine Note, deine Platzierungen und welche Betriebe in Google Maps vor dir stehen. Ohne Anmeldung."
      />
      <Projekte projekte={projekte} />
      <PraxisBeleg eyebrow="Ergebnis aus der Praxis" title="Profil, Website und Bewertungen zusammen." />
      <SeoReviews />
      <FaqListe title="Häufige Fragen zum Google-Unternehmensprofil" faqs={faqs} />
      <Kontakt source="SEO-Seite Google-Unternehmensprofil" />
      <WeitereSeiten />
    </>
  );
}
