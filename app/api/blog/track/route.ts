import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase-admin';
import { getPublishedPosts } from '@/lib/blog-server';
import { BLOG_CATEGORIES } from '@/lib/types';
import { normalizeSearch, type BlogReferrer } from '@/lib/blog-tracking';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Nimmt Zaehl-Ereignisse aus dem Ratgeber entgegen (siehe
 * lib/blog-tracking.ts) und schreibt nur Summen nach Firestore:
 *
 *   blogStats/{postId}        Summen je Artikel
 *   blogStatsDaily/{JJJJ-MM-TT} Tageswerte fuer den Verlauf
 *   blogSearches/{begriff}    Was im Ratgeber gesucht wurde
 *
 * Keine IP, kein Cookie, keine Kennung. Bots werden am User-Agent
 * aussortiert. Unbekannte Artikel-IDs werden verworfen, damit niemand
 * die Statistik mit erfundenen Eintraegen fuellt.
 */

const BOT_UA =
  /bot|crawl|spider|slurp|headless|lighthouse|preview|facebookexternalhit|embedly|curl|wget|python|node-fetch|axios/i;

const REFERRERS: BlogReferrer[] = [
  'google',
  'ki',
  'suche',
  'social',
  'intern',
  'direkt',
  'andere',
];

/** Veroeffentlichte Artikel kurz zwischenspeichern, spart Lesezugriffe. */
let postCache: { at: number; ids: Map<string, { slug: string; title: string }> } | null =
  null;

async function publishedIds() {
  if (postCache && Date.now() - postCache.at < 5 * 60 * 1000) return postCache.ids;
  const posts = await getPublishedPosts();
  const ids = new Map(posts.map((p) => [p.id, { slug: p.slug, title: p.title }]));
  postCache = { at: Date.now(), ids };
  return ids;
}

/** Tagesschluessel in deutscher Zeit, damit Mitternacht stimmt. */
function berlinDay(): string {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Berlin',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

const ok = () => new NextResponse(null, { status: 204 });

export async function POST(req: Request) {
  const ua = req.headers.get('user-agent') ?? '';
  if (!ua || BOT_UA.test(ua)) return ok();

  let ev: Record<string, unknown>;
  try {
    const text = await req.text();
    if (text.length > 2000) return ok();
    ev = JSON.parse(text);
  } catch {
    return ok();
  }

  const inc = FieldValue.increment(1);
  const now = FieldValue.serverTimestamp();
  const db = adminDb();
  const day = db.collection('blogStatsDaily').doc(berlinDay());

  try {
    switch (ev.type) {
      case 'index_view': {
        const ref = REFERRERS.includes(ev.ref as BlogReferrer)
          ? (ev.ref as BlogReferrer)
          : 'andere';
        await day.set(
          { date: berlinDay(), indexViews: inc, indexReferrers: { [ref]: inc } },
          { merge: true },
        );
        break;
      }

      case 'view':
      case 'read':
      case 'cta':
      case 'helpful': {
        const postId = typeof ev.postId === 'string' ? ev.postId : '';
        const post = (await publishedIds()).get(postId);
        if (!post) return ok();

        const stat = db.collection('blogStats').doc(postId);
        const base = { postId, slug: post.slug, title: post.title };

        if (ev.type === 'view') {
          const ref = REFERRERS.includes(ev.ref as BlogReferrer)
            ? (ev.ref as BlogReferrer)
            : 'andere';
          await Promise.all([
            stat.set(
              { ...base, views: inc, referrers: { [ref]: inc }, lastViewAt: now },
              { merge: true },
            ),
            day.set(
              { date: berlinDay(), views: inc, posts: { [postId]: inc } },
              { merge: true },
            ),
          ]);
        } else if (ev.type === 'read') {
          await Promise.all([
            stat.set({ ...base, reads: inc }, { merge: true }),
            day.set({ date: berlinDay(), reads: inc }, { merge: true }),
          ]);
        } else if (ev.type === 'cta') {
          await Promise.all([
            stat.set({ ...base, ctaClicks: inc }, { merge: true }),
            day.set({ date: berlinDay(), ctaClicks: inc }, { merge: true }),
          ]);
        } else {
          if (ev.value !== 'yes' && ev.value !== 'no') return ok();
          await stat.set(
            { ...base, [ev.value === 'yes' ? 'helpfulYes' : 'helpfulNo']: inc },
            { merge: true },
          );
        }
        break;
      }

      case 'search': {
        const term = normalizeSearch(typeof ev.term === 'string' ? ev.term : '').slice(0, 60);
        if (term.length < 3) return ok();
        const results =
          typeof ev.results === 'number' && Number.isFinite(ev.results)
            ? Math.max(0, Math.floor(ev.results))
            : 0;
        await db
          .collection('blogSearches')
          .doc(term.replace(/ /g, '_'))
          .set(
            {
              term,
              count: inc,
              lastResults: results,
              ...(results === 0 ? { zeroResults: inc } : {}),
              lastAt: now,
            },
            { merge: true },
          );
        break;
      }

      case 'category': {
        const category = ev.category as string;
        if (!BLOG_CATEGORIES.includes(category as (typeof BLOG_CATEGORIES)[number])) {
          return ok();
        }
        await day.set(
          { date: berlinDay(), categories: { [category]: inc } },
          { merge: true },
        );
        break;
      }
    }
  } catch (err) {
    // Zaehlen darf die Seite nie stoeren. Nur protokollieren.
    console.warn('Blog-Tracking fehlgeschlagen:', (err as Error).message);
  }
  return ok();
}
