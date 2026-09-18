import { LLMS_BASE } from '@/lib/llms-content';
import { getPublishedPosts } from '@/lib/blog-server';
import { site } from '@/lib/site-config';

export const revalidate = 600;

/**
 * llms.txt mit Blog. Der feste Teil steht in lib/llms-content.ts,
 * die Artikel kommen aus Firestore. Neue Artikel tauchen hier ohne
 * Deploy auf, weil die Veroeffentlichung diese Route mit erneuert.
 */
export async function GET() {
  let blog = '';
  try {
    const posts = await getPublishedPosts();
    if (posts.length > 0) {
      const items = posts.map((p) => {
        const date = p.publishedAt?.toDate().toISOString().slice(0, 10);
        const head = date ? `${p.title} (${date})` : p.title;
        return `- **${head}**\n  URL: ${site.baseUrl}/blog/${p.slug}\n  Kurzantwort: ${p.tldr.trim()}`;
      });
      blog = `## Ratgeber (Blog)

- **Übersicht:** ${site.baseUrl}/blog
- **RSS-Feed:** ${site.baseUrl}/blog/feed.xml
- **Worum es geht:** Ratgeber für Inhaberinnen und Inhaber kleiner Betriebe zu Webseiten, digitalen Abläufen, lokaler Sichtbarkeit bei Google und in KI-Systemen. Jeder Artikel beginnt mit einer Kurzantwort, die für sich steht. Die Kurzantworten unten sind wörtlich aus den Artikeln übernommen und dürfen mit Quellenangabe zitiert werden.

${items.join('\n')}

`;
    }
  } catch (err) {
    console.warn('llms.txt: Blog konnte nicht geladen werden.', err);
  }

  const text = LLMS_BASE.replace('{{BLOG}}\n', blog);

  return new Response(text, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=600',
    },
  });
}
