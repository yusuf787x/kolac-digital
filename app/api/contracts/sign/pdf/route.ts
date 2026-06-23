import { NextResponse } from 'next/server';
import { adminDb, adminStorage } from '@/lib/firebase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Streamt das Original-PDF eines Vertrags an die öffentliche Signing-UI.
 *
 * Warum nicht direkt die Firebase-Storage-Download-URL nutzen? Browser
 * blocken cross-origin fetch() von Storage-URLs ohne explizite CORS-
 * Config am Bucket. react-pdf nutzt fetch unter der Haube — daher
 * proxen wir hier serverseitig durch unsere eigene Origin.
 *
 * Schutz: gleicher Signing-Token wie load/submit. Ohne gültigen Token
 * gibt es kein PDF.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get('token');
  if (!token) {
    return NextResponse.json({ error: 'Token fehlt.' }, { status: 400 });
  }
  const variant = url.searchParams.get('v') === 'signed' ? 'signed' : 'original';

  const db = adminDb();
  const snap = await db
    .collection('contracts')
    .where('signingToken', '==', token)
    .limit(1)
    .get();

  if (snap.empty) {
    return NextResponse.json(
      { error: 'Vertrag nicht gefunden.' },
      { status: 404 },
    );
  }
  const data = snap.docs[0].data();
  if (data.status === 'cancelled') {
    return NextResponse.json(
      { error: 'Vertrag wurde storniert.' },
      { status: 410 },
    );
  }
  const expMs: number | null = data.signingExpiresAt?.toMillis?.() ?? null;
  if (
    variant === 'original' &&
    data.status !== 'signed' &&
    expMs &&
    Date.now() > expMs
  ) {
    return NextResponse.json(
      { error: 'Der Signing-Link ist abgelaufen.' },
      { status: 410 },
    );
  }

  const path =
    variant === 'signed' ? data.signedPdfPath : data.originalPdfPath;
  if (!path) {
    return NextResponse.json(
      { error: 'PDF nicht verfügbar.' },
      { status: 404 },
    );
  }

  const bucket = adminStorage().bucket();
  const [buf] = await bucket.file(path).download();
  const bytes = new Uint8Array(buf);

  return new Response(bytes, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Length': String(bytes.length),
      'Cache-Control': 'private, max-age=0, no-store',
      // Erlaube den Same-Origin-Fetch von react-pdf sauber.
      'Access-Control-Allow-Origin': '*',
    },
  });
}
