import { getPublishedPosts } from '@/lib/blog-server';
import { site } from '@/lib/site-config';

export const revalidate = 600;

/**
 * Sitemap fuer den Blog. Getrennt von der statischen sitemap.xml,
 * damit neue Artikel ohne Deploy in die Suchmaschinen kommen.
 * In der robots.txt sind beide Sitemaps eingetragen.
 */
export async function GET() {
  let urls = '';
  try {
    const posts = await getPublishedPosts();
    urls = posts
      .map((p) => {
        const lastmod = (p.updatedAt ?? p.publishedAt)
          ?.toDate()
          .toISOString()
          .slice(0, 10);
        return `  <url>
    <loc>${site.baseUrl}/blog/${p.slug}</loc>${
      lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ''
    }
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`;
      })
      .join('\n');
  } catch {
    urls = '';
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${site.baseUrl}/blog</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
${urls}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=600',
    },
  });
}
