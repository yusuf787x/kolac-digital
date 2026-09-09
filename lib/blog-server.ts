import 'server-only';
import { adminDb } from './firebase-admin';
import type { BlogPost } from './types';

/**
 * Serverseitiger Zugriff auf die Blog-Artikel.
 *
 * Die oeffentlichen Blog-Seiten werden ohne angemeldeten Nutzer
 * gerendert. Die Firestore-Rules lassen nur den Inhaber lesen,
 * deshalb laeuft der Zugriff hier ueber das Admin-SDK. Nebeneffekt:
 * Entwuerfe koennen gar nicht erst nach aussen gelangen, weil in
 * diesen Funktionen immer auf `published` gefiltert wird.
 */

/** Firestore-Rohdaten in einen BlogPost umwandeln. */
function toPost(id: string, data: FirebaseFirestore.DocumentData): BlogPost {
  return { id, ...data } as BlogPost;
}

export async function getPublishedPosts(): Promise<BlogPost[]> {
  const snap = await adminDb()
    .collection('blogPosts')
    .where('status', '==', 'published')
    .get();
  const posts = snap.docs.map((d) => toPost(d.id, d.data()));
  // Sortierung im Code, damit kein zusammengesetzter Index noetig ist.
  return posts.sort((a, b) => {
    const am = a.publishedAt?.toMillis?.() ?? 0;
    const bm = b.publishedAt?.toMillis?.() ?? 0;
    return bm - am;
  });
}

export async function getPublishedPostBySlug(
  slug: string,
): Promise<BlogPost | null> {
  const snap = await adminDb()
    .collection('blogPosts')
    .where('slug', '==', slug)
    .where('status', '==', 'published')
    .limit(1)
    .get();
  if (snap.empty) return null;
  const d = snap.docs[0];
  return toPost(d.id, d.data());
}
