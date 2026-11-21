import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import SeoCheckClient from '../SeoCheckClient';
import SeoCheckSections, { FAQ_FUNNEL } from '../SeoCheckSections';
import FunnelSections from '../FunnelSections';
import { FUNNEL_VARIANTS } from '@/lib/seo-check/funnel';
import { metaCapiEnabled } from '@/lib/seo-check/meta-server';

/**
 * Branchen-Varianten des SEO-Checks als Landingpages für Anzeigen
 * (z. B. /seo-check/werkstatt). Gleiche Technik wie /seo-check, eigene
 * Überschrift, Branche im Formular vorausgewählt. Nicht in Google und
 * nicht in der Sitemap.
 */

type Props = {
  params: Promise<{ branche: string }>;
  searchParams: Promise<{ id?: string | string[] }>;
};

export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(FUNNEL_VARIANTS).map((branche) => ({ branche }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { branche } = await params;
  const v = FUNNEL_VARIANTS[branche];
  if (!v) return {};
  return {
    title: v.metaTitle,
    description: v.metaDescription,
    alternates: { canonical: `/seo-check/${v.slug}` },
    robots: { index: false, follow: false },
  };
}

export default async function SeoCheckBranchePage({ params, searchParams }: Props) {
  const { branche } = await params;
  const variant = FUNNEL_VARIANTS[branche];
  if (!variant) notFound();
  const { id } = await searchParams;
  const initialId = typeof id === 'string' && /^[A-Za-z0-9_-]{10,40}$/.test(id) ? id : undefined;

  return (
    <>
      <SeoCheckClient key={initialId ?? 'neu'} initialId={initialId} variant={variant} measureEnabled={metaCapiEnabled()} />
      <FunnelSections variant={variant} />
      <SeoCheckSections faq={FAQ_FUNNEL} showChecked={false} />
    </>
  );
}
