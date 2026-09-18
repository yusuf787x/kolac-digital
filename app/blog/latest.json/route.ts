import { NextResponse } from 'next/server';
import { getPublishedPosts } from '@/lib/blog-server';

export const revalidate = 600;

/**
 * Die neuesten Artikel als JSON fuer die statische Startseite.
 * Liegt bewusst unter /blog und nicht unter /api, weil /api in der
 * robots.txt gesperrt ist und Googlebot die Startseite sonst ohne
 * die Artikel rendern wuerde.
 */
export async function GET() {
  try {
    const posts = await getPublishedPosts();
    const latest = posts.slice(0, 3).map((p) => ({
      slug: p.slug,
      title: p.title,
      excerpt: p.excerpt,
      category: p.category,
      heroEmoji: p.heroEmoji,
      heroImageUrl: p.heroImageUrl,
      imageAlt: p.imageAlt,
      readingMinutes: p.readingMinutes,
      publishedAt: p.publishedAt?.toDate().toISOString() ?? null,
    }));
    return NextResponse.json(
      { posts: latest },
      {
        headers: { 'Cache-Control': 'public, max-age=0, s-maxage=600' },
      },
    );
  } catch (err) {
    console.warn('latest.json: Artikel konnten nicht geladen werden.', err);
    return NextResponse.json({ posts: [] });
  }
}
