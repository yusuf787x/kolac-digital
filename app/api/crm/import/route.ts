import { NextResponse } from 'next/server';
import { authenticate, authErrorResponse } from '@/lib/server-auth';
import { importCandidates, runImport } from '@/lib/crm-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** Vorschau: Kontakte aus SEO-Checks, Outreach und Terminen ohne Akte. */
export async function GET(req: Request) {
  const errResp = authErrorResponse(await authenticate(req));
  if (errResp) return errResp;
  try {
    return NextResponse.json(await importCandidates());
  } catch (err) {
    console.error('[crm/import] Vorschau:', err);
    return NextResponse.json({ error: 'Vorschau konnte nicht geladen werden.' }, { status: 500 });
  }
}

/** Legt für die ausgewählten Schlüssel Akten an (Daten werden neu gelesen). */
export async function POST(req: Request) {
  const errResp = authErrorResponse(await authenticate(req));
  if (errResp) return errResp;
  const body = (await req.json().catch(() => ({}))) as { keys?: unknown };
  const keys = Array.isArray(body.keys) ? body.keys.filter((k): k is string => typeof k === 'string').slice(0, 1000) : [];
  if (keys.length === 0) return NextResponse.json({ error: 'Nichts ausgewählt.' }, { status: 400 });
  try {
    return NextResponse.json(await runImport(keys));
  } catch (err) {
    console.error('[crm/import] Übernahme:', err);
    return NextResponse.json({ error: 'Übernahme fehlgeschlagen.' }, { status: 500 });
  }
}
