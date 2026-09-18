import type { Metadata } from 'next';
import Link from 'next/link';
import { getPublishedPosts } from '@/lib/blog-server';
import { site } from '@/lib/site-config';
import { formatDateDE } from '@/lib/utils';
import BlogCta from '@/components/marketing/BlogCta';
import type { BlogPost } from '@/lib/types';

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

  const featured = posts[0];
  const rest = posts.slice(1);

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
            <>
              {featured && (
                <Link
                  href={`/blog/${featured.slug}`}
                  className="blog-featured"
                >
                  {featured.heroImageUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={featured.heroImageUrl}
                      alt={featured.imageAlt || featured.title}
                      className="blog-featured-image"
                    />
                  ) : (
                    <div className="blog-featured-emoji" aria-hidden="true">
                      {featured.heroEmoji}
                    </div>
                  )}
                  <div className="blog-featured-body">
                    <span className="blog-card-category">
                      {featured.category}
                    </span>
                    <h2 className="blog-featured-title">{featured.title}</h2>
                    <p className="blog-featured-excerpt">{featured.excerpt}</p>
                    <span className="blog-card-meta">
                      {featured.publishedAt &&
                        formatDateDE(featured.publishedAt.toDate())}
                      {' · '}
                      {featured.readingMinutes} Min. Lesezeit
                    </span>
                  </div>
                </Link>
              )}

              {rest.length > 0 && (
                <div className="blog-grid">
                  {rest.map((p) => (
                    <Link
                      key={p.slug}
                      href={`/blog/${p.slug}`}
                      className="blog-card"
                    >
                      {p.heroImageUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={p.heroImageUrl}
                          alt={p.imageAlt || p.title}
                          className="blog-card-image"
                        />
                      ) : (
                        <div className="blog-card-emoji" aria-hidden="true">
                          {p.heroEmoji}
                        </div>
                      )}
                      <span className="blog-card-category">{p.category}</span>
                      <h2 className="blog-card-title">{p.title}</h2>
                      <p className="blog-card-excerpt">{p.excerpt}</p>
                      <span className="blog-card-meta">
                        {p.publishedAt &&
                          formatDateDE(p.publishedAt.toDate())}
                        {' · '}
                        {p.readingMinutes} Min.
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </>
          )}

          <div className="blog-cta-wrap">
            <BlogCta />
          </div>
        </div>
      </section>
    </>
  );
}
