import 'server-only';
import type { BlogPost } from './types';

/**
 * Serverseitiger Zugriff auf die Blog-Artikel.
 *
 * Die oeffentlichen Blog-Seiten werden ohne angemeldeten Nutzer
 * gerendert. Deshalb gibt es zwei Wege, und es wird der genommen,
 * der gerade funktioniert:
 *
 * 1. Admin-SDK. Umgeht die Firestore-Regeln, braucht aber ein
 *    Dienstkonto in den Umgebungsvariablen.
 * 2. Normales SDK ohne Anmeldung. Funktioniert, sobald die
 *    Firestore-Regeln veroeffentlichte Artikel oeffentlich lesbar
 *    machen (siehe firestore.rules).
 *
 * In beiden Faellen wird immer auf `published` gefiltert. Entwuerfe
 * koennen also nicht nach aussen gelangen.
 */

/** Sortiert die neuesten Artikel nach vorn. */
function sortByPublished(posts: BlogPost[]): BlogPost[] {
  return posts.sort((a, b) => {
    const am = a.publishedAt?.toMillis?.() ?? 0;
    const bm = b.publishedAt?.toMillis?.() ?? 0;
    return bm - am;
  });
}

async function viaAdmin(): Promise<BlogPost[]> {
  const { adminDb } = await import('./firebase-admin');
  const snap = await adminDb()
    .collection('blogPosts')
    .where('status', '==', 'published')
    .get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as BlogPost);
}

async function viaPublic(): Promise<BlogPost[]> {
  const { getDocs, query, where, collection } = await import(
    'firebase/firestore'
  );
  const { db } = await import('./firebase');
  const snap = await getDocs(
    query(collection(db, 'blogPosts'), where('status', '==', 'published')),
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as BlogPost);
}

export async function getPublishedPosts(): Promise<BlogPost[]> {
  try {
    return sortByPublished(await viaAdmin());
  } catch (adminErr) {
    console.warn(
      'Blog: Admin-Zugriff nicht moeglich, versuche oeffentlichen Weg.',
      (adminErr as Error).message,
    );
    try {
      return sortByPublished(await viaPublic());
    } catch (publicErr) {
      console.error(
        'Blog: Auch der oeffentliche Zugriff scheitert. Entweder ein Dienstkonto hinterlegen oder die Firestore-Regeln veroeffentlichen.',
        (publicErr as Error).message,
      );
      return [];
    }
  }
}

export async function getPublishedPostBySlug(
  slug: string,
): Promise<BlogPost | null> {
  // Ueber die Liste zu gehen spart eine zweite Abfrage-Variante und
  // damit einen zusaetzlichen Firestore-Index. Bei der zu erwartenden
  // Artikelzahl ist das unkritisch.
  const posts = await getPublishedPosts();
  return posts.find((p) => p.slug === slug) ?? null;
}
