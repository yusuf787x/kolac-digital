import type { Metadata } from 'next';
import Image from 'next/image';
import {
  faqs,
  packages,
  references,
  reviewHighlights,
  serviceAreas,
  site,
} from '@/lib/site-config';
import ContactForm from './ContactForm';

export const metadata: Metadata = {
  title:
    'Individuelle Webseiten aus Bielefeld | Kolac Digital für OWL und NRW',
  description:
    'Wir bauen für dich individuelle Webseiten in Bielefeld, OWL und ganz Nordrhein Westfalen. Schnell mit KI gebaut. Mit System. Hosting, Wartung und Pflege dabei. Ab 1.000 €.',
  alternates: {
    canonical: `${site.baseUrl}/webseiten`,
  },
  openGraph: {
    type: 'website',
    locale: 'de_DE',
    url: `${site.baseUrl}/webseiten`,
    title: 'Individuelle Webseiten aus Bielefeld | Kolac Digital',
    description:
      'Wir bauen Webseiten die mehr können als nur schön aussehen. Für Firmen in OWL und ganz Nordrhein Westfalen. Ab 1.000 €.',
    siteName: 'Kolac Digital',
    images: [
      {
        url: '/images/bacara-website.webp',
        width: 1200,
        height: 630,
        alt: 'Beispiel Webseite von Kolac Digital aus Bielefeld',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Individuelle Webseiten aus Bielefeld | Kolac Digital',
    description:
      'Webseiten und digitale Systeme aus Bielefeld. Schnell, fair und mit Plan.',
    images: ['/images/bacara-website.webp'],
  },
  keywords: [
    'Webseite Bielefeld',
    'Webseite erstellen Bielefeld',
    'Webseite OWL',
    'Webseite Nordrhein Westfalen',
    'Webseite mit KI',
    'individuelle Webseite',
    'Webdesign Bielefeld',
    'Webagentur Bielefeld',
    'Webseite für Handwerker',
    'Webseite für Restaurants',
    'Webseite günstig',
    'Hosting Bielefeld',
    'Webseite mit System',
  ],
};

// =====================================================================
// JSON LD Strukturierte Daten
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
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: site.rating.value,
      reviewCount: site.rating.count,
      bestRating: 5,
      worstRating: 1,
    },
  };

  const service = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    serviceType: 'Individuelle Webseiten und digitale Systeme',
    provider: { '@id': `${site.baseUrl}/#business` },
    areaServed: serviceAreas,
    description:
      'Wir bauen für dich individuelle Webseiten und digitale Systeme. Schnell mit KI. Mit System. Inklusive Hosting, Wartung und Pflege.',
    offers: packages.map((p) => ({
      '@type': 'Offer',
      name: p.name,
      description: p.description,
      priceCurrency: p.priceCurrency,
      price: p.priceLow,
      priceSpecification: {
        '@type': 'PriceSpecification',
        priceCurrency: p.priceCurrency,
        price: p.priceLow,
        minPrice: p.priceLow,
        valueAddedTaxIncluded: false,
      },
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
    </>
  );
}

// =====================================================================
// Sections
// =====================================================================

function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-gray-100 bg-gradient-to-b from-white to-gray-50">
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-10 sm:px-6 sm:pt-16 lg:pb-24 lg:pt-24">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-700 shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
              Frei für neue Projekte in {site.city} und OWL
            </span>
            <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
              Individuelle Webseiten aus {site.city}, die für dich mitdenken.
            </h1>
            <p className="mt-5 max-w-xl text-base text-gray-600 sm:text-lg">
              Du bekommst keine 08/15 Vorlage. Du bekommst eine Webseite die
              dir Anfragen reinholt und dir Arbeit abnimmt. Schnell gebaut mit
              KI. Klug geplant mit Plan. Für Firmen in OWL und ganz
              Nordrhein Westfalen.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <a href="#kontakt" className="btn-primary px-5 py-3 text-base">
                Anfrage starten
              </a>
              <a
                href="#leistungen"
                className="btn-secondary px-5 py-3 text-base"
              >
                Was du bekommst
              </a>
            </div>

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
          </div>

          <div className="relative">
            <div className="absolute inset-0 -z-10 rounded-[2rem] bg-gradient-to-tr from-brand-blue/20 via-blue-100 to-white blur-2xl" />
            <div className="relative rounded-2xl border border-gray-100 bg-white p-3 shadow-xl">
              <Image
                src="/images/bacara-website.webp"
                alt="Beispiel einer Webseite von Kolac Digital"
                width={900}
                height={620}
                className="rounded-xl"
                priority
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function TrustStrip() {
  return (
    <section className="border-b border-gray-100 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-6 text-sm text-gray-600 sm:px-6">
        <span className="flex items-center gap-2">
          <span aria-hidden>📍</span> Wir arbeiten für Firmen in{' '}
          <strong className="text-gray-900">
            Bielefeld, Herford, Gütersloh, Paderborn
          </strong>{' '}
          und ganz NRW
        </span>
        <span className="flex items-center gap-2">
          <span aria-hidden>⚡</span> Webseite in ein bis zwei Wochen fertig
        </span>
        <span className="flex items-center gap-2">
          <span aria-hidden>🤝</span> Persönlicher Ansprechpartner
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
            Eine Webseite die wirklich arbeitet.
          </h2>
        </header>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {items.map((it) => (
            <div
              key={it.title}
              className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
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

function Leistungen() {
  const items = [
    {
      title: 'Komplett für dich gebaut',
      text: 'Keine Vorlage. Wir bauen genau das was du brauchst.',
    },
    {
      title: 'Hosting und Wartung dabei',
      text: 'Du musst dich um nichts kümmern. Wir halten die Seite am Laufen.',
    },
    {
      title: 'Du kannst alles selbst pflegen',
      text: 'Texte, Bilder, Termine. Du änderst alles mit ein paar Klicks.',
    },
    {
      title: 'Sieht auf Handy gut aus',
      text: 'Über die Hälfte deiner Kunden öffnen die Seite am Handy. Wir denken das von Anfang an mit.',
    },
    {
      title: 'Anbindung an deine Tools',
      text: 'Buchhaltung, Kalender, Shop, Lager. Wir verbinden was du schon nutzt.',
    },
    {
      title: 'Daten aus alten Systemen',
      text: 'Wir übernehmen deine Kunden und Inhalte aus dem alten System. Du startest nicht bei Null.',
    },
    {
      title: 'Findbar bei Google',
      text: 'Wir bauen die Seite so, dass Google sie versteht und vorne zeigt.',
    },
    {
      title: 'Findbar bei KI Suchen',
      text: 'Auch ChatGPT und Google AI sollen dich finden. Wir bereiten die Seite darauf vor.',
    },
  ];

  return (
    <section id="leistungen" className="bg-gray-50 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <header className="max-w-2xl">
          <p className="text-sm font-medium uppercase tracking-wider text-brand-blue">
            Was du bekommst
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
            Alles drin. Kein Schnickschnack.
          </h2>
          <p className="mt-3 text-base text-gray-600">
            Wir bauen Webseiten die wirklich was können. Nicht nur ein
            digitaler Flyer.
          </p>
        </header>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((it) => (
            <div
              key={it.title}
              className="rounded-xl border border-gray-100 bg-white p-5"
            >
              <div className="flex items-start gap-2.5">
                <span className="mt-0.5 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-brand-blue/10 text-brand-blue">
                  ✓
                </span>
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {it.title}
                  </p>
                  <p className="mt-1 text-sm text-gray-600">{it.text}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Process() {
  const steps = [
    {
      n: '01',
      title: 'Wir reden kurz',
      text: 'Du erzählst mir was du brauchst. Ich sage dir was geht. Das Gespräch ist kostenlos und du musst nichts kaufen.',
    },
    {
      n: '02',
      title: 'Ich baue dir einen Entwurf',
      text: 'Nach ein paar Tagen siehst du wie deine neue Webseite aussehen wird. Du sagst mir was bleiben soll und was anders muss.',
    },
    {
      n: '03',
      title: 'Wir gehen live',
      text: 'Sobald alles passt geht deine Seite online. Hosting, Wartung und kleine Änderungen laufen weiter über mich.',
    },
  ];
  return (
    <section className="bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <header className="max-w-2xl">
          <p className="text-sm font-medium uppercase tracking-wider text-brand-blue">
            So bauen wir das
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
            Drei Schritte. Kein Stress.
          </h2>
        </header>

        <ol className="mt-10 grid gap-6 md:grid-cols-3">
          {steps.map((s) => (
            <li
              key={s.n}
              className="relative rounded-2xl border border-gray-100 bg-white p-6 shadow-sm"
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

function References() {
  return (
    <section id="referenzen" className="bg-gray-50 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <header className="max-w-2xl">
          <p className="text-sm font-medium uppercase tracking-wider text-brand-blue">
            Referenzen
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
            Sieh dir an was wir gemacht haben.
          </h2>
          <p className="mt-3 text-base text-gray-600">
            Echte Projekte für echte Firmen aus der Region.
          </p>
        </header>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {references.map((r) => (
            <article
              key={r.name}
              className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="relative aspect-[16/10] w-full bg-gray-100">
                <Image
                  src={r.image}
                  alt={`Webseite von ${r.name} aus ${r.industry}`}
                  fill
                  sizes="(min-width: 768px) 50vw, 100vw"
                  className="object-cover"
                />
              </div>
              <div className="p-5">
                <p className="text-xs uppercase tracking-wider text-gray-500">
                  {r.industry}
                </p>
                <h3 className="mt-1 text-lg font-semibold text-gray-900">
                  {r.name}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">
                  {r.blurb}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Reviews() {
  return (
    <section className="bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <header className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <div className="max-w-xl">
            <p className="text-sm font-medium uppercase tracking-wider text-brand-blue">
              Bewertungen
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
              Was unsere Kunden sagen.
            </h2>
            <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
              <Stars />
              <strong className="text-gray-900">
                {site.rating.value.toFixed(1)} von 5
              </strong>{' '}
              · {site.rating.count} Bewertungen auf Google
            </div>
          </div>
          <a
            href={site.googleReviewsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary"
          >
            Alle {site.rating.count} Bewertungen ansehen
          </a>
        </header>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {reviewHighlights.map((r) => (
            <figure
              key={r.author}
              className="rounded-2xl border border-gray-100 bg-gray-50 p-6"
            >
              <div className="flex items-center justify-between">
                <Stars />
                <span className="text-xs text-gray-500">Google</span>
              </div>
              <blockquote className="mt-3 text-sm leading-relaxed text-gray-700">
                „{r.text}“
              </blockquote>
              <figcaption className="mt-4 text-sm font-medium text-gray-900">
                {r.author}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  return (
    <section id="preise" className="bg-gray-50 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <header className="max-w-2xl">
          <p className="text-sm font-medium uppercase tracking-wider text-brand-blue">
            Preise
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
            Faire Preise. Keine Überraschungen.
          </h2>
          <p className="mt-3 text-base text-gray-600">
            Du siehst hier ab welchem Preis es losgeht. Den genauen Preis für
            dein Projekt sagen wir dir nach dem ersten Gespräch.
          </p>
        </header>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {packages.map((p) => (
            <div
              key={p.id}
              className={`relative flex flex-col rounded-2xl border bg-white p-6 shadow-sm ${
                p.highlight
                  ? 'border-brand-blue ring-2 ring-brand-blue/20'
                  : 'border-gray-100'
              }`}
            >
              {p.highlight && (
                <span className="absolute -top-3 left-6 inline-flex items-center rounded-full bg-brand-blue px-3 py-1 text-xs font-semibold tracking-wider text-white">
                  Empfohlen
                </span>
              )}
              <h3 className="text-lg font-semibold text-gray-900">{p.name}</h3>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-sm text-gray-500">{p.pricePrefix}</span>
                <span className="text-3xl font-semibold text-gray-900">
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
                    <span className="mt-0.5 inline-flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-brand-blue/10 text-[10px] font-bold text-brand-blue">
                      ✓
                    </span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>

              <a
                href="#kontakt"
                className={`mt-6 ${
                  p.highlight ? 'btn-primary' : 'btn-secondary'
                } w-full justify-center py-3`}
              >
                Anfrage starten
              </a>
            </div>
          ))}
        </div>

        <p className="mt-6 text-center text-xs text-gray-500">
          Alle Preise sind Nettopreise und verstehen sich zuzüglich der
          gesetzlichen Mehrwertsteuer.
        </p>
      </div>
    </section>
  );
}

function About() {
  return (
    <section className="bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid items-center gap-10 md:grid-cols-2">
          <div className="relative mx-auto aspect-square w-full max-w-sm overflow-hidden rounded-2xl bg-gray-100">
            <Image
              src="/email/yk.png"
              alt="Yusuf Kolac, Geschäftsführer von Kolac Digital aus Bielefeld"
              fill
              sizes="(min-width: 768px) 400px, 80vw"
              className="object-cover"
            />
          </div>
          <div>
            <p className="text-sm font-medium uppercase tracking-wider text-brand-blue">
              Wer baut deine Webseite?
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
              Moin, ich bin Yusuf.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-gray-700">
              Ich komme aus Bielefeld und baue seit Jahren Webseiten für
              kleine und mittelgroße Firmen in OWL und ganz Nordrhein
              Westfalen.
            </p>
            <p className="mt-3 text-base leading-relaxed text-gray-700">
              Mit KI bin ich heute viel schneller geworden. Du bekommst eine
              fertige Webseite in Tagen statt Monaten. Ohne dass die Qualität
              darunter leidet.
            </p>
            <p className="mt-3 text-base leading-relaxed text-gray-700">
              Wenn du mich anrufst sprichst du direkt mit mir. Kein
              Callcenter. Kein Verkäufer. Einfach jemand der dir hilft.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-gray-600">
              <a
                href={`tel:${site.phoneE164}`}
                className="font-medium text-brand-blue hover:underline"
              >
                ☎ {site.phone}
              </a>
              <span>·</span>
              <a
                href={`mailto:${site.email}`}
                className="font-medium text-brand-blue hover:underline"
              >
                ✉ {site.email}
              </a>
            </div>
          </div>
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
              className="group rounded-xl border border-gray-100 bg-white px-5 py-4 shadow-sm open:shadow-md"
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

function Kontakt() {
  return (
    <section
      id="kontakt"
      className="relative overflow-hidden bg-gradient-to-br from-brand-blue to-blue-700 py-16 text-white sm:py-20"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid gap-12 lg:grid-cols-2">
          <div>
            <p className="text-sm font-medium uppercase tracking-wider text-blue-200">
              Lass uns reden
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              Sag mir kurz was du brauchst.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-blue-100">
              Trag deinen Namen und deine Nummer ein. Ich rufe dich innerhalb
              von 24 Stunden zurück. Wir reden in Ruhe über dein Projekt. Du
              musst nichts entscheiden und nichts kaufen.
            </p>

            <div className="mt-8 space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-white/15">
                  📞
                </span>
                <a
                  href={`tel:${site.phoneE164}`}
                  className="font-medium hover:underline"
                >
                  {site.phone}
                </a>
              </div>
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-white/15">
                  ✉️
                </span>
                <a
                  href={`mailto:${site.email}`}
                  className="font-medium hover:underline"
                >
                  {site.email}
                </a>
              </div>
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-white/15">
                  📍
                </span>
                <span>
                  {site.street}, {site.zip} {site.city}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-6 text-gray-900 shadow-2xl sm:p-8">
            <ContactForm />
          </div>
        </div>
      </div>
    </section>
  );
}

function Stars() {
  return (
    <span className="inline-flex text-yellow-500">
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} aria-hidden>
          ★
        </span>
      ))}
      <span className="sr-only">5 von 5 Sternen</span>
    </span>
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
      <Benefits />
      <Leistungen />
      <Process />
      <References />
      <Reviews />
      <Pricing />
      <About />
      <Faq />
      <Kontakt />
    </>
  );
}
