import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { endSession, findSession } from '@/lib/portal/login';
import { SESSION_COOKIE } from '@/lib/portal/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = await findSession(token).catch(() => null);
  await endSession(token).catch(() => undefined);
  // Admin-Ansicht: zurueck zum Kunden im Dashboard statt zum Kunden-Login
  const target = session?.admin ? `/dashboard/seo/${session.customerId}` : '/portal/login?abgemeldet=1';
  const res = NextResponse.redirect(new URL(target, req.url), 303);
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
