import type { Metadata } from 'next';
import Link from 'next/link';
import SeoCheckClient from './SeoCheckClient';
import SeoCheckSections, { FAQ } from './SeoCheckSections';
import { metaCapiEnabled } from '@/lib/seo-check/meta-server';

type PageProps = { searchParams: Promise<{ id?: string | string[] }> };

const BASE_METADATA: Metadata = {
  title: 'Kostenloser SEO-Check: Wirst du bei Google gefunden?',
  description:
    'Kostenloser SEO-Check für lokale Betriebe: Technik, Inhalte, Google-Platzierungen und deine Lage in der Karte. In 30 Sekunden, mit den wichtigsten Maßnahmen.',
  alternates: { canonical: '/seo-check' },
  openGraph: {
    title: 'Kostenloser SEO-Check | Kolac Digital',
    description: 'Finde in 30 Sekunden heraus, warum deine Website bei Google nicht angezeigt wird.',
    url: '/seo-check',
    type: 'website',
  },
};

// Einzelne Berichte (?id=...) gehoeren einem Besucher und sollen nicht in Google landen.
export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const { id } = await searchParams;
  return id ? { ...BASE_METADATA, robots: { index: false, follow: true } } : BASE_METADATA;
}

export default async function SeoCheckPage({ searchParams }: PageProps) {
  const { id } = await searchParams;
  const initialId = typeof id === 'string' && /^[A-Za-z0-9_-]{10,40}$/.test(id) ? id : undefined;
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  };

  return (
    <>
      <SeoCheckClient key={initialId ?? 'neu'} initialId={initialId} measureEnabled={metaCapiEnabled()} />

      <SeoCheckSections faq={FAQ} />

      <section className="bg-white py-12 md:py-16">
        <div className="mx-auto max-w-[800px] px-4 text-center md:px-6">
          <p className="text-[17px] leading-relaxed text-[var(--color-black)]">
            Du willst die Maßnahmen nicht selbst umsetzen? Wie wir dein Google-Profil, deine Seiten und deine
            Bewertungen aufbauen, steht auf unserer Seite{' '}
            <Link href="/seo" className="font-semibold text-[var(--color-blue)] underline underline-offset-2">
              SEO für Bielefeld und OWL
            </Link>
            .
          </p>
        </div>
      </section>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
    </>
  );
}
