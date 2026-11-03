import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  branchenSeiten,
  findBranchenSeite,
  type BranchenSeite,
} from '@/lib/branchen-seiten';
import { findPortfolioProject, type PortfolioProject } from '@/lib/portfolio';
import { site } from '@/lib/site-config';
import Reveal from '@/components/marketing/Reveal';
import {
  About,
  Kontakt,
  Leistungen,
  Process,
  Reviews,
  FaqListe,
  ProjektKarten,
  Stars,
} from '../sections';

interface Props {
  params: Promise<{ branche: string }>;
}

export const dynamicParams = false;

export function generateStaticParams() {
  return branchenSeiten.map((b) => ({ branche: b.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { branche } = await params;
  const seite = findBranchenSeite(branche);
  if (!seite) return {};
  const project = findPortfolioProject(seite.portfolioSlug);
  const url = `${site.baseUrl}/webseiten/${seite.slug}`;
  return {
    title: seite.metaTitle,
    description: seite.metaDescription,
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      locale: 'de_DE',
      url,
      title: seite.metaTitle,
      description: seite.metaDescription,
      siteName: 'Kolac Digital',
      images: project
        ? [{ url: `${site.baseUrl}${project.overviewImage}`, alt: project.imageAlt }]
        : undefined,
    },
  };
}

function StructuredData({ seite }: { seite: BranchenSeite }) {
  const url = `${site.baseUrl}/webseiten/${seite.slug}`;
  const service = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    serviceType: seite.eyebrow,
    name: seite.eyebrow,
    description: seite.metaDescription,
    url,
    provider: { '@id': `${site.baseUrl}/#business` },
    areaServed: { '@type': 'Country', name: 'Deutschland' },
  };
  const faq = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: seite.faqs.map((f) => ({
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
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Webseiten',
        item: `${site.baseUrl}/webseiten`,
      },
      { '@type': 'ListItem', position: 3, name: seite.name, item: url },
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

function Hero({
  seite,
  project,
}: {
  seite: BranchenSeite;
  project: PortfolioProject;
}) {
  return (
    <section className="relative overflow-hidden border-b border-gray-100 bg-linear-to-b from-white to-gray-50">
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-10 sm:px-6 sm:pt-16 lg:pb-24 lg:pt-20">
        <nav aria-label="Brotkrumen" className="text-sm text-gray-500">
          <Link href="/webseiten" className="hover:text-brand-blue">
            Webseiten
          </Link>
          <span aria-hidden className="mx-2">
            ›
          </span>
          <span className="text-gray-700">{seite.name}</span>
        </nav>

        <div className="mt-6 grid items-center gap-12 lg:grid-cols-2">
          <Reveal>
            <p className="text-sm font-medium uppercase tracking-wider text-brand-blue">
              {seite.eyebrow}
            </p>
            <h1 className="mt-3 text-4xl font-semibold leading-tight tracking-tight text-gray-900 sm:text-5xl">
              {seite.h1}
            </h1>
            <p className="mt-5 max-w-xl text-base text-gray-600 sm:text-lg">
              {seite.intro}
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
              <a href="#referenz" className="btn-secondary px-5 py-3 text-base">
                Beispiel ansehen
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
                <div className="relative aspect-16/10 w-full overflow-hidden rounded-xl">
                  <Image
                    src={project.overviewImage}
                    alt={project.imageAlt}
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

function Problems({ seite }: { seite: BranchenSeite }) {
  return (
    <section className="bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <p className="text-sm font-medium uppercase tracking-wider text-brand-blue">
          Das Problem
        </p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
          {seite.problemsTitle}
        </h2>
        <ul className="mt-8 space-y-3">
          {seite.problems.map((p) => (
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
          Eine gute Website löst das nicht nur optisch. Sie nimmt dir Arbeit ab:
          Vorne sehen Kunden alles, was sie wissen müssen. Hinten landen ihre
          Anfragen sortiert bei dir.{' '}
          <strong className="text-gray-900">
            Die Software passt sich deinem Betrieb an, nicht andersrum.
          </strong>
        </p>
      </div>
    </section>
  );
}

function Features({ seite }: { seite: BranchenSeite }) {
  return (
    <section className="bg-gray-50 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <header className="max-w-2xl">
          <p className="text-sm font-medium uppercase tracking-wider text-brand-blue">
            Funktionen
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
            {seite.featuresTitle}
          </h2>
          <p className="mt-3 text-base text-gray-600">{seite.featuresIntro}</p>
        </header>

        <Reveal delay={100}>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {seite.features.map((f) => (
              <article
                key={f.title}
                className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xs"
              >
                <div className="text-3xl" aria-hidden>
                  {f.icon}
                </div>
                <h3 className="mt-3 text-base font-semibold text-gray-900">
                  {f.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">
                  {f.text}
                </p>
              </article>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Referenz({
  seite,
  project,
}: {
  seite: BranchenSeite;
  project: PortfolioProject;
}) {
  const weitere = (seite.weitereReferenzen ?? [])
    .map(findPortfolioProject)
    .filter((p): p is PortfolioProject => Boolean(p));
  return (
    <section id="referenz" className="scroll-mt-24 bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <header className="max-w-2xl">
          <p className="text-sm font-medium uppercase tracking-wider text-brand-blue">
            Referenz
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
            So sieht das bei {project.company} aus.
          </h2>
          {seite.referenceNote && (
            <p className="mt-3 text-base text-gray-600">{seite.referenceNote}</p>
          )}
        </header>

        <div className="mt-10 grid items-start gap-10 lg:grid-cols-2">
          <div className="overflow-hidden rounded-2xl border border-gray-100 bg-gray-100 shadow-xs">
            <div className="bg-gray-200 px-3 py-2">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-400" />
              <span className="ml-1.5 inline-block h-2.5 w-2.5 rounded-full bg-yellow-400" />
              <span className="ml-1.5 inline-block h-2.5 w-2.5 rounded-full bg-green-400" />
            </div>
            <div className="relative aspect-16/10 w-full">
              <Image
                src={project.overviewImage}
                alt={project.imageAlt}
                fill
                sizes="(min-width: 1024px) 560px, 100vw"
                className="object-cover object-top"
              />
            </div>
          </div>

          <div>
            <span className="inline-flex items-center rounded-full bg-brand-blue/10 px-3 py-1 text-xs font-semibold text-brand-blue">
              {project.tag}
            </span>
            <h3 className="mt-3 text-2xl font-semibold text-gray-900">
              {project.company}
            </h3>
            {project.location && (
              <p className="mt-1 text-sm text-gray-500">
                {project.category} · {project.location}
              </p>
            )}
            <p className="mt-4 text-base leading-relaxed text-gray-700">
              {project.situation}
            </p>

            <ul className="mt-5 space-y-2">
              {project.approach.map((a) => (
                <li key={a} className="flex items-start gap-2 text-sm text-gray-700">
                  <span aria-hidden className="mt-0.5 shrink-0 text-brand-blue">
                    ✓
                  </span>
                  <span>{a}</span>
                </li>
              ))}
            </ul>

            <div className="mt-6 rounded-lg border-l-[3px] border-brand-blue bg-brand-blue/5 p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-brand-blue">
                Ergebnis
              </p>
              <p className="mt-1 text-sm font-medium text-gray-900">
                {project.outcome}
              </p>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <Link
                href={project.caseStudyUrl ?? `/portfolio/${project.slug}`}
                className="inline-flex items-center gap-1.5 rounded-full bg-brand-blue px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-blue-hover"
              >
                {project.caseStudyUrl ? 'Case Study lesen' : 'Projekt ansehen'}
                <span aria-hidden>→</span>
              </Link>
              {project.link && (
                <a
                  href={project.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary"
                >
                  {project.linkText ?? 'Website ansehen'}
                </a>
              )}
            </div>
          </div>
        </div>

        {weitere.length > 0 && (
          <div className="mt-14">
            <h3 className="text-lg font-semibold text-gray-900">
              Weitere Projekte aus der Branche
            </h3>
            <div className="mt-5">
              <ProjektKarten projects={weitere} />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function BranchenFaq({ seite }: { seite: BranchenSeite }) {
  return (
    <FaqListe title={`Das fragen uns ${seite.zielgruppe} oft.`} faqs={seite.faqs}>
      {seite.ratgeber && (
        <p className="mt-8 text-sm text-gray-600">
          Mehr dazu im Ratgeber:{' '}
          <Link
            href={seite.ratgeber.href}
            className="font-medium text-brand-blue underline underline-offset-2 hover:opacity-80"
          >
            {seite.ratgeber.title}
          </Link>
        </p>
      )}
    </FaqListe>
  );
}

function WeitereBranchen({ seite }: { seite: BranchenSeite }) {
  const andere = branchenSeiten.filter((b) => b.slug !== seite.slug);
  return (
    <section className="border-t border-gray-100 bg-white py-10">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 text-sm text-gray-600 sm:px-6">
        <span>Andere Branchen:</span>
        {andere.map((b) => (
          <Link
            key={b.slug}
            href={`/webseiten/${b.slug}`}
            className="font-medium text-brand-blue hover:underline"
          >
            {b.eyebrow}
          </Link>
        ))}
        <Link href="/webseiten" className="font-medium text-brand-blue hover:underline">
          Alle Leistungen rund um Webseiten
        </Link>
      </div>
    </section>
  );
}

export default async function BranchenPage({ params }: Props) {
  const { branche } = await params;
  const seite = findBranchenSeite(branche);
  if (!seite) notFound();
  const project = findPortfolioProject(seite.portfolioSlug);
  if (!project) notFound();

  return (
    <>
      <StructuredData seite={seite} />
      <Hero seite={seite} project={project} />
      <Problems seite={seite} />
      <Features seite={seite} />
      <Referenz seite={seite} project={project} />
      <Leistungen />
      <Process />
      <Reviews />
      <About />
      <BranchenFaq seite={seite} />
      <Kontakt source={seite.formSource} />
      <WeitereBranchen seite={seite} />
    </>
  );
}
