import 'server-only';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { adminDb } from './firebase-admin';
import { companyDomainFromEmail, normalizeDomain } from './crm-shared';
import type { CustomerLifecycle } from './types';

/**
 * Serverseitige Kundenakte: Akten automatisch anlegen (SEO-Check
 * freigeschaltet, Kontaktformular) und die einmalige Übernahme alter
 * Kontakte (SEO-Checks, Outreach, Termine) vorbereiten.
 */

const OWN_DOMAIN = 'kolac-digital.de';

export interface AkteInput {
  company?: string;
  name?: string;
  email?: string;
  phone?: string;
  website?: string;
  street?: string;
  zip?: string;
  city?: string;
  source: string;
  lifecycle?: CustomerLifecycle;
  notes?: string;
  outreachLeadId?: string;
  importedFrom?: string;
  /** Branche aus dem SEO-Check (für den Anruf-Leitfaden). */
  branche?: string;
  wantsCall?: boolean;
}

function splitName(name: string | undefined): { firstName: string; lastName: string } {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: '', lastName: '' };
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  return { firstName: parts.slice(0, -1).join(' '), lastName: parts[parts.length - 1] };
}

/** Sucht eine bestehende Akte über Mail, Website-Domain oder Outreach-Lead. */
export async function findAkte(input: Pick<AkteInput, 'email' | 'website' | 'outreachLeadId'>): Promise<string | null> {
  const db = adminDb();
  const col = db.collection('customers');
  const email = (input.email ?? '').trim().toLowerCase();
  if (input.outreachLeadId) {
    const s = await col.where('outreachLeadId', '==', input.outreachLeadId).limit(1).get();
    if (!s.empty) return s.docs[0].id;
  }
  if (email) {
    const s = await col.where('email', '==', email).limit(1).get();
    if (!s.empty) return s.docs[0].id;
    const c = await db.collection('contacts').where('email', '==', email).limit(1).get();
    if (!c.empty) return (c.docs[0].data().customerId as string) ?? null;
  }
  const domain = normalizeDomain(input.website) || companyDomainFromEmail(email);
  if (domain) {
    const s = await col.where('website', '==', domain).limit(1).get();
    if (!s.empty) return s.docs[0].id;
  }
  return null;
}

/** Altkunden haben oft kein Feld „website“: dann über die Domain ihrer Mail-Adresse finden. */
async function findAkteByDomainScan(input: Pick<AkteInput, 'email' | 'website'>): Promise<string | null> {
  const domain = normalizeDomain(input.website) || companyDomainFromEmail(input.email);
  if (!domain) return null;
  const snap = await adminDb().collection('customers').select('website', 'email', 'retainerInvoiceEmail').get();
  const hit = snap.docs.find((d) => {
    const c = d.data();
    return (
      normalizeDomain(c.website) === domain ||
      companyDomainFromEmail(c.email) === domain ||
      companyDomainFromEmail(c.retainerInvoiceEmail) === domain
    );
  });
  return hit?.id ?? null;
}

const isSeoCheck = (input: Pick<AkteInput, 'source'>) => input.source.startsWith('SEO-Check');

