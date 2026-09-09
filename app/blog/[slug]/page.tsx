import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  getPublishedPostBySlug,
  getPublishedPosts,
} from '@/lib/blog-server';
import { site } from '@/lib/site-config';
import { formatDateDE } from '@/lib/utils';
import { extractHeadings } from '@/lib/blog-markdown';
import ArticleBody from '@/components/marketing/ArticleBody';
import BlogCta from '@/components/marketing/BlogCta';
import type { BlogPost } from '@/lib/types';

export const revalidate = 600;
/** Unbekannte Slugs zur Laufzeit nachrendern statt 404 beim Build. */
export const dynamicParams = true;

interface Props {
  params: { slug: string };
}

export async function generateStaticParams() {
  try {
    const posts = await getPublishedPosts();
    return posts.map((p) => ({ slug: p.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await getPublishedPostBySlug(params.slug).catch(() => null);
  if (!post || post.status !== 'published') return {};
  const url = `${site.baseUrl}/blog/${post.slug}`;
  return {
    title: post.metaTitle,
    description: post.metaDescription,
    keywords: post.targetKeywords,
    alternates: { canonical: url },
    openGraph: {
      type: 'article',
      locale: 'de_DE',
      url,
      title: post.metaTitle,
      description: post.metaDescription,
      siteName: 'Kolac Digital',
      publishedTime: post.publishedAt?.toDate().toISOString(),
    },
    twitter: {
      card: 'summary_large_image',
      title: post.metaTitle,
      description: post.metaDescription,
    },
  };
}

export default async function BlogArticlePage({ params }: Props) {
  const post = await getPublishedPostBySlug(params.slug).catch(() => null);
  if (!post || post.status !== 'published') notFound();

  let related: BlogPost[] = [];
  try {
    const all = await getPublishedPosts();
    related = all
      .filter((p) => p.slug !== post.slug)
      // Gleiche Kategorie zuerst, danach der Rest.
      .sort((a, b) => {
        const aSame = a.category === post.category ? 0 : 1;
        const bSame = b.category === post.category ? 0 : 1;
        return aSame - bSame;
      })
      .slice(0, 3);
  } catch {
    related = [];
  }

  const url = `${site.baseUrl}/blog/${post.slug}`;
  const headings = extractHeadings(post.body);
  const published = post.publishedAt?.toDate();

  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.metaDescription,
    inLanguage: 'de-DE',
    mainEntityOfPage: url,
    datePublished: published?.toISOString(),
    dateModified: post.updatedAt?.toDate().toISOString(),
    author: {
      '@type': 'Person',
      name: 'Yusuf Kolac',
      url: site.baseUrl,
      jobTitle: 'Gründer und Geschäftsführer',
      worksFor: {
        '@type': 'Organization',
        name: 'Kolac Digital',
        url: site.baseUrl,
      },
    },
    publisher: {
      '@type': 'Organization',
      name: 'Kolac Digital',
      url: site.baseUrl,
    },
    keywords: post.targetKeywords.join(', '),
    articleSection: post.category,
    ...(post.heroImageUrl
      ? {
          image: post.heroImageUrl.startsWith('http')
            ? post.heroImageUrl
            : `${site.baseUrl}${post.heroImageUrl}`,
        }
      : {}),
  };

  const faqJsonLd =
    post.faq.length > 0
      ? {
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: post.faq.map((f) => ({
            '@type': 'Question',
            name: f.question,
            acceptedAnswer: { '@type': 'Answer', text: f.answer },
          })),
        }
      : null;

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
      { '@type': 'ListItem', position: 3, name: post.title, item: url },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      {faqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      )}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <article className="article-page">
        <div className="container">
          <div className="article-breadcrumb">
            <Link href="/blog">Ratgeber</Link>
            <span aria-hidden="true"> · </span>
            <span>{post.category}</span>
          </div>

          <header className="article-header">
            {post.heroImageUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={post.heroImageUrl}
                alt={post.imageAlt || post.title}
                className="article-hero-image"
              />
            ) : (
              <div className="article-emoji" aria-hidden="true">
                {post.heroEmoji}
              </div>
            )}
            <h1 className="article-title">{post.title}</h1>
            <p className="article-meta">
              Von Yusuf Kolac
              {published && ` · ${formatDateDE(published)}`}
              {` · ${post.readingMinutes} Min. Lesezeit`}
            </p>
          </header>

          {/* Kurzantwort. Der Baustein, den KI-Systeme am ehesten
              zitieren, weil er ohne Vorwissen verstaendlich ist. */}
          <div className="article-tldr">
            <span className="article-tldr-label">Kurz gesagt</span>
            <p>{post.tldr}</p>
          </div>

          {post.keyTakeaways && post.keyTakeaways.length > 0 && (
            <div className="article-takeaways">
              <span className="article-takeaways-label">
                Alles auf einen Blick
              </span>
              <ul>
                {post.keyTakeaways.map((k, i) => (
                  <li key={i}>{k}</li>
                ))}
              </ul>
            </div>
          )}

          {headings.length > 2 && (
            <nav className="article-toc" aria-label="Inhalt">
              <span className="article-toc-label">Inhalt</span>
              <ol>
                {headings.map((h) => (
                  <li key={h.id}>
                    <a href={`#${h.id}`}>{h.text}</a>
                  </li>
                ))}
              </ol>
            </nav>
          )}

          <ArticleBody markdown={post.body} />

          {post.faq.length > 0 && (
            <section className="article-faq">
              <h2>Häufige Fragen dazu</h2>
              {post.faq.map((f, i) => (
                <details key={i} className="article-faq-item">
                  <summary>{f.question}</summary>
                  <p>{f.answer}</p>
                </details>
              ))}
            </section>
          )}

          <BlogCta />

          {related.length > 0 && (
            <section className="article-related">
              <h2>Weiterlesen</h2>
              <div className="article-related-grid">
                {related.map((r) => (
                  <Link
                    key={r.slug}
                    href={`/blog/${r.slug}`}
                    className="blog-card"
                  >
                    <div className="blog-card-emoji" aria-hidden="true">
                      {r.heroEmoji}
                    </div>
                    <span className="blog-card-category">{r.category}</span>
                    <h3 className="blog-card-title">{r.title}</h3>
                    <p className="blog-card-excerpt">{r.excerpt}</p>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      </article>
    </>
  );
}
