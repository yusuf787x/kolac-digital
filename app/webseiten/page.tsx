import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { branchenSeiten } from '@/lib/branchen-seiten';
import { staedteSeiten } from '@/lib/staedte-seiten';
import {
  bausteinAddOn,
  faqs,
  includedBonuses,
  industries,
  packages,
  references,
  reviewHighlights,
  serviceAreas,
  site,
} from '@/lib/site-config';
import Reveal from '@/components/marketing/Reveal';
import {
  About,
  Kontakt,
  Leistungen,
  Process,
  Reviews,
  Stars,
} from './sections';

export const metadata: Metadata = {
  title:
    'Webdesign Bielefeld · Webagentur für Webseiten mit System | Kolac Digital',
  description:
    'Webdesign aus Bielefeld: Wir bauen deine Website mit System. Vorne SEO-stark bei Google. Hinten ein Backend für Anfragen, Termine, Angebote und Rechnungen. Individuell auf deinen Betrieb zugeschnitten. Für KMU in OWL, NRW und ganz Deutschland.',
  alternates: {
    canonical: `${site.baseUrl}/webseiten`,
  },
  openGraph: {
    type: 'website',
    locale: 'de_DE',
    url: `${site.baseUrl}/webseiten`,
    title:
      'Webdesign Bielefeld · Webagentur für Webseiten mit System | Kolac Digital',
    description:
      'Webseite mit System aus Bielefeld. Vorne SEO-stark, hinten ein Backend für Anfragen, Termine, Angebote und Rechnungen. Individuell auf deinen Betrieb zugeschnitten.',
    siteName: 'Kolac Digital',
    images: [
      {
        url: '/images/bacara-website.webp',
        width: 1200,
        height: 630,
        alt: 'Webagentur Kolac Digital aus Bielefeld baut individuelle Webseiten mit System',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title:
      'Webdesign Bielefeld · Webagentur für Webseiten mit System | Kolac Digital',
    description:
      'Individuelle Webseite mit Backend. Anfragen, Termine, Angebote, Berichte. Aus Bielefeld für KMU in OWL, NRW und ganz Deutschland.',
    images: ['/images/bacara-website.webp'],
  },
  keywords: [
    'Webagentur Bielefeld',
    'Webseite erstellen Bielefeld',
    'Webseite mit System',
    'Webseite mit Backend',
    'individuelle Webseite',
    'Webdesign Bielefeld',
    'Webentwicklung Bielefeld',
    'Homepage erstellen Bielefeld',
    'Internetagentur Bielefeld',
    'Digitalagentur Bielefeld',
    'Webagentur OWL',
    'Webagentur Nordrhein-Westfalen',
    'Webagentur Deutschland',
    'Webseite mit Terminbuchung',
    'Webseite mit Buchungssystem',
    'Webseite mit Kundenverwaltung',
    'Webseite für Handwerker',
    'Webseite für Restaurants',
    'Webseite für Praxen',
    'Webseite für Dienstleister',
    'Webseite für Coaches',
    'Webseite für Friseure',
    'Onlineshop erstellen OWL',
    'Custom Webentwicklung',
    'maßgeschneiderte Webseite',
    'Webdesign Herford',
    'Webdesign Gütersloh',
    'Webdesign Paderborn',
    'Webagentur Minden',
    'Webagentur Münster',
    'Webagentur Osnabrück',
    'KI Suchmaschinen Optimierung',
    'GEO Optimierung',
    'Webseite ChatGPT findbar',
  ],
};

// =====================================================================
// JSON-LD Strukturierte Daten
// =====================================================================

function StructuredData() {
  const pageUrl = `${site.baseUrl}/webseiten`;

  const localBusiness = {
    '@context': 'https://schema.org',
    '@type': 'ProfessionalService',
    '@id': `${site.baseUrl}/#business`,
    name: site.name,
    url: site.baseUrl,
    telephone: site.phone,
    email: site.email,
    image: `${site.baseUrl}/images/Logo Lang Schwarz.png`,
    priceRange: '€€',
    address: {
      '@type': 'PostalAddress',
      streetAddress: site.street,
      postalCode: site.zip,
      addressLocality: site.city,
      addressRegion: site.region,
      addressCountry: 'DE',
    },
    areaServed: serviceAreas.map((a) => ({
      '@type': 'AdministrativeArea',
      name: a,
    })),
    founder: { '@type': 'Person', name: site.founder },
    sameAs: [site.googleReviewsUrl],
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: site.rating.value,
      reviewCount: site.rating.count,
      bestRating: 5,
      worstRating: 1,
    },
    review: reviewHighlights.map((r) => ({
      '@type': 'Review',
      author: { '@type': 'Person', name: r.author },
      reviewRating: {
        '@type': 'Rating',
        ratingValue: r.rating,
        bestRating: 5,
      },
      reviewBody: r.text,
    })),
  };

  const allOffers = [
    ...packages.map((p) => ({
      name: p.name,
      description: p.description,
    })),
    {
      name: bausteinAddOn.name,
      description: bausteinAddOn.description,
    },
  ];

  const service = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    serviceType: 'Webdesign',
    provider: { '@id': `${site.baseUrl}/#business` },
    areaServed: serviceAreas,
    description:
      'Individuelle Webseiten mit System. Inklusive professioneller Fotos, Google-NFC-Tag, SEO und KI-Suchmaschinen-Optimierung.',
    // Bewusst ohne Preisangaben: das Angebot wird individuell
    // kalkuliert, eine Zahl im Schema waere irrefuehrend.
    offers: allOffers.map((o) => ({
      '@type': 'Offer',
      name: o.name,
      description: o.description,
      availability: 'https://schema.org/InStock',
      url: `${pageUrl}#preise`,
    })),
  };

  const faqSchema = {
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
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Startseite',
        item: site.baseUrl,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Webseiten',
        item: pageUrl,
      },
    ],
  };

  const howTo = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: 'So bauen wir deine Webseite mit System',
    description:
      'In drei Schritten von der ersten Anfrage zur fertigen Webseite mit individuellem Backend.',
    totalTime: 'P7D',
    step: [
      {
        '@type': 'HowToStep',
        position: 1,
        name: 'Kostenloses Erstgespräch',
        text: 'Du erzählst uns, woran du arbeitest und was dich im Alltag bremst. Wir sagen dir, wie ein System aussehen kann, das wirklich zu deinem Betrieb passt.',
        url: `${pageUrl}#kontakt`,
      },
      {
        '@type': 'HowToStep',
        position: 2,
        name: 'Individueller Entwurf',
        text: 'Nach wenigen Tagen siehst du, wie deine Webseite aussehen wird. Du sagst uns, was bleiben soll und was wir anpassen.',
      },
      {
        '@type': 'HowToStep',
        position: 3,
        name: 'Live-Gang in einer Woche',
        text: 'Sobald alles passt, geht deine Seite mit System online. In der Regel eine Woche nach dem ersten Gespräch. Hosting, Wartung und kleine Änderungen laufen weiter.',
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusiness) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(service) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howTo) }}
      />
    </>
  );
}

