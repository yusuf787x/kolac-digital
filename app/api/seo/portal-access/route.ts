import { NextResponse } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase-admin';
import { ACCESS_COL, isValidEmail, normalizeEmail } from '@/lib/portal/access';
import { revokeAccess, sendLoginLink } from '@/lib/portal/login';
import { badRequest, errorResponse, loadClientOr404, requireAdmin, safe } from '@/lib/seo/server/admin-route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Admin: Portal-Zugaenge verwalten.
 * Body: { action: 'invite' | 'resend' | 'revoke', customerId, email }
 *   invite  Adresse freischalten und direkt den ersten Link schicken
 *   resend  neuen Login-Link schicken
 *   revoke  Zugang entziehen, laufende Sessions werden sofort ungueltig
 */
async function handlePOST(req: Request) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  const body = await req.json().catch(() => ({}));
  const email = normalizeEmail(body.email);
  if (!isValidEmail(email)) return badRequest('Bitte eine gültige E-Mail-Adresse angeben.');
  const client = await loadClientOr404(body.customerId);
  if (client instanceof NextResponse) return client;

  const ref = adminDb().collection(ACCESS_COL).doc(email);
  try {
    switch (body.action) {
      case 'invite': {
        const snap = await ref.get();
        const cur = snap.data();
        if (cur?.active && cur.customerId !== client.customerId) {
          return badRequest('Diese Adresse ist bereits für einen anderen Kunden freigeschaltet.', 409);
        }
        await ref.set(
          {
            email,
            customerId: client.customerId,
            active: true,
            invitedAt: Timestamp.now(),
            revokedAt: null,
            ...(snap.exists ? {} : { loginCount: 0, lastLoginAt: null, uid: null }),
          },
          { merge: true },
        );
        await sendLoginLink({ email, nonceHash: null, invite: true });
        return NextResponse.json({ ok: true });
      }
      case 'resend': {
        const sent = await sendLoginLink({ email, nonceHash: null });
        if (!sent) return badRequest('Diese Adresse ist nicht freigeschaltet.');
        return NextResponse.json({ ok: true });
      }
      case 'revoke': {
        const snap = await ref.get();
        if (snap.data()?.customerId !== client.customerId) return badRequest('Zugang nicht gefunden.', 404);
        await revokeAccess(email);
        return NextResponse.json({ ok: true });
      }
      default:
        return badRequest('Unbekannte Aktion.');
    }
  } catch (err) {
    return errorResponse(err);
  }
}

export const POST = safe(handlePOST);
