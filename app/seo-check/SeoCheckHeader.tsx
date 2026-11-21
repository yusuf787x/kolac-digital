'use client';

import { usePathname } from 'next/navigation';
import SiteHeader from '@/components/marketing/SiteHeader';

/**
 * Auf /seo-check die normale Navigation, auf den Branchen-Landingpages
 * (/seo-check/werkstatt usw.) nur das Logo, damit nichts ablenkt.
 */
export default function SeoCheckHeader() {
  const pathname = usePathname();
  if (pathname && pathname !== '/seo-check') return <SiteHeader minimal />;
  return <SiteHeader ctaHref="/seo-check" ctaLabel="Kostenloser SEO-Check" />;
}
