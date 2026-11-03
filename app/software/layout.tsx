import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { site } from '@/lib/site-config';
import SiteHeader from '@/components/marketing/SiteHeader';
import SiteFooter from '@/components/marketing/SiteFooter';

/**
 * Layout für /software. Nutzt wie /webseiten die
 * Bausteine der Startseite (SiteHeader + SiteFooter),
 * damit alle Marketing-Seiten optisch identisch bleiben. Das dazu
 * gehörige Styling kommt aus public/css/style.css und wird per link
 * aus dem Root-Layout eingebunden.
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

export default function SoftwareLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className={`${inter.className} min-h-screen bg-white text-gray-900 site-marketing-shell`}
    >
      {/* Styles der Startseite (Navbar, Footer, Farb-Variablen, Buttons)
          werden auf dieser Seite aktiviert. Der <link> lebt im Layout,
          damit /software alle Home-Styles erbt, ohne dass sie auch
          im Dashboard geladen werden. */}
      <link rel="stylesheet" href="/css/style.css" />

      <SiteHeader ctaHref="#kontakt" ctaLabel="Projekt anfragen" />

      <main className="site-marketing-main">{children}</main>

      <SiteFooter />
    </div>
  );
}
