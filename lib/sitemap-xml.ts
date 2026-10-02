import { site } from './site-config';

/**
 * Gemeinsamer XML-Baustein fuer die Sitemaps. sitemap.xml ist ein
 * Index und verweist auf sitemap-pages.xml und sitemap-blog.xml.
 */

export interface SitemapEntry {
  /** Pfad ab Domain, z.B. "/blog". */
  path: string;
  lastmod?: string;
  changefreq: 'weekly' | 'monthly' | 'yearly';
  priority: number;
  /** Bildpfade ab Domain oder absolute URLs. */
  images?: string[];
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function absolute(pathOrUrl: string): string {
  if (pathOrUrl.startsWith('http')) return pathOrUrl;
  return `${site.baseUrl}${encodeURI(pathOrUrl)}`;
}

export function renderUrlset(entries: SitemapEntry[]): string {
  const urls = entries
    .map((e) => {
      const lines = [`    <loc>${esc(absolute(e.path))}</loc>`];
      if (e.lastmod) lines.push(`    <lastmod>${e.lastmod}</lastmod>`);
      lines.push(`    <changefreq>${e.changefreq}</changefreq>`);
      lines.push(`    <priority>${e.priority.toFixed(1)}</priority>`);
      for (const img of e.images ?? []) {
        lines.push(
          `    <image:image>\n      <image:loc>${esc(absolute(img))}</image:loc>\n    </image:image>`,
        );
      }
      return `  <url>\n${lines.join('\n')}\n  </url>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls}
</urlset>`;
}

export function xmlResponse(xml: string): Response {
  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=600',
    },
  });
}
