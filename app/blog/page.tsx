import type { Metadata } from 'next';
import { getPublishedPosts } from '@/lib/blog-server';
import { site } from '@/lib/site-config';
import { formatDateDE } from '@/lib/utils';
import { normalizeSearch } from '@/lib/blog-tracking';
import BlogCta from '@/components/marketing/BlogCta';
import BlogBrowser, {
  type BlogListItem,
} from '@/components/marketing/BlogBrowser';
import { BLOG_CATEGORIES, type BlogPost } from '@/lib/types';

/** Alle 10 Minuten nach neuen Artikeln schauen. */
export const revalidate = 600;

export const metadata: Metadata = {
  title: 'Ratgeber für Webseiten und digitale Abläufe | Kolac Digital',
  description:
    'Praxisnahe Beiträge zu Webseiten mit System, digitalen Abläufen, SEO und Google Ads. Von der Webagentur Kolac Digital aus Bielefeld, geschrieben für Betriebe in OWL und ganz Deutschland.',
  alternates: {
    canonical: `${site.baseUrl}/blog`,
    types: { 'application/rss+xml': `${site.baseUrl}/blog/feed.xml` },
  },
  openGraph: {
    type: 'website',
    locale: 'de_DE',
    url: `${site.baseUrl}/blog`,
    title: 'Ratgeber für Webseiten und digitale Abläufe | Kolac Digital',
    description:
      'Praxisnahe Beiträge zu Webseiten mit System, digitalen Abläufen, SEO und Google Ads.',
    siteName: 'Kolac Digital',
  },
};

export default async function BlogIndexPage() {
  let posts: BlogPost[] = [];
  try {
    posts = await getPublishedPosts();
  } catch {
    // Wenn Firestore beim Build nicht erreichbar ist, lieber eine leere
    // Uebersicht ausliefern als den Build scheitern lassen.
    posts = [];
  }

  const byCategory = new Map<string, BlogPost[]>();
  for (const p of posts) {
    const list = byCategory.get(p.category) ?? [];
    list.push(p);
    byCategory.set(p.category, list);
  }

  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Ratgeber von Kolac Digital',
    numberOfItems: posts.length,
    itemListElement: posts.map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${site.baseUrl}/blog/${p.slug}`,
      name: p.title,
    })),
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Startseite',
        item: `${site.baseUrl}/`,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Ratgeber',
        item: `${site.baseUrl}/blog`,
      },
    ],
  };

  // Kategorien in der festen Reihenfolge, nur die mit Beitraegen.
  const categories = BLOG_CATEGORIES.filter((c) => byCategory.has(c));
  const items: BlogListItem[] = posts.map((p) => ({
    id: p.id,
    slug: p.slug,
    title: p.title,
    excerpt: p.excerpt,
    category: p.category,
    heroEmoji: p.heroEmoji,
    heroImageUrl: p.heroImageUrl ?? null,
    imageAlt: p.imageAlt ?? '',
    readingMinutes: p.readingMinutes,
    publishedLabel: p.publishedAt ? formatDateDE(p.publishedAt.toDate()) : '',
    searchText: normalizeSearch(
      [
        p.title,
        p.excerpt,
        p.tldr,
        p.category,
        ...(p.targetKeywords ?? []),
        ...(p.keyTakeaways ?? []),
      ].join(' '),
    ),
  }));

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <section className="blog-hero">
        <div className="container">
          <div className="blog-hero-inner">
            <div className="section-label">RATGEBER</div>
            <h1 className="blog-hero-headline">
              Was wir über Webseiten und digitale Abläufe gelernt haben
            </h1>
            <p className="blog-hero-subline">
              Keine Theorie, sondern das, was bei unseren Kunden tatsächlich
              funktioniert. Verständlich geschrieben, auch wenn du mit
              Technik nichts am Hut hast.
            </p>
          </div>
        </div>
      </section>

      <section className="blog-list-section">
        <div className="container">
          {posts.length === 0 ? (
            <div className="blog-empty">
              <p>
                Hier entstehen gerade die ersten Beiträge. Schau in ein paar
                Tagen nochmal vorbei, oder sprich uns direkt an.
              </p>
            </div>
          ) : (
            <BlogBrowser posts={items} categories={categories} />
          )}

          <div className="blog-cta-wrap">
            <BlogCta />
          </div>
        </div>
      </section>
    </>
  );
}
