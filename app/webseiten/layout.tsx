import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { site } from '@/lib/site-config';

/**
 * Eigenes Layout für die öffentliche Webseiten Landingpage.
 * Überschreibt das Root-Layout-Robots Setting (Dashboard ist noindex).
 */
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
    <div className="min-h-screen bg-white text-gray-900">
      <header className="sticky top-0 z-30 border-b border-gray-100 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center">
            <Image
              src="/images/Logo Lang Schwarz.png"
              alt="Kolac Digital"
              width={150}
              height={36}
              priority
            />
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-medium text-gray-700 md:flex">
            <a href="#leistungen" className="hover:text-gray-900">
              Was du bekommst
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

      <footer className="border-t border-gray-100 bg-gray-50">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
            <div>
              <Image
                src="/images/Logo Lang Schwarz.png"
                alt="Kolac Digital"
                width={140}
                height={34}
              />
              <p className="mt-3 max-w-md text-sm text-gray-600">
                Webseiten und digitale Systeme aus {site.city}. Für Firmen in
                OWL und ganz Nordrhein Westfalen.
              </p>
            </div>
            <div className="text-sm text-gray-700">
              <p className="font-medium text-gray-900">{site.legalName}</p>
              <p>{site.street}</p>
              <p>
                {site.zip} {site.city}
              </p>
              <p className="mt-2">
                <a
                  href={`tel:${site.phoneE164}`}
                  className="text-gray-700 hover:text-brand-blue"
                >
                  {site.phone}
                </a>
              </p>
              <p>
                <a
                  href={`mailto:${site.email}`}
                  className="text-gray-700 hover:text-brand-blue"
                >
                  {site.email}
                </a>
              </p>
            </div>
          </div>
          <div className="mt-8 flex flex-col items-start justify-between gap-3 border-t border-gray-200 pt-6 text-xs text-gray-500 md:flex-row md:items-center">
            <p>© {new Date().getFullYear()} {site.legalName}. Alle Rechte vorbehalten.</p>
            <div className="flex gap-4">
              <a href="/impressum.html" className="hover:text-gray-800">
                Impressum
              </a>
              <a href="/datenschutz.html" className="hover:text-gray-800">
                Datenschutz
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
