import { NextResponse } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Öffentlicher Endpoint, der per Signing-Token einen Vertrag lädt und
 * die für die Signing-UI nötigen Felder zurückgibt. Die PDF-URL ist ein
 * Firebase-Storage-Download-Link mit eigenem Token, kann also direkt
 * vom Browser geladen werden.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get('token');
  if (!token) {
    return NextResponse.json({ error: 'Token fehlt.' }, { status: 400 });
  }

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

  const docSnap = snap.docs[0];
  const data = docSnap.data();

  if (data.status === 'cancelled') {
    return NextResponse.json(
      { error: 'Vertrag wurde storniert.' },
      { status: 410 },
    );
  }
  if (data.status === 'signed') {
    return NextResponse.json(
      {
        alreadySigned: true,
        signedPdfUrl: data.signedPdfUrl ?? null,
      },
      { status: 200 },
    );
  }

  const expiresAtMs: number | null =
    data.signingExpiresAt?.toMillis?.() ?? null;
  if (expiresAtMs && Date.now() > expiresAtMs) {
    return NextResponse.json(
      { error: 'Der Signing-Link ist abgelaufen.' },
      { status: 410 },
    );
  }

  // Best-effort "viewed"-Audit (nur, wenn nicht schon mal gesetzt).
  const audit = Array.isArray(data.audit) ? data.audit : [];
  const alreadyViewed = audit.some(
    (a: { event?: string }) => a?.event === 'viewed',
  );
  if (!alreadyViewed) {
    const ip = getClientIp(req);
    const ua = req.headers.get('user-agent') ?? undefined;
    audit.push({
      at: Timestamp.now(),
      event: 'viewed',
      ip: ip ?? undefined,
      userAgent: ua,
    });
    await docSnap.ref.update({ audit });
  }

  return NextResponse.json({
    id: docSnap.id,
    title: data.title,
    typeLabel: data.typeLabel,
    customerCompany: data.customerSnapshot?.company ?? '',
    fields: data.fields ?? [],
    // Eigene Proxy-URL statt direkte Firebase-Storage-URL, damit
    // react-pdf das PDF cross-origin sauber per fetch laden kann.
    originalPdfUrl: `/api/contracts/sign/pdf?token=${encodeURIComponent(token)}`,
    expiresAt: expiresAtMs,
  });
}

function getClientIp(req: Request): string | null {
  const xfwd = req.headers.get('x-forwarded-for');
  if (xfwd) return xfwd.split(',')[0].trim();
  const real = req.headers.get('x-real-ip');
  if (real) return real;
  return null;
}
