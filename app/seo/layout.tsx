import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { site } from '@/lib/site-config';
import SiteHeader from '@/components/marketing/SiteHeader';
import SiteFooter from '@/components/marketing/SiteFooter';

/**
 * Layout für /seo und /seo/paderborn. Gleiche Bausteine wie /software
 * und /webseiten (SiteHeader + SiteFooter, Styles aus public/css/style.css).
 * Der Knopf oben rechts führt zum kostenlosen SEO-Check, das ist auf
 * diesen Seiten die Hauptaktion.
 */

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  metadataBase: new URL(site.baseUrl),
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function SeoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${inter.className} min-h-screen bg-white text-gray-900 site-marketing-shell`}>
      <link rel="stylesheet" href="/css/style.css" />
      <SiteHeader ctaHref="/seo-check" ctaLabel="Kostenloser SEO-Check" />
      <main className="site-marketing-main">{children}</main>
      <SiteFooter />
    </div>
  );
}
