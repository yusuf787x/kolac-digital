import type { Metadata } from 'next';
import SeoCheckClient from './SeoCheckClient';
import SeoCheckSections, { FAQ } from './SeoCheckSections';
import { metaCapiEnabled } from '@/lib/seo-check/meta-server';

type PageProps = { searchParams: Promise<{ id?: string | string[] }> };

const BASE_METADATA: Metadata = {
  title: 'Kostenloser SEO-Check: Wird deine Website bei Google gefunden? | Kolac Digital',
  description:
    'Kostenloser SEO-Check für lokale Unternehmen: Technik, Inhalte, Platzierungen bei Google und lokale Auffindbarkeit in rund 30 Sekunden. Mit deinen 5 wichtigsten Maßnahmen.',
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

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
    </>
  );
}
