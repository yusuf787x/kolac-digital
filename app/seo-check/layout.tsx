import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { site } from '@/lib/site-config';
import SeoCheckHeader from './SeoCheckHeader';
import SiteFooter from '@/components/marketing/SiteFooter';
import MetaConsent, { CookieSettingsLink } from './MetaConsent';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  metadataBase: new URL(site.baseUrl),
  robots: { index: true, follow: true },
};

export default function SeoCheckLayout({ children }: { children: React.ReactNode }) {
  // Meta-Pixel nur hier auf den Check-Seiten und nur nach Einwilligung. Ohne ID: kein Banner, kein Pixel.
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim() || undefined;
  return (
    <div className={`${inter.className} min-h-screen bg-white text-gray-900 site-marketing-shell`}>
      <link rel="stylesheet" href="/css/style.css" />
      <SeoCheckHeader />
      <main className="site-marketing-main">{children}</main>
      <CookieSettingsLink pixelId={pixelId} />
      <SiteFooter />
      <MetaConsent pixelId={pixelId} />
    </div>
  );
}
