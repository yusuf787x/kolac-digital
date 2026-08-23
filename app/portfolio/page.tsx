import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { portfolioProjects } from '@/lib/portfolio';
import { site } from '@/lib/site-config';
import Reveal from '@/components/marketing/Reveal';

export const metadata: Metadata = {
  title: 'Portfolio · Kundenprojekte von Kolac Digital · Webagentur Bielefeld',
  description:
    'Portfolio von Kolac Digital aus Bielefeld. Kundenprojekte aus OWL und ganz Deutschland: Webseiten mit System, Onlineshops, Buchungssysteme, Konfiguratoren und Social Media. Konkrete Ausgangslagen und Ergebnisse.',
  alternates: { canonical: `${site.baseUrl}/portfolio` },
  openGraph: {
    type: 'website',
    locale: 'de_DE',
    url: `${site.baseUrl}/portfolio`,
    title: 'Portfolio · Kundenprojekte von Kolac Digital',
    description:
      'Kundenprojekte von Kolac Digital: Webseiten mit System, Onlineshops, Buchungssysteme, Konfiguratoren, Social Media. Aus Bielefeld für OWL und Deutschland.',
    siteName: 'Kolac Digital',
  },
};

export default function PortfolioPage() {
  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Portfolio Kolac Digital',
    description:
      'Portfolio-Übersicht der Kundenprojekte von Kolac Digital, Webagentur aus Bielefeld.',
    numberOfItems: portfolioProjects.length,
    itemListElement: portfolioProjects.map((p, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      url: `${site.baseUrl}/portfolio/${p.slug}`,
      name: `${p.company} · ${p.tag}`,
    })),
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Startseite',
        item: `${site.baseUrl}/`,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Portfolio',
        item: `${site.baseUrl}/portfolio`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <section className="portfolio-hero">
        <div className="container">
          <Reveal>
            <div className="portfolio-hero-inner">
              <div className="section-label">PORTFOLIO</div>
              <h1 className="portfolio-hero-headline">
                Kundenprojekte, an denen wir gearbeitet haben
              </h1>
              <p className="portfolio-hero-subline">
                Ein Blick hinter die Kulissen. Was war die Ausgangslage, was
                haben wir gebaut, was hat sich für den Kunden verändert. Von
                der Ästhetik-Praxis mit Buchungssystem bis zur Fahrschule,
                die vorher gar keine Webseite hatte.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="portfolio-grid-section">
        <div className="container">
          <div className="portfolio-grid">
            {portfolioProjects.map((p, idx) => (
              <Reveal key={p.slug} delay={idx * 80}>
                <Link
                  href={`/portfolio/${p.slug}`}
                  className="portfolio-card"
                  aria-label={`Projekt ${p.company} ansehen`}
                >
                  <div className="portfolio-card-media">
                    <Image
                      src={p.overviewImage}
                      alt={p.imageAlt}
                      width={800}
                      height={520}
                      className="portfolio-card-image"
                    />
                  </div>
                  <div className="portfolio-card-body">
                    <span className="portfolio-card-tag">{p.tag}</span>
                    <h2 className="portfolio-card-title">{p.company}</h2>
                    <p className="portfolio-card-category">
                      {p.category}
                      {p.location ? ` · ${p.location}` : ''}
                    </p>
                    <p className="portfolio-card-win">{p.keyWin}</p>
                    <span className="portfolio-card-link">
                      Projekt ansehen
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <line x1="5" y1="12" x2="19" y2="12" />
                        <polyline points="12 5 19 12 12 19" />
                      </svg>
                    </span>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="portfolio-cta">
        <div className="container">
          <Reveal>
            <div className="portfolio-cta-inner">
              <h2 className="portfolio-cta-headline">
                Klingt nach etwas, das für dich auch passt?
              </h2>
              <p className="portfolio-cta-sub">
                Erzähl uns kurz was du vorhast. Wir melden uns innerhalb von
                24 Stunden mit einer ehrlichen Einschätzung.
              </p>
              <div className="portfolio-cta-actions">
                <Link href="/webseiten" className="btn btn-primary">
                  Webseite mit System ansehen
                </Link>
                <a href="/#kontakt" className="btn btn-outline">
                  Kontakt aufnehmen
                </a>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
