import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { Inter } from 'next/font/google';
import { site } from '@/lib/site-config';

/**
 * Eigenes Layout für die öffentliche Webseiten-Landingpage.
 * Überschreibt das Root-Layout-Robots-Setting (Dashboard ist noindex).
 * Header + Footer angeglichen an die bestehende Homepage (CI-Look).
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

export default function WebseitenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`${inter.className} min-h-screen bg-white text-gray-900`}>
      {/* HEADER – passt zum Look der Homepage */}
      <header className="sticky top-0 z-30 border-b border-gray-100 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center" aria-label="Kolac Digital – Startseite">
            <Image
              src="/images/Logo Lang Schwarz.png"
              alt="Kolac Digital"
              width={150}
              height={36}
              priority
            />
          </Link>
          <nav className="hidden items-center gap-7 text-sm font-medium text-gray-700 md:flex">
            <a href="/#leistungen" className="hover:text-gray-900">
              Leistungen
            </a>
            <a href="#preise" className="hover:text-gray-900">
              Preise
            </a>
            <a href="#referenzen" className="hover:text-gray-900">
              Referenzen
            </a>
            <a href="#faq" className="hover:text-gray-900">
              Fragen
            </a>
          </nav>
          <a href="#kontakt" className="btn-primary">
            Anfrage starten
          </a>
        </div>
      </header>

      <main>{children}</main>

      {/* FOOTER – dunkles Theme wie auf der Homepage */}
      <footer className="bg-[#0a0a0a] text-gray-300">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:py-16">
          <div className="grid gap-10 md:grid-cols-[1fr_auto_auto] md:items-start">
            <div>
              <Link href="/" aria-label="Kolac Digital">
                <Image
                  src="/images/Mit Schrift Weiß Lang.png"
                  alt="Kolac Digital"
                  width={200}
                  height={56}
                  className="h-auto w-44"
                />
              </Link>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-gray-400">
                Webseiten und digitale Systeme aus {site.city}. Wir arbeiten
                für Firmen in OWL, NRW und ganz Deutschland.
              </p>

              <div className="mt-5 space-y-1 text-sm">
                <p className="font-medium text-white">{site.legalName}</p>
                <p>{site.street}</p>
                <p>
                  {site.zip} {site.city}
                </p>
                <p className="pt-2">
                  <a
                    href={`tel:${site.phoneE164}`}
                    className="hover:text-white"
                  >
                    {site.phone}
                  </a>
                </p>
                <p>
                  <a
                    href={`mailto:${site.email}`}
                    className="hover:text-white"
                  >
                    {site.email}
                  </a>
                </p>
              </div>
            </div>

            <div>
              <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
                Links
              </p>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="/#leistungen" className="hover:text-white">
                    Leistungen
                  </a>
                </li>
                <li>
                  <a href="/#about" className="hover:text-white">
                    Über uns
                  </a>
                </li>
                <li>
                  <a href="/#referenzen" className="hover:text-white">
                    Unsere Arbeit
                  </a>
                </li>
                <li>
                  <a href="/#kundenstimmen" className="hover:text-white">
                    Kundenstimmen
                  </a>
                </li>
                <li>
                  <a href="#kontakt" className="hover:text-white">
                    Kontakt
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
                Rechtliches
              </p>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="/impressum.html" className="hover:text-white">
                    Impressum
                  </a>
                </li>
                <li>
                  <a href="/datenschutz.html" className="hover:text-white">
                    Datenschutz
                  </a>
                </li>
                <li>
                  <a href="/agb.html" className="hover:text-white">
                    AGB
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <p className="mt-12 border-t border-white/10 pt-6 text-center text-xs text-gray-500">
            © 2019–{new Date().getFullYear()} {site.legalName} · {site.street},{' '}
            {site.zip} {site.city} · Alle Rechte vorbehalten.
          </p>
        </div>
      </footer>
    </div>
  );
}
