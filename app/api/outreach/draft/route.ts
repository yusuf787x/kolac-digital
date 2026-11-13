import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { adminDb } from '@/lib/firebase-admin';
import type { OutreachLead } from '@/lib/outreach';
import { DraftError, DraftSkip, generateDraft, generateFollowup } from '@/lib/outreach-draft';
import { badRequest, requireAdmin, safe } from '@/lib/seo/server/admin-route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST { id }  erste DM und Nachfass-Text fuer einen noch nicht angeschriebenen
 * Betrieb schreiben (Dashboard, angemeldet) und am Betrieb speichern.
 * POST { id, followup: true }  nur die Nachfass-Nachricht fuer einen angeschriebenen
 * Betrieb (Status "gesendet"), passend zur DM, die rausging.
 */
async function handlePOST(req: Request) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  const body = (await req.json().catch(() => null)) as { id?: string; followup?: boolean } | null;
  const id = body?.id?.trim();
  if (!id) return badRequest('id fehlt.');

  const ref = adminDb().collection('outreachLeads').doc(id);
  const snap = await ref.get();
  if (!snap.exists) return badRequest('Betrieb nicht gefunden.', 404);
  const lead = { id, ...snap.data() } as OutreachLead;
  if (body?.followup) {
    if (lead.status !== 'gesendet') return badRequest('Nachfassen geht nur bei Betrieben im Status „Gesendet“.');
    if (lead.channel === 'mail') return badRequest('Für Mail-Betriebe die Nachfass-Mail über „Mail schreiben“ erzeugen.');
    try {
      const r = await generateFollowup(lead);
      await ref.update({ followup: r.followup, updatedAt: new Date().toISOString() });
      return NextResponse.json({ followup: r.followup, warnings: r.warnings });
    } catch (err) {
      if (err instanceof DraftError) return NextResponse.json({ error: `${err.message} Bitte noch einmal versuchen.` }, { status: 502 });
      if (err instanceof Anthropic.APIError) return NextResponse.json({ error: `Claude ist gerade nicht erreichbar (${err.status ?? 'Netzwerk'}).` }, { status: 502 });
      throw err;
    }
  }
  if (lead.status !== 'neu') return badRequest('Der Betrieb ist schon angeschrieben, der Text bleibt wie er war.');

  try {
    const r = await generateDraft(lead);
    await ref.update({ dm: r.dm, followup: r.followup, updatedAt: new Date().toISOString() });
    return NextResponse.json({ dm: r.dm, followup: r.followup, warnings: r.warnings });
  } catch (err) {
    if (err instanceof DraftSkip) return NextResponse.json({ error: `Claude rät ab: ${err.message}` }, { status: 422 });
    if (err instanceof DraftError) return NextResponse.json({ error: `${err.message} Bitte noch einmal versuchen.` }, { status: 502 });
    if (err instanceof Anthropic.RateLimitError) {
      return NextResponse.json({ error: 'Gerade zu viele Anfragen an Claude. In einer Minute noch einmal versuchen.' }, { status: 429 });
    }
    if (err instanceof Anthropic.APIError) {
      console.error('Anthropic API error:', err.status, err.message);
      return NextResponse.json({ error: `Claude ist gerade nicht erreichbar (${err.status ?? 'Netzwerk'}). Bitte später noch einmal.` }, { status: 502 });
    }
    throw err;
  }
}

export const POST = safe(handlePOST);