export async function createAkte(input: AkteInput): Promise<string> {
  const email = (input.email ?? '').trim().toLowerCase();
  const domain = normalizeDomain(input.website) || companyDomainFromEmail(email);
  const { firstName, lastName } = splitName(input.name);
  const ref = await adminDb()
    .collection('customers')
    .add({
      company: (input.company ?? '').trim() || domain || `${firstName} ${lastName}`.trim(),
      salutation: 'Divers',
      firstName,
      lastName,
      street: input.street ?? '',
      zip: input.zip ?? '',
      city: input.city ?? '',
      email,
      phone: (input.phone ?? '').trim(),
      notes: input.notes ?? '',
      lifecycle: input.lifecycle ?? 'lead',
      website: domain,
      source: input.source,
      ...(input.outreachLeadId ? { outreachLeadId: input.outreachLeadId } : {}),
      ...(input.importedFrom ? { importedFrom: input.importedFrom } : {}),
      ...(input.branche ? { branche: input.branche } : {}),
      ...(input.wantsCall ? { wantsCall: true } : {}),
      ...(isSeoCheck(input) ? { seoCheckAt: FieldValue.serverTimestamp() } : {}),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  return ref.id;
}

/** Eintrag im Verlauf der Akte (erscheint als Notiz/Mail). */
export async function addAkteActivity(
  customerId: string,
  type: 'notiz' | 'email' | 'anruf' | 'meeting',
  description: string,
  emailSubject: string | null = null,
): Promise<void> {
  await adminDb().collection('activities').add({
    customerId,
    type,
    description,
    emailSubject,
    emailBody: null,
    dueDate: null,
    completed: true,
    completedAt: Timestamp.now(),
    createdAt: FieldValue.serverTimestamp(),
  });
}

/** Fällige Aufgabe in der Akte (erscheint oben im Verlauf und auf der Startseite). */
export async function addAkteTask(customerId: string, text: string, dueAt: Date = new Date()): Promise<void> {
  await adminDb().collection('activities').add({
    customerId,
    type: 'anruf',
    description: text,
    emailSubject: null,
    emailBody: null,
    dueDate: Timestamp.fromDate(dueAt),
    completed: false,
    completedAt: null,
    createdAt: FieldValue.serverTimestamp(),
  });
}

/** Leere Felder einer bestehenden Akte mit neuen Kontaktdaten füllen (nie überschreiben). */
async function enrichAkte(id: string, input: AkteInput): Promise<void> {
  const ref = adminDb().collection('customers').doc(id);
  const snap = await ref.get();
  const c = snap.data();
  if (!c) return;
  const patch: Record<string, unknown> = {};
  const email = (input.email ?? '').trim().toLowerCase();
  const { firstName, lastName } = splitName(input.name);
  if (!c.firstName && !c.lastName && (firstName || lastName)) Object.assign(patch, { firstName, lastName });
  if (!c.email && email) patch.email = email;
  if (!c.phone && input.phone?.trim()) patch.phone = input.phone.trim();
  const domain = normalizeDomain(input.website) || companyDomainFromEmail(email);
  if (!c.website && domain) patch.website = domain;
  // Akte aus einem Check ohne Kontaktdaten heißt erst wie die Domain: dann den echten Firmennamen nehmen.
  const company = (input.company ?? '').trim();
  if (company && (!c.company || c.company === c.website)) patch.company = company;
  if (!c.branche && input.branche) patch.branche = input.branche;
  if (input.wantsCall && !c.wantsCall) patch.wantsCall = true;
  // Jeder SEO-Check ist ein Lead, auch wenn die Akte schon aus Outreach o. Ä. stammt: zurück in die Anruf-Liste.
  if (isSeoCheck(input) && (c.lifecycle ?? 'kunde') !== 'kunde') {
    patch.seoCheckAt = FieldValue.serverTimestamp();
    if (c.callStatus === 'kein-interesse' || c.lifecycle === 'verloren') Object.assign(patch, { callStatus: 'neu', lifecycle: 'lead' });
    else if (c.callStatus === 'nicht-erreicht' || c.callStatus === 'spaeter') patch.nextStepAt = null;
  }
  if (Object.keys(patch).length === 0) return;
  await ref.update({ ...patch, updatedAt: FieldValue.serverTimestamp() });
}

/** Neue Anfrage (SEO-Check, Kontaktformular, Outreach-Antwort): Akte finden und ergänzen oder als Lead anlegen. */
export async function upsertLeadAkte(
  input: AkteInput,
  activity?: { type: 'notiz' | 'email'; text: string; subject?: string },
  task?: { text: string },
): Promise<string | null> {
  try {
    const email = (input.email ?? '').toLowerCase();
    if (email.endsWith(`@${OWN_DOMAIN}`) || normalizeDomain(input.website) === OWN_DOMAIN) return null;
    let id = (await findAkte(input)) ?? (await findAkteByDomainScan(input));
    if (id) await enrichAkte(id, input);
    else id = await createAkte(input);
    if (activity) await addAkteActivity(id, activity.type, activity.text, activity.subject ?? null);
    if (task) await addAkteTask(id, task.text);
    return id;
  } catch (err) {
    console.error('[crm] Akte konnte nicht angelegt werden:', err instanceof Error ? err.message : err);
    return null;
  }
}

// ===================================================================
// ÜBERNAHME ALTER KONTAKTE
// ===================================================================

export type CandidateKind = 'seo' | 'outreach' | 'termin';

export interface ImportCandidate {
  key: string;
  kinds: CandidateKind[];
  company: string;
  name: string;
  email: string;
  phone: string;
  website: string;
  city: string;
  street: string;
  zip: string;
  lifecycle: CustomerLifecycle;
  source: string;
  /** Was wir über den Kontakt wissen, eine Zeile je Quelle. */
  facts: string[];
  lastAt: number;
  /** Vorschlag: vorausgewählt in der Vorschau. */
  suggested: boolean;
  /** Outreach-Kontakt hat geantwortet (wird automatisch eine Akte). */
  replied?: boolean;
  branche?: string;
  outreachLeadId?: string;
}

const REPLIED = new Set(['geantwortet', 'termin', 'kunde', 'kein-interesse']);

function tsMs(v: unknown): number {
  if (!v) return 0;
  if (typeof v === 'number') return v;
  if (typeof v === 'string') return Date.parse(v) || 0;
  if (typeof (v as { toMillis?: () => number }).toMillis === 'function') return (v as { toMillis: () => number }).toMillis();
  return 0;
}

/** "Hauptstr. 1, 33602 Bielefeld" → Straße, PLZ, Ort. */
function splitAddress(address: string, fallbackCity: string): { street: string; zip: string; city: string } {
  const [first, ...rest] = address.split(',').map((p) => p.trim());
  const m = rest.join(' ').match(/(\d{5})\s+(.+)/);
  if (m) return { street: first ?? '', zip: m[1], city: m[2].replace(/,?\s*Deutschland$/i, '').trim() };
  return { street: rest.length ? (first ?? '') : '', zip: '', city: fallbackCity };
}

/** „/seo-check/autohaus“ → „autohaus“ (Branchen-Seite des SEO-Checks). */
export function brancheFromLanding(landing?: string): string | undefined {
  const m = (landing ?? '').match(/^\/seo-check\/([a-z-]+)/);
  return m?.[1] && m[1] !== 'bericht' ? m[1] : undefined;
}

const fmt = (ms: number) => (ms ? new Date(ms).toLocaleDateString('de-DE', { timeZone: 'Europe/Berlin' }) : '');

/** Alle Kontakte aus SEO-Checks, Outreach und Terminen, die noch keine Akte haben. */
export async function importCandidates(): Promise<{ candidates: ImportCandidate[]; existingMatches: number }> {
  const db = adminDb();
  const [custSnap, contactSnap, checkSnap, outreachSnap, meetingSnap] = await Promise.all([
    db.collection('customers').get(),
    db.collection('contacts').get(),
    db.collection('seoChecks').orderBy('createdAt', 'desc').limit(2000).get(),
    db.collection('outreachLeads').where('status', 'in', ['gesendet', 'nachgefasst', 'geantwortet', 'termin', 'kunde', 'kein-interesse']).get(),
    db.collection('meetings').orderBy('startAt', 'desc').limit(500).get(),
  ]);

  // Was schon eine Akte hat.
  const knownEmails = new Set<string>();
  const knownDomains = new Set<string>();
  const knownOutreach = new Set<string>();
  for (const d of custSnap.docs) {
    const c = d.data();
    const e = String(c.email ?? '').toLowerCase();
    if (e) knownEmails.add(e);
    const dom = normalizeDomain(c.website) || companyDomainFromEmail(e);
    if (dom) knownDomains.add(dom);
    if (c.outreachLeadId) knownOutreach.add(String(c.outreachLeadId));
  }
  for (const d of contactSnap.docs) {
    const e = String(d.data().email ?? '').toLowerCase();
    if (e) knownEmails.add(e);
  }

  const byKey = new Map<string, ImportCandidate>();
  let existingMatches = 0;
  const isKnown = (email: string, domain: string, outreachId?: string) =>
    (!!email && knownEmails.has(email)) || (!!domain && knownDomains.has(domain)) || (!!outreachId && knownOutreach.has(outreachId));

  /** Fasst Einträge mit gleicher Mail oder Domain zusammen. */
  const upsert = (c: ImportCandidate) => {
    const keys = [c.email && `e:${c.email}`, c.website && `d:${c.website}`, c.outreachLeadId && `o:${c.outreachLeadId}`].filter(Boolean) as string[];
    const hit = keys.map((k) => byKey.get(k)).find(Boolean);
    if (!hit) {
      keys.forEach((k) => byKey.set(k, c));
      return;
    }
    hit.kinds = [...new Set([...hit.kinds, ...c.kinds])];
    hit.facts.push(...c.facts);
    hit.company ||= c.company;
    hit.name ||= c.name;
    hit.email ||= c.email;
    hit.phone ||= c.phone;
    hit.website ||= c.website;
    hit.city ||= c.city;
    hit.street ||= c.street;
    hit.zip ||= c.zip;
    hit.outreachLeadId ||= c.outreachLeadId;
    hit.suggested ||= c.suggested;
    hit.replied ||= c.replied;
    hit.branche ||= c.branche;
    hit.lastAt = Math.max(hit.lastAt, c.lastAt);
    const rank: CustomerLifecycle[] = ['verloren', 'lead', 'interessent', 'kunde'];
    if (rank.indexOf(c.lifecycle) > rank.indexOf(hit.lifecycle)) hit.lifecycle = c.lifecycle;
    keys.forEach((k) => byKey.set(k, hit));
  };

  // SEO-Checks: pro Domain der neueste, freigeschaltete bevorzugt.
  for (const d of checkSnap.docs) {
    const x = d.data();
    if (!x.result || x.test || x.owner) continue;
    const domain = normalizeDomain(x.domain ?? x.result?.domain);
    if (!domain || domain === OWN_DOMAIN) continue;
    const lead = x.lead ?? null;
    const email = String(lead?.email ?? '').toLowerCase();
    if (isKnown(email, domain)) {
      existingMatches++;
      continue;
    }
    const at = tsMs(x.createdAt);
    upsert({
      key: `seo:${domain}`,
      kinds: ['seo'],
      company: lead?.company ?? '',
      name: lead?.name ?? '',
      email,
      phone: lead?.phone ?? '',
      website: domain,
      city: '',
      street: '',
      zip: '',
      lifecycle: 'lead',
      source: 'SEO-Check',
      facts: [`SEO-Check am ${fmt(at)}: ${x.score ?? x.result?.score ?? '?'}/100${lead ? ', Bericht freigeschaltet' : ', ohne Kontaktdaten'}${lead?.wantsCall ? ', möchte Rückruf' : ''}${x.source?.landing ? ` (über ${x.source.landing})` : ''}`],
      lastAt: at,
      suggested: !!lead,
      branche: lead?.branche ?? brancheFromLanding(x.source?.landing ?? lead?.source?.landing),
    });
  }

  // Outreach: angeschrieben (ohne Antwort optional) und alle mit Antwort.
  for (const d of outreachSnap.docs) {
    const o = d.data();
    const domain = normalizeDomain(o.website);
    const email = String(o.email ?? '').toLowerCase();
    if (isKnown(email, domain, d.id)) {
      existingMatches++;
      continue;
    }
    const replied = REPLIED.has(o.status) && (o.status !== 'kein-interesse' || !!o.repliedAt || (o.thread?.length ?? 0) > 0);
    const lifecycle: CustomerLifecycle =
      o.status === 'termin' ? 'interessent' : o.status === 'kunde' ? 'kunde' : o.status === 'kein-interesse' ? 'verloren' : 'lead';
    const channel = o.channel === 'mail' ? 'Mail' : o.tiktok && !o.instagram ? 'TikTok' : 'Instagram';
    const handle = o.instagram ? ` @${o.instagram}` : o.tiktok ? ` @${o.tiktok}` : '';
    upsert({
      key: `outreach:${d.id}`,
      kinds: ['outreach'],
      company: o.name ?? '',
      name: o.contact ?? '',
      email,
      phone: o.phone ?? '',
      website: domain,
      ...splitAddress(String(o.address ?? ''), String(o.city ?? '')),
      lifecycle,
      source: `Outreach ${channel}`,
      facts: [
        `Outreach (${channel}${handle}): ${o.status}${o.sentAt ? `, angeschrieben ${fmt(tsMs(o.sentAt))}` : ''}${o.repliedAt ? `, Antwort ${fmt(tsMs(o.repliedAt))}` : ''}`,
      ],
      lastAt: Math.max(tsMs(o.repliedAt), tsMs(o.followedUpAt), tsMs(o.sentAt)),
      suggested: replied,
      replied,
      outreachLeadId: d.id,
    });
  }

  // Termine: Gäste, die noch keiner Akte zugeordnet sind.
  for (const d of meetingSnap.docs) {
    const m = d.data();
    for (const g of (m.guests ?? []) as { email: string; name?: string; company?: string; source?: string }[]) {
      const email = String(g.email ?? '').toLowerCase();
      if (!email || email.endsWith(`@${OWN_DOMAIN}`) || g.source === 'kunde') continue;
      const domain = companyDomainFromEmail(email);
      if (isKnown(email, domain)) {
        existingMatches++;
        continue;
      }
      upsert({
        key: `termin:${email}`,
        kinds: ['termin'],
        company: g.company ?? '',
        name: g.name ?? '',
        email,
        phone: '',
        website: domain,
        city: '',
        street: '',
        zip: '',
        lifecycle: 'interessent',
        source: 'Termin',
        facts: [`Termin am ${fmt(tsMs(m.startAt))}: ${m.title ?? ''}${m.status === 'cancelled' ? ' (abgesagt)' : ''}`],
        lastAt: tsMs(m.startAt),
        suggested: false,
      });
    }
  }

  const unique = [...new Set(byKey.values())];
  // Stabiler Schlüssel: der erste Schlüssel des Eintrags.
  return { candidates: unique.sort((a, b) => b.lastAt - a.lastAt), existingMatches };
}

export async function runImport(keys: string[], opts: { note?: boolean; candidates?: ImportCandidate[] } = {}): Promise<{ created: number; skipped: number }> {
  const candidates = opts.candidates ?? (await importCandidates()).candidates;
  const wanted = new Set(keys);
  let created = 0;
  let skipped = 0;
  const stamp = `crm-import-${new Date().toISOString().slice(0, 10)}`;
  for (const c of candidates) {
    if (!wanted.has(c.key)) continue;
    if (await findAkte(c)) {
      skipped++;
      continue;
    }
    const id = await createAkte({
      company: c.company,
      name: c.name,
      email: c.email,
      phone: c.phone,
      website: c.website,
      city: c.city,
      street: c.street,
      zip: c.zip,
      source: c.source,
      lifecycle: c.lifecycle,
      outreachLeadId: c.outreachLeadId,
      importedFrom: stamp,
      branche: c.branche,
    });
    if (opts.note !== false) await addAkteActivity(id, 'notiz', `Aus der Übernahme: ${c.facts.join(' · ')}`);
    created++;
  }
  return { created, skipped };
}

/**
 * Automatik: jeder öffentliche SEO-Check und jeder Outreach-Kontakt mit Antwort
 * bekommt eine Akte. Läuft beim Öffnen der Kontaktliste, höchstens alle 10 Minuten.
 */
export async function syncAutoAkten(force = false): Promise<{ created: number; skipped: boolean }> {
  const db = adminDb();
  const stateRef = db.collection('settings').doc('crm_sync');
  const state = (await stateRef.get()).data() ?? {};
  const last = Number(state.lastRunAt ?? 0);
  if (!force && Date.now() - last < 10 * 60 * 1000) return { created: 0, skipped: true };
  await stateRef.set({ lastRunAt: Date.now() }, { merge: true });
  if (!state.seoBackfill) {
    await backfillSeoCheckAt();
    await stateRef.set({ seoBackfill: Date.now() }, { merge: true });
  }
  const { candidates } = await importCandidates();
  const auto = candidates.filter((c) => c.kinds.includes('seo') || c.replied);
  if (auto.length === 0) return { created: 0, skipped: false };
  const { created } = await runImport(
    auto.map((c) => c.key),
    { note: false, candidates: auto },
  );
  return { created, skipped: false };
}

/**
 * Einmalig: ältere SEO-Checks, deren Firma schon eine Akte hatte (z. B. aus Outreach),
 * an der Akte vermerken. So landen auch sie in der Anruf-Liste. Kunden bleiben draußen.
 */
async function backfillSeoCheckAt(): Promise<number> {
  const db = adminDb();
  const [custSnap, contactSnap, checkSnap] = await Promise.all([
    db.collection('customers').get(),
    db.collection('contacts').select('email', 'customerId').get(),
    db.collection('seoChecks').orderBy('createdAt', 'desc').limit(2000).get(),
  ]);
  const byKey = new Map<string, string>();
  for (const d of custSnap.docs) {
    const c = d.data();
    const e = String(c.email ?? '').toLowerCase();
    if (e) byKey.set(`e:${e}`, d.id);
    const dom = normalizeDomain(c.website) || companyDomainFromEmail(e);
    if (dom && !byKey.has(`d:${dom}`)) byKey.set(`d:${dom}`, d.id);
  }
  for (const d of contactSnap.docs) {
    const e = String(d.data().email ?? '').toLowerCase();
    const cid = d.data().customerId as string | undefined;
    if (e && cid && !byKey.has(`e:${e}`)) byKey.set(`e:${e}`, cid);
  }
  // Neuester Check je Akte (Checks kommen absteigend sortiert).
  const latest = new Map<string, Timestamp>();
  for (const d of checkSnap.docs) {
    const x = d.data();
    if (!x.result || x.test || x.owner || !(x.createdAt instanceof Timestamp)) continue;
    const domain = normalizeDomain(x.domain ?? x.result?.domain);
    if (!domain || domain === OWN_DOMAIN) continue;
    const email = String(x.lead?.email ?? '').toLowerCase();
    const id = (email && byKey.get(`e:${email}`)) || byKey.get(`d:${domain}`);
    if (id && !latest.has(id)) latest.set(id, x.createdAt);
  }
  let n = 0;
  for (const d of custSnap.docs) {
    const at = latest.get(d.id);
    const c = d.data();
    if (!at || c.seoCheckAt || (c.lifecycle ?? 'kunde') === 'kunde') continue;
    await d.ref.update({ seoCheckAt: at });
    n++;
  }
  return n;
}

const OUTREACH_LIFECYCLE: Record<string, CustomerLifecycle> = {
  geantwortet: 'lead',
  termin: 'interessent',
  kunde: 'kunde',
  'kein-interesse': 'verloren',
};

/** Outreach-Kontakt hat geantwortet (oder Termin/Kunde): Akte anlegen oder Status nachziehen. */
export async function akteFromOutreach(leadId: string): Promise<string | null> {
  const db = adminDb();
  const snap = await db.collection('outreachLeads').doc(leadId).get();
  const o = snap.data();
  if (!o) return null;
  const target = OUTREACH_LIFECYCLE[o.status as string];
  const hasAnswer = !!o.repliedAt || (o.thread?.length ?? 0) > 0 || o.status === 'termin' || o.status === 'kunde';
  if (!target || !hasAnswer) return null;
  const channel = o.channel === 'mail' ? 'Mail' : o.tiktok && !o.instagram ? 'TikTok' : 'Instagram';
  const address = splitAddress(String(o.address ?? ''), String(o.city ?? ''));
  const existing = (await findAkte({ email: o.email, website: o.website, outreachLeadId: leadId })) ?? (await findAkteByDomainScan({ email: o.email, website: o.website }));
  if (!existing) {
    return createAkte({
      company: o.name ?? '',
      name: o.contact ?? '',
      email: o.email ?? '',
      phone: o.phone ?? '',
      website: o.website ?? '',
      ...address,
      source: `Outreach ${channel}`,
      lifecycle: target,
      outreachLeadId: leadId,
    });
  }
  // Bestehende Akte: verknüpfen und den Status nur nach vorne ziehen (oder auf verloren, wenn noch Lead).
  const ref = db.collection('customers').doc(existing);
  const cur = (await ref.get()).data() ?? {};
  const lc = (cur.lifecycle ?? 'kunde') as CustomerLifecycle;
  const rank: CustomerLifecycle[] = ['lead', 'interessent', 'kunde'];
  const patch: Record<string, unknown> = {};
  if (!cur.outreachLeadId) patch.outreachLeadId = leadId;
  if (target === 'verloren' ? lc === 'lead' : rank.indexOf(target) > rank.indexOf(lc) && rank.indexOf(lc) >= 0) patch.lifecycle = target;
  if (Object.keys(patch).length) await ref.update({ ...patch, updatedAt: FieldValue.serverTimestamp() });
  return existing;
}