// =====================================================================
// Hilfs-Komponenten
// =====================================================================

function ArrowIcon() {
  return (
    <svg
      className="h-4 w-4 text-brand-blue"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

// =====================================================================
// Sections
// =====================================================================

function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-gray-100 bg-linear-to-b from-white to-gray-50">
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-10 sm:px-6 sm:pt-16 lg:pb-24 lg:pt-24">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-700 shadow-xs">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
              Aktuell {site.freeSlots} freie Plätze für neue Projekte
            </span>
            <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
              Webdesign aus {site.city}. Webseiten mit System, die für dein
              Geschäft arbeiten.
            </h1>
            <p className="mt-5 max-w-xl text-base text-gray-600 sm:text-lg">
              Du bekommst keine Vorlage von der Stange. Du bekommst eine
              Webseite, die dir Anfragen reinholt, Termine sortiert und dir
              Arbeit abnimmt. In der Regel eine Woche vom ersten Gespräch bis
              live. Für Firmen in OWL, Nordrhein-Westfalen und ganz
              Deutschland.
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
              <a href="#preise" className="btn-secondary px-5 py-3 text-base">
                Preise ansehen
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
                  src="/images/bacara-website.webp"
                  alt="Beispiel einer Webseite mit System von Kolac Digital aus Bielefeld"
                  width={900}
                  height={620}
                  className="rounded-xl"
                  priority
                />
              </div>

              {/* Schwebendes Browser-Mockup als Webseiten-Symbol — nur Desktop */}
              <div
                className="pointer-events-none absolute -bottom-12 -left-12 z-10 hidden w-56 drop-shadow-2xl animate-float-slow lg:block lg:w-64"
                aria-hidden
              >
                <Image
                  src="/images/svg-elements/browser-mockup.svg"
                  alt=""
                  width={264}
                  height={165}
                  className="h-auto w-full"
                />
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function PainSolution() {
  const painPoints = [
    'Bei Google findet dich kaum jemand, die Konkurrenz steht vorne',
    'Die Website ist veraltet und sieht am Handy schlecht aus',
    'Interessenten rufen an, statt online anzufragen, oder gar nicht',
    'Die Seite aus dem Baukasten sieht aus wie bei allen anderen',
    'Änderungen dauern ewig, weil sich niemand richtig kümmert',
  ];

  const solutionPoints = [
    'Bei Google für die Suchbegriffe gefunden, die Kunden wirklich nutzen',
    'Modernes Webdesign, das am Handy genauso überzeugt wie am PC',
    'Anfragen kommen sortiert online rein, auch nach Feierabend',
    'Ein Auftritt, der zeigt, was deinen Betrieb besonders macht',
    'Hosting, Wartung und Änderungen laufen über uns',
  ];

  return (
    <section className="bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal>
        <header className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-medium uppercase tracking-wider text-brand-blue">
            Das Problem
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
            Kennst du das?
          </h2>
          <p className="mt-4 text-base leading-relaxed text-gray-600 sm:text-lg">
            Dein Geschäft läuft gut. Du bist gut in dem, was du tust. Aber
            online sieht man davon wenig. Die Website ist in die Jahre
            gekommen, bei Google stehen andere vor dir, und wer dich findet,
            ruft lieber woanders an.
          </p>
        </header>
        </Reveal>

        <Reveal delay={120}>
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {/* Vorher */}
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6 sm:p-8">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-gray-200 px-3 py-1 text-xs font-bold uppercase tracking-wider text-gray-700">
                Vorher
              </span>
              <span className="text-sm text-gray-500">Die alte Website</span>
            </div>
            <h3 className="mt-4 text-xl font-semibold text-gray-900">
              So sieht es bei vielen Betrieben aus.
            </h3>
            <ul className="mt-5 space-y-3">
              {painPoints.map((p) => (
                <li key={p} className="flex items-start gap-3">
                  <span
                    aria-hidden
                    className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-gray-200 text-xs font-bold text-gray-600"
                  >
                    ×
                  </span>
                  <span className="text-sm text-gray-700">{p}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Mit System */}
          <div className="rounded-2xl border-2 border-brand-blue/40 bg-linear-to-br from-brand-blue/5 to-white p-6 shadow-xs sm:p-8">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-brand-blue px-3 py-1 text-xs font-bold uppercase tracking-wider text-white">
                Nachher
              </span>
              <span className="text-sm font-medium text-brand-blue">
                Webdesign von uns
              </span>
            </div>
            <h3 className="mt-4 text-xl font-semibold text-gray-900">
              So sieht es aus, wenn deine Website für dich arbeitet.
            </h3>
            <ul className="mt-5 space-y-3">
              {solutionPoints.map((s) => (
                <li key={s} className="flex items-start gap-3">
                  <span
                    aria-hidden
                    className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-blue text-xs font-bold text-white"
                  >
                    ✓
                  </span>
                  <span className="text-sm text-gray-800">{s}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        </Reveal>

        {/* Brücke zur Lösung */}
        <Reveal delay={200}>
          <div className="mx-auto mt-10 max-w-3xl text-center">
            <p className="text-base leading-relaxed text-gray-700">
              Und wenn du mehr willst als ein Schaufenster, bekommt deine
              Website ein System dahinter: Terminbuchung, Anfragen im
              Dashboard, Angebote und Rechnungen.{' '}
              <strong className="text-gray-900">
                Webseite mit System, zugeschnitten auf deinen Betrieb.
              </strong>{' '}
              Brauchst du eine komplett eigene Software, findest du das unter{' '}
              <Link
                href="/software"
                className="font-medium text-brand-blue underline underline-offset-2 hover:opacity-80"
              >
                individuelle Software
              </Link>
              .
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function TrustStrip() {
  return (
    <section className="border-b border-gray-100 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-6 text-sm text-gray-600 sm:px-6">
        <span className="flex items-center gap-2">
          <span aria-hidden>🇩🇪</span> Wir arbeiten für Firmen in OWL, NRW und
          deutschlandweit
        </span>
        <span className="flex items-center gap-2">
          <span aria-hidden>⚡</span> In der Regel eine Woche von Erstgespräch
          bis live
        </span>
        <span className="flex items-center gap-2">
          <span aria-hidden>🤝</span> Du sprichst direkt mit dem Inhaber
        </span>
      </div>
    </section>
  );
}

function Benefits() {
  const items = [
    {
      icon: '📞',
      title: 'Du bekommst mehr Anrufe',
      text: 'Eine gute Webseite zeigt nicht nur was du machst. Sie holt dir Kunden direkt aufs Handy.',
    },
    {
      icon: '⏱️',
      title: 'Du sparst Zeit im Alltag',
      text: 'Termine, Anfragen, Formulare. Alles läuft automatisch in dein System. Du musst nichts mehr von Hand erfassen.',
    },
    {
      icon: '✨',
      title: 'Du wirkst sofort professionell',
      text: 'Eine moderne Webseite macht dich greifbar. Kunden sehen dich auf einen Blick und vertrauen dir.',
    },
  ];

  return (
    <section className="bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <header className="max-w-2xl">
          <p className="text-sm font-medium uppercase tracking-wider text-brand-blue">
            Was bringt dir das?
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
            Eine Website, die wirklich arbeitet.
          </h2>
        </header>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {items.map((it) => (
            <div
              key={it.title}
              className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xs transition-shadow hover:shadow-md"
            >
              <div className="text-3xl">{it.icon}</div>
              <h3 className="mt-3 text-lg font-semibold text-gray-900">
                {it.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">
                {it.text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ReferenceCard({
  r,
}: {
  r: (typeof references)[number];
}) {
  const linkIcons = {
    website: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <circle cx="12" cy="12" r="10" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
    ),
    shop: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <path d="M16 10a4 4 0 0 1-8 0" />
      </svg>
    ),
    instagram: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
      </svg>
    ),
    tiktok: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V9.05a8.15 8.15 0 0 0 4.77 1.52V7.12a4.85 4.85 0 0 1-1-.43z" />
      </svg>
    ),
    app: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
        <line x1="12" y1="18" x2="12.01" y2="18" />
      </svg>
    ),
  };

  const showPhone = r.mockupType === 'both' && r.mockupImagePhone;

  return (
    <article className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xs transition-shadow hover:shadow-md sm:p-7">
      <div className="relative">
        <a
          href={r.link ?? '#'}
          target={r.link ? '_blank' : undefined}
          rel="noopener noreferrer"
          className="block overflow-hidden rounded-xl bg-gray-100"
          aria-label={`${r.company} Webseite ansehen`}
        >
          <div className="bg-gray-200 px-3 py-2">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-400" />
            <span className="ml-1.5 inline-block h-2.5 w-2.5 rounded-full bg-yellow-400" />
            <span className="ml-1.5 inline-block h-2.5 w-2.5 rounded-full bg-green-400" />
          </div>
          <div className="relative aspect-16/10 w-full">
            <Image
              src={r.mockupImage}
              alt={`Webseite von ${r.company}`}
              fill
              sizes="(min-width: 768px) 50vw, 100vw"
              className="object-cover"
            />
          </div>
        </a>

        {showPhone && (
          <a
            href={r.socialLink ?? r.link ?? '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute -right-2 bottom-[-8px] aspect-9/19 w-[26%] max-w-[120px] overflow-hidden rounded-[1.4rem] border-[3px] border-gray-900 bg-gray-900 shadow-xl"
            aria-label={`${r.company} Social Media ansehen`}
          >
            <Image
              src={r.mockupImagePhone!}
              alt={`${r.company} Social Media`}
              fill
              sizes="120px"
              className="object-cover"
            />
          </a>
        )}
      </div>

      <div className="mt-6">
        <span className="inline-flex items-center rounded-full bg-brand-blue/10 px-3 py-1 text-xs font-semibold text-brand-blue">
          {r.tag}
        </span>
        <h3 className="mt-3 text-2xl font-semibold text-gray-900">
          {r.company}
        </h3>

        <ul className="mt-4 space-y-2">
          {r.services.map((s) => (
            <li key={s} className="flex items-start gap-2 text-sm text-gray-700">
              <span className="mt-1 shrink-0 text-brand-blue">
                <ArrowIcon />
              </span>
              <span>{s}</span>
            </li>
          ))}
        </ul>

        <div className="mt-5 rounded-lg border-l-[3px] border-brand-blue bg-brand-blue/5 p-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-brand-blue">
            Key Win
          </p>
          <p className="mt-1 text-sm font-medium text-gray-900">{r.keyWin}</p>
        </div>

        {r.caseStudyUrl ? (
          // Wenn eine Case Study existiert: nur DIESER eine Button.
          // Website- und Social-Links entfallen bewusst — der volle Text
          // dazu steht in der Case Study drin, und die Karte bleibt
          // fokussiert auf "hier klicken um mehr zu erfahren".
          <div className="mt-5">
            <a
              href={r.caseStudyUrl}
              className="inline-flex items-center gap-1.5 rounded-full bg-brand-blue px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-blue-hover"
            >
              <span aria-hidden>📖</span>
              Case Study ansehen
              <span
                aria-hidden
                className="transition-transform group-hover:translate-x-0.5"
              >
                →
              </span>
            </a>
          </div>
        ) : (
          (r.link || r.socialLink) && (
            <div className="mt-5 flex flex-wrap gap-2">
              {r.link && (
                <a
                  href={r.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full bg-brand-blue px-4 py-2 text-sm font-medium text-white hover:bg-brand-blue-hover"
                >
                  {linkIcons[r.linkIcon ?? 'website']}
                  {r.linkText ?? 'Website ansehen'}
                </a>
              )}
              {r.socialLink && (
                <a
                  href={r.socialLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium text-white ${
                    r.socialIcon === 'instagram'
                      ? 'bg-linear-to-tr from-yellow-500 via-pink-500 to-purple-600'
                      : 'bg-black'
                  }`}
                >
                  {linkIcons[r.socialIcon ?? 'instagram']}
                  {r.socialLinkText ?? 'Profil ansehen'}
                </a>
              )}
            </div>
          )
        )}
      </div>
    </article>
  );
}

function References() {
  return (
    <section id="referenzen" className="bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <header className="max-w-2xl">
          <p className="text-sm font-medium uppercase tracking-wider text-brand-blue">
            Referenzen
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
            Sieh dir an was wir gemacht haben.
          </h2>
          <p className="mt-3 text-base text-gray-600">
            Echte Projekte für echte Firmen. Klick rein und schau dir die
            Live-Seiten an.
          </p>
        </header>

        <div className="mt-10 grid gap-8 lg:grid-cols-2">
          {references.map((r) => (
            <ReferenceCard key={r.company} r={r} />
          ))}
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  return (
    <section id="preise" className="bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <header className="max-w-2xl">
          <p className="text-sm font-medium uppercase tracking-wider text-brand-blue">
            Preise
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
            Faire Preise. Keine Überraschungen.
          </h2>
          <p className="mt-3 text-base text-gray-600">
            Du siehst hier ab welchem Preis es losgeht. Den genauen Preis
            für dein Projekt sagen wir dir nach dem ersten Gespräch.
            Fotoshooting, NFC Tag und SEO sind in jedem Paket schon mit
            drin.
          </p>
        </header>

        {/* Scarcity-Hinweis – dezent, mit Reason Why (Hormozi) */}
        <div className="mx-auto mt-8 max-w-3xl rounded-2xl border border-gray-200 bg-gray-50 p-5 text-sm text-gray-700 sm:text-center">
          <p>
            <strong className="text-gray-900">
              Aktuell {site.freeSlots} freie Plätze.
            </strong>{' '}
            Wir nehmen bewusst nur eine begrenzte Anzahl Projekte gleichzeitig
            an. Damit jeder Kunde die volle Aufmerksamkeit bekommt und du
            nicht in einer Warteschlange landest.
          </p>
        </div>

        {/* Haupt-Pakete: 2 Karten */}
        <Reveal delay={100}>
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {packages.map((p) => (
            <div
              key={p.id}
              className={`relative flex flex-col rounded-2xl border bg-white p-6 shadow-xs ${
                p.highlight
                  ? 'border-brand-blue ring-2 ring-brand-blue/20'
                  : 'border-gray-100'
              }`}
            >
              {p.badge && (
                <span className="absolute -top-3 left-6 inline-flex items-center rounded-full bg-brand-blue px-3 py-1 text-xs font-semibold tracking-wider text-white">
                  {p.badge}
                </span>
              )}
              <h3 className="text-lg font-semibold text-gray-900">{p.name}</h3>
              <div className="mt-3">
                <span className="text-xl font-semibold text-gray-900">
                  {p.priceMain}
                </span>
              </div>
              {p.priceSub && (
                <p className="mt-0.5 text-sm text-gray-500">{p.priceSub}</p>
              )}
              <p className="mt-3 text-sm text-gray-600">{p.description}</p>

              <ul className="mt-5 space-y-2 text-sm text-gray-700">
                {p.bullets.map((b) => (
                  <li key={b} className="flex items-start gap-2">
                    <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-brand-blue/10 text-[10px] font-bold text-brand-blue">
                      ✓
                    </span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>

              {p.highlight && (
                <div className="mt-5 rounded-lg border border-green-200 bg-green-50 p-3">
                  <p className="text-xs font-semibold text-green-900">
                    Faire Risikoumkehr
                  </p>
                  <p className="mt-0.5 text-xs text-green-900">
                    Den Monatsbeitrag startest du erst, wenn die Webseite
                    live ist und du grünes Licht gibst. Bis dahin trägst du
                    kein Risiko.
                  </p>
                </div>
              )}

              <a
                href={site.meetingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`mt-6 ${
                  p.highlight ? 'btn-primary' : 'btn-secondary'
                } w-full justify-center py-3`}
              >
                📅 Termin buchen
              </a>
            </div>
          ))}
        </div>
        </Reveal>

        {/* Add-On: Funktionsbausteine — visuell deutlich getrennt */}
        <Reveal delay={150}>
        <div className="mt-10 overflow-hidden rounded-2xl border-2 border-dashed border-amber-300 bg-linear-to-br from-amber-50 via-orange-50 to-white p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="max-w-xl">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-200/70 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-amber-900">
                <span>➕</span> Add On zur Basis Webseite
              </span>
              <h3 className="mt-3 text-2xl font-semibold text-gray-900">
                {bausteinAddOn.name}
              </h3>
              <p className="mt-2 text-sm text-gray-700">
                {bausteinAddOn.description}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xl font-semibold text-amber-900">
                {bausteinAddOn.priceMain}
              </p>
              <p className="text-xs text-amber-800">{bausteinAddOn.priceNote}</p>
            </div>
          </div>

          <div className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {bausteinAddOn.examples.map((ex) => (
              <div
                key={ex.label}
                className="flex items-center gap-2 rounded-lg border border-amber-100 bg-white/80 px-3 py-2 text-sm text-gray-800"
              >
                <span className="text-base" aria-hidden>
                  {ex.icon}
                </span>
                <span>{ex.label}</span>
              </div>
            ))}
          </div>
        </div>
        </Reveal>

        <p className="mt-8 text-center text-sm text-gray-600">
          Du brauchst eine komplett eigene Software, etwa um Excel abzulösen?{' '}
          <Link
            href="/software"
            className="font-semibold text-brand-blue hover:underline"
          >
            Mehr zu individueller Software →
          </Link>
        </p>

        <p className="mt-6 text-center text-xs text-gray-500">
          Alle Preise sind Nettopreise und verstehen sich zuzüglich der
          gesetzlichen Mehrwertsteuer.
        </p>
      </div>
    </section>
  );
}

function Bonuses() {
  const icons = {
    camera: '📸',
    nfc: '📲',
    seo: '🔍',
    ai: '🤖',
  };
  return (
    <section className="relative overflow-hidden bg-gray-50 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <header className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium uppercase tracking-wider text-brand-blue">
            Bonus
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
            Warte … da ist noch mehr.
          </h2>
          <p className="mt-3 text-base text-gray-600">
            Vier Sachen bekommst du bei jeder Webseite automatisch oben
            drauf. Ohne Aufpreis. Im Gesamtwert von über 1.000 €.
          </p>
        </header>

        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {includedBonuses.map((b) => (
            <div
              key={b.title}
              className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xs transition-shadow hover:shadow-md"
            >
              <div className="flex items-start gap-4">
                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-brand-blue/10 text-3xl">
                  {icons[b.icon]}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {b.title}
                  </h3>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-brand-blue px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-white">
                      Gratis
                    </span>
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-semibold tracking-wider text-green-800">
                      {b.value}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-gray-600">
                    {b.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Faq() {
  return (
    <section id="faq" className="bg-gray-50 py-16 sm:py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <header>
          <p className="text-sm font-medium uppercase tracking-wider text-brand-blue">
            Häufige Fragen
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
            Das wirst du sicher wissen wollen.
          </h2>
        </header>

        <div className="mt-8 space-y-3">
          {faqs.map((f) => (
            <details
              key={f.question}
              className="group rounded-xl border border-gray-100 bg-white px-5 py-4 shadow-xs open:shadow-md"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-base font-semibold text-gray-900">
                {f.question}
                <span
                  aria-hidden
                  className="text-gray-400 transition-transform group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-gray-600">
                {f.answer}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function Industries() {
  return (
    <section className="bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <header className="max-w-2xl">
          <p className="text-sm font-medium uppercase tracking-wider text-brand-blue">
            Branchen
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
            Webseiten für deine Branche.
          </h2>
          <p className="mt-3 text-base text-gray-600">
            Wir bauen das System auf deinen Betrieb zu. Hier ein paar
            Beispiele, wie das in verschiedenen Branchen aussieht.
          </p>
        </header>

        <Reveal delay={100}>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {industries.map((b) => (
              <article
                key={b.title}
                className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xs transition-shadow hover:shadow-md"
              >
                <div className="text-3xl" aria-hidden>
                  {b.icon}
                </div>
                <h3 className="mt-3 text-base font-semibold text-gray-900">
                  {b.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">
                  {b.description}
                </p>
              </article>
            ))}
          </div>
        </Reveal>

        <p className="mt-8 text-center text-sm text-gray-600">
          Deine Branche ist nicht dabei? Kein Problem. Wir bauen das System
          für jeden Betrieb, der seine Prozesse digital im Griff haben will.
          <a
            href="#kontakt"
            className="ml-2 font-semibold text-brand-blue hover:underline"
          >
            Jetzt Erstgespräch sichern →
          </a>
        </p>

        <p className="mt-4 text-center text-sm text-gray-600">
          Ausführlich für deine Branche:
          {branchenSeiten.map((b) => (
            <Link
              key={b.slug}
              href={`/webseiten/${b.slug}`}
              className="ml-3 font-semibold text-brand-blue hover:underline"
            >
              {b.eyebrow}
            </Link>
          ))}
        </p>
      </div>
    </section>
  );
}

function Regions() {
  return (
    <section className="bg-gray-50 py-16 sm:py-20">
      <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
        <p className="text-sm font-medium uppercase tracking-wider text-brand-blue">
          Regionen
        </p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
          Webagentur in Bielefeld, Webseiten für ganz Deutschland.
        </h2>
        <p className="mt-4 text-base leading-relaxed text-gray-600">
          Unser Büro ist in {site.city}. Viele Kunden kommen aus
          Ostwestfalen-Lippe, zum Beispiel aus Herford, Bünde, Lage oder
          Paderborn. Dort kommen wir gern vorbei, etwa für das Fotoshooting.
        </p>
        <p className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-2 text-sm">
          {staedteSeiten.map((st) => (
            <Link
              key={st.slug}
              href={`/webdesign/${st.slug}`}
              className="font-semibold text-brand-blue hover:underline"
            >
              Webdesign {st.stadt}
            </Link>
          ))}
        </p>
        <p className="mt-3 text-base leading-relaxed text-gray-600">
          Über die Hälfte unserer Kunden treffen wir aber nie persönlich.
          Erstgespräch, Entwurf und Abstimmung laufen per Telefon oder Video
          Call. Ob dein Betrieb in Nordrhein-Westfalen sitzt oder in Hamburg,
          München oder Leipzig, spielt dafür keine Rolle.
        </p>
      </div>
    </section>
  );
}

// =====================================================================
// Seite
// =====================================================================

export default function WebseitenPage() {
  return (
    <>
      <StructuredData />
      <Hero />
      <TrustStrip />
      <PainSolution />
      <Benefits />
      <Industries />
      <Leistungen />
      <Process />
      <References />
      <Reviews />
      <Pricing />
      <Bonuses />
      <About />
      <Regions />
      <Faq />
      <Kontakt />
    </>
  );
}
