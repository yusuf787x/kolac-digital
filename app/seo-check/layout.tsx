import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { site } from '@/lib/site-config';
import SeoCheckHeader from './SeoCheckHeader';
import SiteFooter from '@/components/marketing/SiteFooter';

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
  return (
    <div className={`${inter.className} min-h-screen bg-white text-gray-900 site-marketing-shell`}>
      <link rel="stylesheet" href="/css/style.css" />
      <SeoCheckHeader />
      <main className="site-marketing-main">{children}</main>
      <SiteFooter />
    </div>
  );
}
