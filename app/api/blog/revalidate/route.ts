import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { authenticate, authErrorResponse } from '@/lib/server-auth';

export const runtime = 'nodejs';

/**
 * Baut die Blog-Seiten sofort neu, statt bis zum naechsten
 * Zeitfenster zu warten. Wird aufgerufen, sobald ein Artikel
 * veroeffentlicht, geaendert oder zurueckgezogen wird.
 */
export async function POST(req: Request) {
  const auth = await authenticate(req);
  const errResp = authErrorResponse(auth);
  if (errResp) return errResp;

  let slug: string | undefined;
  try {
    const body = (await req.json()) as { slug?: string };
    slug = body.slug;
  } catch {
    // Ohne Angabe werden nur die Uebersichtsseiten erneuert.
  }

  const paths = ['/blog', '/sitemap-blog.xml'];
  if (slug) paths.push(`/blog/${slug}`);

  for (const p of paths) {
    try {
      revalidatePath(p);
    } catch (err) {
      console.warn('Erneuern fehlgeschlagen fuer', p, err);
    }
  }

  return NextResponse.json({ ok: true, erneuert: paths });
}
