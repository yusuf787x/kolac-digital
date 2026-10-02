import { portfolioProjects } from '@/lib/portfolio';
import { caseStudies } from '@/lib/case-studies';
import { renderUrlset, xmlResponse, type SitemapEntry } from '@/lib/sitemap-xml';

/**
 * Sitemap fuer alle festen Seiten. Portfolio und Case Studys kommen
 * direkt aus den Datendateien, neue Projekte landen also automatisch
 * hier. Die Datumsangaben bitte nur anpassen, wenn sich der Inhalt
 * der Seite wirklich geaendert hat. Google ignoriert lastmod, wenn
 * es sich als unzuverlaessig erweist.
 */

const PORTFOLIO_LASTMOD: Record<string, string> = {
  paderpuls: '2026-09-18',
  'akquise-helfer': '2026-09-10',
};
const PORTFOLIO_LASTMOD_DEFAULT = '2026-08-23';

const CASE_STUDY_LASTMOD: Record<string, string> = {
  'akquise-helfer': '2026-09-10',
};
const CASE_STUDY_LASTMOD_DEFAULT = '2026-08-14';

export function GET() {
  const entries: SitemapEntry[] = [
    {
      path: '/',
      lastmod: '2026-09-18',
      changefreq: 'weekly',
      priority: 1.0,
      images: ['/images/Logo Lang Schwarz.png'],
    },
    {
      path: '/webseiten',
      lastmod: '2026-08-14',
      changefreq: 'weekly',
      priority: 0.9,
      images: ['/images/bacara-website.webp'],
    },
    {
      path: '/ki-beratung',
      lastmod: '2026-10-01',
      changefreq: 'monthly',
      priority: 0.8,
    },
    {
      path: '/case-studys',
      lastmod: '2026-09-10',
      changefreq: 'monthly',
      priority: 0.7,
    },
    {
      path: '/portfolio',
      lastmod: '2026-09-18',
      changefreq: 'monthly',
      priority: 0.7,
    },
    ...caseStudies.map(
      (cs): SitemapEntry => ({
        path: `/case-studys/${cs.slug}`,
        lastmod: CASE_STUDY_LASTMOD[cs.slug] ?? CASE_STUDY_LASTMOD_DEFAULT,
        changefreq: 'monthly',
        priority: 0.6,
        images: cs.screenshot ? [cs.screenshot] : undefined,
      }),
    ),
    ...portfolioProjects.map(
      (p): SitemapEntry => ({
        path: `/portfolio/${p.slug}`,
        lastmod: PORTFOLIO_LASTMOD[p.slug] ?? PORTFOLIO_LASTMOD_DEFAULT,
        changefreq: 'monthly',
        priority: 0.6,
        images: p.overviewImage ? [p.overviewImage] : undefined,
      }),
    ),
    {
      path: '/impressum.html',
      lastmod: '2026-08-14',
      changefreq: 'yearly',
      priority: 0.2,
    },
    {
      path: '/datenschutz.html',
      lastmod: '2026-08-14',
      changefreq: 'yearly',
      priority: 0.2,
    },
    {
      path: '/agb.html',
      lastmod: '2026-08-14',
      changefreq: 'yearly',
      priority: 0.2,
    },
  ];

  return xmlResponse(renderUrlset(entries));
}
