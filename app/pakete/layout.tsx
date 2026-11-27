import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { site } from '@/lib/site-config';
import SiteHeader from '@/components/marketing/SiteHeader';
import SiteFooter from '@/components/marketing/SiteFooter';

/**
 * Paketübersicht mit Monatspreisen fürs Kundengespräch.
 * Preise gehören nicht auf öffentliche Landingpages und nicht in Anzeigen,
 * darum noindex, nicht in der Sitemap und von keiner Seite verlinkt.
 */

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  metadataBase: new URL(site.baseUrl),
  title: 'Website-Pakete und Preise | Kolac Digital',
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
};

export default function PaketeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${inter.className} min-h-screen bg-white text-gray-900 site-marketing-shell`}>
      <link rel="stylesheet" href="/css/style.css" />
      <SiteHeader ctaHref="/webseiten" ctaLabel="Unsere Websites" />
      <main className="site-marketing-main">{children}</main>
      <SiteFooter />
    </div>
  );
}
