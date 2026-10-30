import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { endSession } from '@/lib/portal/login';
import { SESSION_COOKIE } from '@/lib/portal/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  await endSession(token).catch(() => undefined);
  const res = NextResponse.redirect(new URL('/portal/login?abgemeldet=1', req.url), 303);
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
