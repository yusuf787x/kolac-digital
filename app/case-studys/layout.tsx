import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { site } from '@/lib/site-config';
import SiteHeader from '@/components/marketing/SiteHeader';
import SiteFooter from '@/components/marketing/SiteFooter';

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

/**
 * Layout fuer den Case-Study-Bereich. Nutzt die identischen Header-/
 * Footer-Bausteine wie die Startseite und /webseiten. Styling kommt
 * aus public/css/style.css.
 */
export default function CaseStudysLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className={`${inter.className} min-h-screen bg-white text-gray-900 site-marketing-shell`}
    >
      <link rel="stylesheet" href="/css/style.css" />

      <SiteHeader ctaHref="/webseiten" ctaLabel="Webseite mit System" />

      <main className="site-marketing-main">{children}</main>

      <SiteFooter />
    </div>
  );
}
