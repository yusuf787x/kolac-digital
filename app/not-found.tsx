import type { Metadata } from 'next';
import Link from 'next/link';
import { Inter } from 'next/font/google';
import SiteHeader from '@/components/marketing/SiteHeader';
import SiteFooter from '@/components/marketing/SiteFooter';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: '404 · Diese Seite ist ohne System | Kolac Digital',
  description:
    'Diese Unterseite existiert nicht. Zurück zur Startseite von Kolac Digital, Webagentur Bielefeld für Webseiten mit System.',
  robots: { index: false, follow: false },
};

/**
 * Custom 404 fuer alle nicht-gefundenen Routen unter der Next.js App.
 * Nutzt die Marketing-Shell (Header, Footer, style.css) inline, weil
 * app/not-found.tsx nur das root layout bekommt und dort kein Header
 * eingebunden ist. Statisch — kein JS, kein Fetch.
 */
export default function NotFound() {
  return (
    <div
      className={`${inter.className} min-h-screen bg-white text-gray-900 site-marketing-shell`}
    >
      <link rel="stylesheet" href="/css/style.css" />

      <SiteHeader ctaHref="/webseiten" ctaLabel="Webseite mit System" />

      <main className="site-marketing-main">
        <section className="notfound-section">
          <div className="container">
            <div className="notfound-inner">
              <div className="notfound-code" aria-hidden="true">
                404
              </div>
              <div className="section-label">SEITE NICHT GEFUNDEN</div>
              <h1 className="notfound-headline">
                Diese Seite ist ohne System.
              </h1>
              <p className="notfound-explain">
                <strong>404</strong> heißt: die Unterseite, die du aufrufen
                wolltest, gibt es hier nicht. Vielleicht ein Tippfehler in
                der URL, ein alter Link von woanders, oder wir haben die
                Seite umbenannt. Kein Grund zur Panik.
              </p>
              <p className="notfound-explain">
                Passt eigentlich zu unserem Motto:{' '}
                <em>Webseiten mit System</em>. Diese Route steht gerade nicht
                im System. Aber der Rest schon.
              </p>

              <div className="notfound-actions">
                <Link href="/" className="btn btn-primary">
                  Zurück zur Startseite
                </Link>
                <Link href="/portfolio" className="btn btn-outline">
                  Zu unseren Projekten
                </Link>
                <Link
                  href="/webseiten"
                  className="notfound-link-secondary"
                >
                  Oder: Webseite mit System entdecken →
                </Link>
              </div>

              <div className="notfound-help">
                Findest du nichts Passendes? Ruf uns direkt an unter{' '}
                <a href="tel:+4917695762018">0176 95762018</a> oder schreib
                an{' '}
                <a href="mailto:yusuf@kolac-digital.de">
                  yusuf@kolac-digital.de
                </a>
                . Wir melden uns innerhalb von 24 Stunden.
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
