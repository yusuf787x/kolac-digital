import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  staedteSeiten,
  findStadtSeite,
  type StadtSeite,
} from '@/lib/staedte-seiten';
import { branchenSeiten } from '@/lib/branchen-seiten';
import { findPortfolioProject, type PortfolioProject } from '@/lib/portfolio';
import { site } from '@/lib/site-config';
import Reveal from '@/components/marketing/Reveal';
import {
  About,
  FaqListe,
  Kontakt,
  Leistungen,
  Process,
  ProjektKarten,
  Reviews,
  Stars,
} from '../../webseiten/sections';

interface Props {
  params: Promise<{ stadt: string }>;
}

export const dynamicParams = false;

export function generateStaticParams() {
  return staedteSeiten.map((s) => ({ stadt: s.slug }));
}

function projekteVon(seite: StadtSeite): PortfolioProject[] {
  return seite.referenzen
    .map(findPortfolioProject)
    .filter((p): p is PortfolioProject => Boolean(p));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { stadt } = await params;
  const seite = findStadtSeite(stadt);
  if (!seite) return {};
  const [haupt] = projekteVon(seite);
  const url = `${site.baseUrl}/webdesign/${seite.slug}`;
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
      images: haupt
        ? [{ url: `${site.baseUrl}${haupt.overviewImage}`, alt: haupt.imageAlt }]
        : undefined,
    },
  };
}

function StructuredData({ seite }: { seite: StadtSeite }) {
  const url = `${site.baseUrl}/webdesign/${seite.slug}`;
  const service = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    serviceType: 'Webdesign',
    name: `Webdesign ${seite.stadt}`,
    description: seite.metaDescription,
    url,
    provider: { '@id': `${site.baseUrl}/#business` },
    areaServed: [
      { '@type': 'City', name: seite.stadt },
      { '@type': 'AdministrativeArea', name: seite.region },
    ],
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
      { '@type': 'ListItem', position: 3, name: `Webdesign ${seite.stadt}`, item: url },
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

function Hero({ seite, haupt }: { seite: StadtSeite; haupt: PortfolioProject }) {
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
          <span className="text-gray-700">Webdesign {seite.stadt}</span>
        </nav>

        <div className="mt-6 grid items-center gap-12 lg:grid-cols-2">
          <Reveal>
            <p className="text-sm font-medium uppercase tracking-wider text-brand-blue">
              Webdesign {seite.stadt}
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
              <a href="#projekte" className="btn-secondary px-5 py-3 text-base">
                Projekte aus {seite.stadt}
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

function Lokal({ seite }: { seite: StadtSeite }) {
  return (
    <section className="bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <p className="text-sm font-medium uppercase tracking-wider text-brand-blue">
          Aus der Region
        </p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
          Dein Webdesigner für {seite.stadt} und den {seite.region}.
        </h2>
        {seite.lokal.map((absatz) => (
          <p key={absatz} className="mt-5 text-base leading-relaxed text-gray-700">
            {absatz}
          </p>
        ))}
        <p className="mt-5 text-base leading-relaxed text-gray-700">
          Wir arbeiten für Betriebe in {seite.stadt} und Umgebung, zum Beispiel
          in {seite.nachbarorte.slice(0, -1).join(', ')} und{' '}
          {seite.nachbarorte[seite.nachbarorte.length - 1]}.
        </p>
      </div>
    </section>
  );
}

function Projekte({
  seite,
  projekte,
}: {
  seite: StadtSeite;
  projekte: PortfolioProject[];
}) {
  return (
    <section id="projekte" className="scroll-mt-24 bg-gray-50 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <header className="max-w-2xl">
          <p className="text-sm font-medium uppercase tracking-wider text-brand-blue">
            Referenzen
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
            {projekte.length > 1
              ? `Projekte aus ${seite.stadt} und Umgebung.`
              : `Ein Projekt aus ${seite.stadt}.`}
          </h2>
          {seite.referenzHinweis && (
            <p className="mt-3 text-base text-gray-600">{seite.referenzHinweis}</p>
          )}
        </header>
        <div className="mt-10">
          <ProjektKarten projects={projekte} />
        </div>
      </div>
    </section>
  );
}

function WeitereSeiten({ seite }: { seite: StadtSeite }) {
  const andere = staedteSeiten.filter((s) => s.slug !== seite.slug);
  return (
    <section className="border-t border-gray-100 bg-white py-10">
      <div className="mx-auto max-w-6xl space-y-3 px-4 text-sm text-gray-600 sm:px-6">
        <p className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span>Webdesign in der Nähe:</span>
          <Link href="/webseiten" className="font-medium text-brand-blue hover:underline">
            Webdesign Bielefeld
          </Link>
          {andere.map((s) => (
            <Link
              key={s.slug}
              href={`/webdesign/${s.slug}`}
              className="font-medium text-brand-blue hover:underline"
            >
              Webdesign {s.stadt}
            </Link>
          ))}
        </p>
        <p className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span>Nach Branche:</span>
          {branchenSeiten.map((b) => (
            <Link
              key={b.slug}
              href={`/webseiten/${b.slug}`}
              className="font-medium text-brand-blue hover:underline"
            >
              {b.eyebrow}
            </Link>
          ))}
        </p>
      </div>
    </section>
  );
}

export default async function StadtPage({ params }: Props) {
  const { stadt } = await params;
  const seite = findStadtSeite(stadt);
  if (!seite) notFound();
  const projekte = projekteVon(seite);
  if (projekte.length === 0) notFound();

  return (
    <>
      <StructuredData seite={seite} />
      <Hero seite={seite} haupt={projekte[0]} />
      <Lokal seite={seite} />
      <Projekte seite={seite} projekte={projekte} />
      <Leistungen />
      <Process />
      <Reviews />
      <About />
      <FaqListe title={`Häufige Fragen zu Webdesign in ${seite.stadt}`} faqs={seite.faqs} />
      <Kontakt source={seite.formSource} />
      <WeitereSeiten seite={seite} />
    </>
  );
}
