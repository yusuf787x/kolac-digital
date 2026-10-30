import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { badRequest, errorResponse, requireAdmin } from '@/lib/seo/server/admin-route';
import { deleteSeoClientData, markDemoReleased, startDemoClient } from '@/lib/seo/server/demo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Admin: Testkunde. Body: { action: 'start' | 'release-old' | 'delete', customerId? }
 * Ablauf und Gruende siehe lib/seo/server/demo.ts. Die Monate und Berichte
 * erzeugt der Browser einzeln ueber /api/seo/fetch und /api/seo/report.
 */
export async function POST(req: Request) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  const body = await req.json().catch(() => ({}));
  try {
    if (body.action === 'start') {
      return NextResponse.json({ ok: true, ...(await startDemoClient()) });
    }
    if (body.action === 'release-old') {
      if (typeof body.customerId !== 'string') return badRequest('customerId fehlt.');
      await markDemoReleased(body.customerId);
      return NextResponse.json({ ok: true });
    }
    if (body.action === 'delete') {
      const snap = await adminDb().collection('seoClients').where('demo', '==', true).get();
      for (const d of snap.docs) await deleteSeoClientData(d.id, { deleteCustomer: true });
      return NextResponse.json({ ok: true, deleted: snap.size });
    }
    return badRequest('Unbekannte Aktion.');
  } catch (err) {
    return errorResponse(err);
  }
}
