import { NextResponse } from 'next/server';
import { loadClientOr404, parseMonth, requireAdmin, errorResponse } from '@/lib/seo/server/admin-route';
import { loadPortalData } from '@/lib/seo/server/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Admin: Portal-Ansicht inklusive nicht freigegebener Monate. GET ?customerId=...&month=... */
export async function GET(req: Request) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  const url = new URL(req.url);
  const client = await loadClientOr404(url.searchParams.get('customerId'));
  if (client instanceof NextResponse) return client;
  try {
    const data = await loadPortalData(client, parseMonth(url.searchParams.get('month')), true);
    return NextResponse.json(data, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (err) {
    return errorResponse(err);
  }
}
