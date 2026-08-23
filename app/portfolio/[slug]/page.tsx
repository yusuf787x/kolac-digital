import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import {
  portfolioProjects,
  findPortfolioProject,
} from '@/lib/portfolio';
import { site } from '@/lib/site-config';
import Reveal from '@/components/marketing/Reveal';

interface Props {
  params: { slug: string };
}

export function generateStaticParams() {
  return portfolioProjects.map((p) => ({ slug: p.slug }));
}

export function generateMetadata({ params }: Props): Metadata {
  const p = findPortfolioProject(params.slug);
  if (!p) return {};
  return {
    title: p.metaTitle,
    description: p.metaDescription,
    alternates: { canonical: `${site.baseUrl}/portfolio/${p.slug}` },
    openGraph: {
      type: 'article',
      locale: 'de_DE',
      url: `${site.baseUrl}/portfolio/${p.slug}`,
      title: p.metaTitle,
      description: p.metaDescription,
      siteName: 'Kolac Digital',
      images: [
        {
          url: `${site.baseUrl}${p.overviewImage}`,
          alt: p.imageAlt,
        },
      ],
    },
  };
}

export default function PortfolioProjectPage({ params }: Props) {
  const project = findPortfolioProject(params.slug);
  if (!project) notFound();

  const idx = portfolioProjects.findIndex((p) => p.slug === project.slug);
  const other = portfolioProjects
    .filter((_, i) => i !== idx)
    .slice(0, 3);

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
      {
        '@type': 'ListItem',
        position: 3,
        name: project.company,
        item: `${site.baseUrl}/portfolio/${project.slug}`,
      },
    ],
  };

  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: `${project.company} · ${project.tag}`,
    description: project.metaDescription,
    author: {
      '@type': 'Organization',
      name: 'Kolac Digital',
      url: site.baseUrl,
    },
    publisher: {
      '@type': 'Organization',
      name: 'Kolac Digital',
      url: site.baseUrl,
    },
    inLanguage: 'de-DE',
    mainEntityOfPage: `${site.baseUrl}/portfolio/${project.slug}`,
    image: `${site.baseUrl}${project.overviewImage}`,
    about: {
      '@type': 'Thing',
      name: project.category,
    },
  };

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: `Was hat Kolac Digital für ${project.company} gemacht?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: project.intro,
        },
      },
      {
        '@type': 'Question',
        name: `Was war die Ausgangslage bei ${project.company}?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: project.situation,
        },
      },
      {
        '@type': 'Question',
        name: `Was ist das Ergebnis der Zusammenarbeit mit ${project.company}?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: project.outcome,
        },
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <section className="portfolio-detail-hero">
        <div className="container">
          <div className="portfolio-breadcrumb">
            <Link href="/portfolio">Portfolio</Link>
            <span aria-hidden="true"> · </span>
            <span>{project.company}</span>
          </div>
          <div className="portfolio-detail-hero-grid">
            <Reveal>
              <div>
                <span className="portfolio-card-tag">{project.tag}</span>
                <h1 className="portfolio-detail-headline">
                  {project.company}
                </h1>
                <p className="portfolio-detail-category">
                  {project.category}
                  {project.location ? ` · ${project.location}` : ''}
                </p>
                <p className="portfolio-detail-intro">{project.intro}</p>
                <div className="portfolio-detail-actions">
                  {project.link && (
                    <a
                      href={project.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-primary"
                    >
                      {project.linkText ?? 'Website ansehen'}
                    </a>
                  )}
                  {project.socialLink && (
                    <a
                      href={project.socialLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-outline"
                    >
                      {project.socialLinkText ?? 'Social ansehen'}
                    </a>
                  )}
                  {project.caseStudyUrl && (
                    <Link
                      href={project.caseStudyUrl}
                      className="portfolio-detail-casestudy-link"
                    >
                      Ausführliche Case Study lesen →
                    </Link>
                  )}
                </div>
              </div>
            </Reveal>
            <Reveal delay={120}>
              <div className="portfolio-detail-media">
                <Image
                  src={project.overviewImage}
                  alt={project.imageAlt}
                  width={900}
                  height={600}
                  className="portfolio-detail-image"
                  priority
                />
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="portfolio-detail-body">
        <div className="container">
          <div className="portfolio-detail-body-grid">
            <Reveal>
              <div className="portfolio-detail-block">
                <div className="section-label">AUSGANGSLAGE</div>
                <h2 className="portfolio-detail-h2">Wie es angefangen hat</h2>
                <p>{project.situation}</p>
              </div>
            </Reveal>

            <Reveal>
              <div className="portfolio-detail-block">
                <div className="section-label">UNSER VORGEHEN</div>
                <h2 className="portfolio-detail-h2">Was wir gebaut haben</h2>
                <ul className="portfolio-approach-list">
                  {project.approach.map((step, i) => (
                    <li key={i}>
                      <span className="portfolio-approach-num">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>

            <Reveal>
              <div className="portfolio-detail-block portfolio-detail-outcome">
                <div className="section-label">ERGEBNIS</div>
                <h2 className="portfolio-detail-h2">Was sich verändert hat</h2>
                <p>{project.outcome}</p>
                <div className="portfolio-detail-keywin">
                  <strong>{project.keyWin}</strong>
                </div>
              </div>
            </Reveal>

            <Reveal>
              <div className="portfolio-detail-block">
                <div className="section-label">LEISTUNGEN IM ÜBERBLICK</div>
                <h2 className="portfolio-detail-h2">Was drin war</h2>
                <ul className="portfolio-services-list">
                  {project.services.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="portfolio-other">
        <div className="container">
          <Reveal>
            <div className="portfolio-other-intro">
              <div className="section-label">WEITERE PROJEKTE</div>
              <h2 className="portfolio-detail-h2">Auch spannend</h2>
            </div>
          </Reveal>
          <div className="portfolio-grid portfolio-grid-compact">
            {other.map((p, i) => (
              <Reveal key={p.slug} delay={i * 60}>
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
                    <h3 className="portfolio-card-title">{p.company}</h3>
                    <p className="portfolio-card-category">
                      {p.category}
                      {p.location ? ` · ${p.location}` : ''}
                    </p>
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
