import { getPublishedPosts } from '@/lib/blog-server';
import { site } from '@/lib/site-config';

export const revalidate = 600;

/**
 * RSS-Feed des Ratgebers. Google und Bing lesen Feeds als zweite
 * Sitemap, Feedreader und KI-Crawler finden neue Artikel darueber
 * ohne die Seite zu crawlen. In der Search Console laesst sich die
 * Feed-URL wie eine Sitemap einreichen.
 */
function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function GET() {
  let items = '';
  let newest: Date | null = null;
  try {
    const posts = await getPublishedPosts();
    newest = posts[0]?.publishedAt?.toDate() ?? null;
    items = posts
      .map((p) => {
        const url = `${site.baseUrl}/blog/${p.slug}`;
        const pub = p.publishedAt?.toDate().toUTCString();
        return `    <item>
      <title>${escapeXml(p.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>${
        pub ? `\n      <pubDate>${pub}</pubDate>` : ''
      }
      <category>${escapeXml(p.category)}</category>
      <description>${escapeXml(p.excerpt)}</description>
    </item>`;
      })
      .join('\n');
  } catch (err) {
    console.warn('Feed: Artikel konnten nicht geladen werden.', err);
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Ratgeber von Kolac Digital</title>
    <link>${site.baseUrl}/blog</link>
    <atom:link href="${site.baseUrl}/blog/feed.xml" rel="self" type="application/rss+xml" />
    <description>Ratgeber für kleine Betriebe zu Webseiten, digitalen Abläufen und Sichtbarkeit bei Google und in KI-Systemen. Von Kolac Digital, Webagentur aus Bielefeld.</description>
    <language>de-DE</language>${
      newest ? `\n    <lastBuildDate>${newest.toUTCString()}</lastBuildDate>` : ''
    }
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=600',
    },
  });
}
