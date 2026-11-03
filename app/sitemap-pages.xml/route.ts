import { portfolioProjects, findPortfolioProject } from '@/lib/portfolio';
import { caseStudies } from '@/lib/case-studies';
import { branchenSeiten } from '@/lib/branchen-seiten';
import { staedteSeiten } from '@/lib/staedte-seiten';
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
  wagenpuls: '2026-10-13',
};
const PORTFOLIO_LASTMOD_DEFAULT = '2026-08-23';

const CASE_STUDY_LASTMOD: Record<string, string> = {
  'akquise-helfer': '2026-09-10',
  wagenpuls: '2026-10-13',
};
const CASE_STUDY_LASTMOD_DEFAULT = '2026-08-14';

const BRANCHEN_LASTMOD_DEFAULT = '2026-11-03';
const STAEDTE_LASTMOD_DEFAULT = '2026-11-03';

export function GET() {
  const entries: SitemapEntry[] = [
    {
      path: '/',
      lastmod: '2026-11-03',
      changefreq: 'weekly',
      priority: 1.0,
      images: ['/images/Logo Lang Schwarz.png'],
    },
    {
      path: '/webseiten',
      lastmod: '2026-11-03',
      changefreq: 'weekly',
      priority: 0.9,
      images: ['/images/bacara-website.webp'],
    },
    ...branchenSeiten.map(
      (b): SitemapEntry => ({
        path: `/webseiten/${b.slug}`,
        lastmod: BRANCHEN_LASTMOD_DEFAULT,
        changefreq: 'monthly',
        priority: 0.8,
        images: [findPortfolioProject(b.portfolioSlug)?.overviewImage].filter(
          (i): i is string => Boolean(i),
        ),
      }),
    ),
    ...staedteSeiten.map(
      (st): SitemapEntry => ({
        path: `/webdesign/${st.slug}`,
        lastmod: STAEDTE_LASTMOD_DEFAULT,
        changefreq: 'monthly',
        priority: 0.8,
        images: [findPortfolioProject(st.referenzen[0])?.overviewImage].filter(
          (i): i is string => Boolean(i),
        ),
      }),
    ),
    {
      path: '/software',
      lastmod: '2026-11-03',
      changefreq: 'monthly',
      priority: 0.9,
      images: ['/images/wagenpuls/ueberblick.webp'],
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
