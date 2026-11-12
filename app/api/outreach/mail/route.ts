import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { adminDb } from '@/lib/firebase-admin';
import { isMailLead, type OutreachLead } from '@/lib/outreach';
import { DraftError, DraftSkip, generateMail } from '@/lib/outreach-draft';
import { findEmail } from '@/lib/outreach-email';
import { badRequest, requireAdmin, safe } from '@/lib/seo/server/admin-route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST { id }  fuer einen Betrieb ohne passendes Instagram (channel "mail"):
 * E-Mail-Adresse von der Website holen, falls noch keine da ist, und Mail mit
 * Website-Auswertung plus Nachfass-Mail schreiben. Yusuf schickt selbst ab.
 */
async function handlePOST(req: Request) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  const body = (await req.json().catch(() => null)) as { id?: string } | null;
  const id = body?.id?.trim();
  if (!id) return badRequest('id fehlt.');

  const ref = adminDb().collection('outreachLeads').doc(id);
  const snap = await ref.get();
  if (!snap.exists) return badRequest('Betrieb nicht gefunden.', 404);
  const lead = { id, ...snap.data() } as OutreachLead;
  if (!isMailLead(lead)) return badRequest('Der Betrieb steht nicht auf „per Mail“.');
  if (lead.status !== 'neu') return badRequest('Der Betrieb ist schon angeschrieben, die Mail bleibt wie sie war.');

  const email = lead.email || (lead.website ? await findEmail(lead.website) : null);

  try {
    const r = await generateMail(lead);
    const patch = {
      mailSubject: r.subject,
      mailBody: r.body,
      mailFollowup: r.followup,
      ...(email && !lead.email ? { email } : {}),
      updatedAt: new Date().toISOString(),
    };
    await ref.update(patch);
    return NextResponse.json({ ...patch, emailFound: !!email, warnings: r.warnings });
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
