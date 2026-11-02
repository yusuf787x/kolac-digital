import { NextResponse } from 'next/server';
import { ADMIN_SESSION_TTL_MS, startAdminSession } from '@/lib/portal/login';
import { cookieBase, SESSION_COOKIE } from '@/lib/portal/session';
import { OWNER_EMAIL } from '@/lib/owner';
import { errorResponse, loadClientOr404, requireAdmin, safe } from '@/lib/seo/server/admin-route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Admin: Portal eines Kunden so oeffnen, wie der Kunde es sieht.
 * Body: { customerId }. Setzt eine Portal-Sitzung im Cookie, danach
 * funktioniert /portal mit allen Unterseiten und PDFs ohne Login.
 */
async function handlePOST(req: Request) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  const body = await req.json().catch(() => ({}));
  const client = await loadClientOr404(body.customerId);
  if (client instanceof NextResponse) return client;
  try {
    const token = await startAdminSession({
      email: OWNER_EMAIL,
      customerId: client.customerId,
      userAgent: req.headers.get('user-agent') ?? '',
    });
    const res = NextResponse.json({ ok: true });
    res.cookies.set(SESSION_COOKIE, token, { ...cookieBase, maxAge: ADMIN_SESSION_TTL_MS / 1000 });
    return res;
  } catch (err) {
    return errorResponse(err);
  }
}

export const POST = safe(handlePOST);
