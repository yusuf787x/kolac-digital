import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { badRequest, errorResponse, requireAdmin } from '@/lib/seo/server/admin-route';
import { createDemoClient, deleteSeoClientData } from '@/lib/seo/server/demo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/** Admin: Testkunde anlegen oder komplett loeschen. Body: { action: 'create' | 'delete' } */
export async function POST(req: Request) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  const body = await req.json().catch(() => ({}));
  try {
    if (body.action === 'create') {
      const customerId = await createDemoClient();
      return NextResponse.json({ ok: true, customerId });
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
