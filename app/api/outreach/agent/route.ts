import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { OUTREACH_MANUAL_FIELDS, type OutreachLead } from '@/lib/outreach';
import { badRequest, safe } from '@/lib/seo/server/admin-route';
import { clientFromToken } from '@/lib/seo/server/token-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const COL = 'outreachLeads';
/** Nur der eigene Schluessel von Kolac Digital darf hier schreiben, nie der eines Kunden. */
const OWN_DOMAIN = 'kolac-digital.de';
const MAX_BATCH = 400;

/**
 * Schnittstelle fuer scripts/outreach/sync.mjs (Claude Code).
 *
 * POST Authorization: Bearer kdp_... (Schluessel aus .env.local von kolac-digital-web)
 *   { action: "pull" }                  → alle Betriebe
 *   { action: "push", leads: [...] }    → anlegen oder Recherche-Felder aktualisieren
 *   { action: "legacy" }                → alte Cold-Call-Leads (nur lesen)
 *
 * Ein Push ueberschreibt nie Status, Versanddaten oder Notizen aus dem
 * Dashboard, und Texte nur, solange der Betrieb noch nicht angeschrieben ist.
 */
async function handlePOST(req: Request) {
  const client = await clientFromToken(req, 'outreach', 120);
  if (client instanceof NextResponse) return client;
  if (client.domain?.replace(/^www\./, '') !== OWN_DOMAIN) return badRequest('Dieser Schlüssel darf keine Outreach-Daten ändern.', 403);

  const body = (await req.json().catch(() => null)) as { action?: string; leads?: unknown } | null;
  const db = adminDb();

  if (body?.action === 'pull') {
    const snap = await db.collection(COL).get();
    return NextResponse.json({ leads: snap.docs.map((d) => ({ id: d.id, ...d.data() })) });
  }

  // Alte Cold-Call-Leads (Collection "leads", Modul entfernt), nur lesen, fuer die Instagram-Suche
  if (body?.action === 'legacy') {
    const snap = await db.collection('leads').get();
    const pick = ['company', 'contactName', 'website', 'websiteAge', 'category', 'city', 'street', 'zip', 'rating', 'reviewCount', 'googleMapsUrl', 'status', 'notes'] as const;
    return NextResponse.json({
      leads: snap.docs.map((d) => {
        const data = d.data();
        return { id: d.id, ...Object.fromEntries(pick.filter((k) => data[k] !== undefined && data[k] !== '').map((k) => [k, data[k]])) };
      }),
    });
  }

  if (body?.action === 'push') {
    if (!Array.isArray(body.leads)) return badRequest('leads fehlt.');
    const incoming = (body.leads as Partial<OutreachLead>[]).filter((l) => typeof l?.id === 'string' && /^[\w-]{3,120}$/.test(l.id) && l.name);
    if (incoming.length > MAX_BATCH) return badRequest(`Höchstens ${MAX_BATCH} Betriebe pro Aufruf.`);

    const refs = incoming.map((l) => db.collection(COL).doc(l.id!));
    const existing = refs.length ? await db.getAll(...refs) : [];
    const batch = db.batch();
    let created = 0;
    let updated = 0;
    const now = new Date().toISOString();

    incoming.forEach((lead, i) => {
      const snap = existing[i];
      const data: Record<string, unknown> = { ...lead };
      delete data.id;
      for (const k of OUTREACH_MANUAL_FIELDS) delete data[k];
      // Firestore lehnt undefined ab
      for (const [k, v] of Object.entries(data)) if (v === undefined) delete data[k];
      data.updatedAt = now;

      if (!snap.exists) {
        batch.set(refs[i], { ...data, status: 'neu' });
        created++;
        return;
      }
      const cur = snap.data() as OutreachLead;
      if (cur.status !== 'neu') {
        delete data.dm;
        delete data.followup;
      }
      // Ein im Dashboard eingetragenes Instagram-Profil hat Vorrang
      if (cur.instagram) delete data.instagram;
      batch.set(refs[i], data, { merge: true });
      updated++;
    });

    await batch.commit();
    return NextResponse.json({ ok: true, created, updated });
  }

  return badRequest('Unbekannte Aktion. Erlaubt: pull, push.');
}

export const POST = safe(handlePOST);
