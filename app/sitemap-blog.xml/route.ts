import { getPublishedPosts } from '@/lib/blog-server';
import { renderUrlset, xmlResponse, type SitemapEntry } from '@/lib/sitemap-xml';

export const revalidate = 600;

/**
 * Sitemap fuer den Ratgeber. Getrennt von den festen Seiten, damit
 * neue Artikel ohne Deploy in die Suchmaschinen kommen. Der Index
 * unter /sitemap.xml verweist auf diese Datei.
 */
export async function GET() {
  const entries: SitemapEntry[] = [];
  let newest: string | undefined;

  try {
    const posts = await getPublishedPosts();
    for (const p of posts) {
      const lastmod = (p.updatedAt ?? p.publishedAt)
        ?.toDate()
        .toISOString()
        .slice(0, 10);
      if (lastmod && (!newest || lastmod > newest)) newest = lastmod;
      entries.push({
        path: `/blog/${p.slug}`,
        lastmod,
        changefreq: 'monthly',
        priority: 0.7,
        images: p.heroImageUrl ? [p.heroImageUrl] : undefined,
      });
    }
  } catch {
    // Ohne Artikel bleibt wenigstens die Uebersicht in der Sitemap.
  }

  entries.unshift({
    path: '/blog',
    lastmod: newest,
    changefreq: 'weekly',
    priority: 0.8,
  });

  return xmlResponse(renderUrlset(entries));
}
