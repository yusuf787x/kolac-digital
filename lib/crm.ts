/**
 * Kundenakte (CRM): Ansprechpartner, Status, Kundenwert und der
 * gemeinsame Verlauf aus allen Quellen (Notizen, Deals, Angebote,
 * Rechnungen, Verträge, Termine, SEO-Checks, Outreach, Portal, Gmail).
 * Läuft im Browser mit dem Firestore-Client (nur der Inhaber darf lesen).
 */
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type DocumentData,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from './firebase';
import type {
  Activity,
  CallStatus,
  Contact,
  Contract,
  Customer,
  CustomerLifecycle,
  Deal,
  LeadStage,
  Invoice,
  Quote,
} from './types';
import type { Meeting } from './meetings/types';
import type { LocalKeyword } from './seo-check/types';
import type { OutreachLead } from './outreach';
import { OUTREACH_STATUS_LABELS } from './outreach';
import { stageDef } from './sales';
import { formatEUR, invoiceGrossTotal, tsToMillis } from './utils';
import { companyDomainFromEmail, normalizeDomain } from './crm-shared';

export { companyDomainFromEmail, normalizeDomain };

const fromDoc = <T>(d: QueryDocumentSnapshot<DocumentData>): T =>
  ({ id: d.id, ...d.data() }) as T;

// ===================================================================
// STATUS (Lebenszyklus)
// ===================================================================

export const LIFECYCLE_ORDER: CustomerLifecycle[] = [
  'lead',
  'interessent',
  'kunde',
  'verloren',
  'ehemalig',
];

export const LIFECYCLE_LABELS: Record<CustomerLifecycle, string> = {
  lead: 'Lead',
  interessent: 'Interessent',
  kunde: 'Kunde',
  verloren: 'Verloren',
  ehemalig: 'Ehemalig',
};

export const LIFECYCLE_HINTS: Record<CustomerLifecycle, string> = {
  lead: 'Kontakt da, noch kein Gespräch',
  interessent: 'Im Gespräch oder Angebot raus',
  kunde: 'Hat beauftragt',
  verloren: 'Kein Interesse, kein Budget',
  ehemalig: 'War Kunde',
};

export const LIFECYCLE_BADGES: Record<CustomerLifecycle, string> = {
  lead: 'bg-sky-50 text-sky-800 ring-1 ring-sky-200',
  interessent: 'bg-amber-50 text-amber-800 ring-1 ring-amber-200',
  kunde: 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200',
  verloren: 'bg-gray-100 text-gray-600 ring-1 ring-gray-200',
  ehemalig: 'bg-gray-100 text-gray-600 ring-1 ring-gray-200',
};

/** Altkunden ohne Status gelten als Kunde. */
export function lifecycleOf(c: Pick<Customer, 'lifecycle'>): CustomerLifecycle {
  return c.lifecycle ?? 'kunde';
}

// ===================================================================
// ANRUF-LISTE (SEO-Leads)
// ===================================================================

export const CALL_STATUS_LABELS: Record<CallStatus, string> = {
  neu: 'Neu, noch nicht angerufen',
  'nicht-erreicht': 'Nicht erreicht',
  spaeter: 'Rückruf verabredet',
  termin: 'Termin gelegt',
  'kein-interesse': 'Kein Interesse',
  bearbeitet: 'Bearbeitet',
};

/** Hat die Akte einen SEO-Check (als Quelle oder später dazugekommen)? */
export function hasSeoCheck(c: Customer): boolean {
  return (c.source ?? '').startsWith('SEO-Check') || !!c.seoCheckAt;
}

/** Spalten im Board „SEO-Leads“, von links (neu) nach rechts. */
export const LEAD_STAGES: { key: LeadStage; label: string; hint: string; color: string }[] = [
  { key: 'neu', label: 'Neu', hint: 'SEO-Check gemacht, noch nicht kontaktiert', color: '#2563eb' },
  { key: 'kontaktiert', label: 'Kontaktiert', hint: 'Angerufen oder geschrieben, noch nicht gesprochen', color: '#7c3aed' },
  { key: 'gesprochen', label: 'Gesprochen', hint: 'Gespräch geführt', color: '#0891b2' },
  { key: 'termin', label: 'Termin', hint: 'Termin gelegt', color: '#16a34a' },
  { key: 'verloren', label: 'Verloren', hint: 'Kein Interesse', color: '#64748b' },
];

export const LEAD_STAGE_LABEL: Record<LeadStage, string> = Object.fromEntries(LEAD_STAGES.map((s) => [s.key, s.label])) as Record<LeadStage, string>;

/**
 * Spalte einer Akte im Board „SEO-Leads“, oder null, wenn sie nicht dorthin gehört
 * (kein SEO-Check, oder schon Kunde). Verloren/ehemalig im Status schlägt alles.
 */
export function leadStageOf(c: Customer): LeadStage | null {
  if (!hasSeoCheck(c)) return null;
  const lc = lifecycleOf(c);
  if (lc === 'kunde') return null;
  if (lc === 'verloren' || lc === 'ehemalig') return 'verloren';
  if (c.leadStage) return c.leadStage;
  switch (c.callStatus) {
    case 'termin':
      return 'termin';
    case 'kein-interesse':
      return 'verloren';
    case 'nicht-erreicht':
      return 'kontaktiert';
    case 'spaeter':
    case 'bearbeitet':
      return 'gesprochen';
  }
  return lc === 'interessent' ? 'termin' : 'neu';
}

/** Felder, die beim Verschieben in eine Spalte mitgesetzt werden (Status der Akte bleibt stimmig). */
export function leadStagePatch(c: Customer, stage: LeadStage): Partial<Customer> {
  const lc = lifecycleOf(c);
  const patch: Partial<Customer> = { leadStage: stage };
  if (stage === 'verloren') patch.lifecycle = 'verloren';
  else if (stage === 'termin') patch.lifecycle = 'interessent';
  else if (lc === 'verloren' || lc === 'ehemalig' || lc === 'interessent') patch.lifecycle = 'lead';
  return patch;
}

/** Neue SEO-Leads, die noch niemand kontaktiert hat (Spalte „Neu“, Zähler in der Seitenleiste). */
export function inCallQueue(c: Customer): boolean {
  return leadStageOf(c) === 'neu';
}

/** Hat Yusuf schon selbst etwas mit der Akte gemacht (keine automatische Notiz)? */
export function isOwnActivity(a: Activity): boolean {
  if (a.auto || !a.completed) return false;
  if (a.description.startsWith('SEO-Check freigeschaltet') || a.description.startsWith('Aus der Übernahme')) return false;
  if (a.description.startsWith('Lead-Status:')) return false;
  if (a.type === 'email' && (a.emailSubject ?? '').startsWith('Kontaktanfrage')) return false;
  return true;
}

/** Reihenfolge der Anruf-Liste: wer zuletzt angefragt hat (neuester SEO-Check), steht oben. */
export function callQueueSort(a: Customer, b: Customer): number {
  const frisch = (c: Customer) => Math.max(tsToMillis(c.seoCheckAt), tsToMillis(c.createdAt));
  return frisch(b) - frisch(a);
}

// ===================================================================
// HILFEN
// ===================================================================

export function customerName(c: Pick<Customer, 'company' | 'firstName' | 'lastName' | 'email'>): string {
  return c.company || `${c.firstName} ${c.lastName}`.trim() || c.email || 'Ohne Namen';
}

export function personName(p: { firstName?: string; lastName?: string }): string {
  return `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim();
}

/** Alle Mail-Adressen einer Akte (Hauptkontakt, Rechnungs-Mail, Ansprechpartner), kleingeschrieben. */
export function emailsOf(c: Customer, contacts: Contact[]): string[] {
  const all = [c.email, c.retainerInvoiceEmail, ...contacts.map((k) => k.email)]
    .map((e) => (e ?? '').trim().toLowerCase())
    .filter((e) => e.includes('@'));
  return [...new Set(all)];
}

/** Domain der Akte: Website, sonst Firmen-Domain der Haupt-Mail. */
export function domainOf(c: Customer): string {
  return normalizeDomain(c.website) || companyDomainFromEmail(c.email);
}

// ===================================================================
// KUNDENWERT
// ===================================================================

export interface CustomerMoney {
  /** Bezahlter Umsatz netto (wie auf der Startseite gerechnet). */
  earnedNet: number;
  /** Offene Forderungen brutto. */
  openGross: number;
  invoiceCount: number;
  firstInvoiceAt: number | null;
  lastInvoiceAt: number | null;
  /** Bezahlter Umsatz netto pro Monat seit der ersten Rechnung. */
  perMonthNet: number;
}

export function customerMoney(invoices: Invoice[]): CustomerMoney {
  let earnedNet = 0;
  let openGross = 0;
  let count = 0;
  let first: number | null = null;
  let last: number | null = null;
  for (const inv of invoices) {
    if (!inv.invoiceNumber || inv.status === 'draft' || inv.status === 'cancelled') continue;
    if (inv.kind === 'cancellation') continue;
    count++;
    const rate = inv.vatRate ?? 0;
    if (inv.status === 'paid') earnedNet += inv.totalAmount;
    else if (inv.status === 'partially_paid')
      earnedNet += Math.round((inv.paidAmount / (1 + rate)) * 100) / 100;
    if (inv.status === 'sent' || inv.status === 'overdue' || inv.status === 'partially_paid') {
      const gross = invoiceGrossTotal(inv);
      openGross += inv.status === 'partially_paid' ? gross - inv.paidAmount : gross;
    }
    const at = tsToMillis(inv.invoiceDate);
    if (at) {
      first = first == null ? at : Math.min(first, at);
      last = last == null ? at : Math.max(last, at);
    }
  }
  const months = first ? Math.max(1, (Date.now() - first) / (30.44 * 86400000)) : 1;
  return {
    earnedNet: Math.round(earnedNet * 100) / 100,
    openGross: Math.round(openGross * 100) / 100,
    invoiceCount: count,
    firstInvoiceAt: first,
    lastInvoiceAt: last,
    perMonthNet: first ? Math.round((earnedNet / months) * 100) / 100 : 0,
  };
}

// ===================================================================
// ANSPRECHPARTNER
// ===================================================================

const contactsCol = () => collection(db, 'contacts');

export async function listContactsByCustomer(customerId: string): Promise<Contact[]> {
  const snap = await getDocs(query(contactsCol(), where('customerId', '==', customerId)));
  return snap.docs
    .map((d) => fromDoc<Contact>(d))
    .sort((a, b) => tsToMillis(a.createdAt) - tsToMillis(b.createdAt));
}

export async function listAllContacts(): Promise<Contact[]> {
  const snap = await getDocs(contactsCol());
  return snap.docs.map((d) => fromDoc<Contact>(d));
}

export type ContactInput = Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>;

export async function createContact(data: ContactInput): Promise<string> {
  const ref = await addDoc(contactsCol(), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateContact(id: string, data: Partial<ContactInput>): Promise<void> {
  await updateDoc(doc(db, 'contacts', id), { ...data, updatedAt: serverTimestamp() });
}

export async function deleteContact(id: string): Promise<void> {
  await deleteDoc(doc(db, 'contacts', id));
}

// ===================================================================
// QUELLEN FÜR DEN VERLAUF
// ===================================================================

export async function listActivitiesByCustomer(customerId: string): Promise<Activity[]> {
  const snap = await getDocs(
    query(collection(db, 'activities'), where('customerId', '==', customerId)),
  );
  return snap.docs.map((d) => fromDoc<Activity>(d));
}

export async function listActivitiesByDeals(dealIds: string[]): Promise<Activity[]> {
  const out: Activity[] = [];
  for (let i = 0; i < dealIds.length; i += 10) {
    const chunk = dealIds.slice(i, i + 10);
    const snap = await getDocs(
      query(collection(db, 'activities'), where('dealId', 'in', chunk)),
    );
    out.push(...snap.docs.map((d) => fromDoc<Activity>(d)));
  }
  return out;
}

/** Öffentlicher SEO-Check (nicht die Prüfungen im Kundenportal). */
export interface PublicSeoCheck {
  id: string;
  domain: string;
  score: number;
  createdAt: number;
  categories?: Record<string, number>;
  landing?: string;
  utmSource?: string;
  test?: boolean;
  owner?: boolean;
  /** Live geprüfte „Leistung + Ort“-Begriffe (Checks seit 26.11.2026). */
  local?: LocalKeyword[];
  lead?: {
    name?: string;
    email?: string;
    phone?: string;
    company?: string;
    wantsCall?: boolean;
    branche?: string;
  };
}

function toPublicCheck(d: QueryDocumentSnapshot<DocumentData>): PublicSeoCheck | null {
  const x = d.data();
  if (!x.result) return null; // Portal-Prüfung, kein öffentlicher Check
  const cats = x.result?.categories;
  const categories: Record<string, number> = {};
  if (cats && typeof cats === 'object') {
    for (const [k, v] of Object.entries(cats)) {
      const score = typeof v === 'number' ? v : (v as { score?: number })?.score;
      if (typeof score === 'number') categories[k] = score;
    }
  }
  return {
    id: d.id,
    domain: normalizeDomain(x.domain ?? x.result?.domain ?? ''),
    score: typeof x.score === 'number' ? x.score : (x.result?.score ?? 0),
    createdAt: tsToMillis(x.createdAt, Date.parse(x.result?.checkedAt ?? '') || 0),
    categories,
    landing: x.source?.landing ?? x.lead?.source?.landing,
    utmSource: x.source?.utm_source ?? x.lead?.source?.utm_source,
    test: !!x.test,
    owner: !!x.owner,
    local: Array.isArray(x.result?.rankings?.local) ? (x.result.rankings.local as LocalKeyword[]) : undefined,
    lead: x.lead
      ? {
          name: x.lead.name,
          email: x.lead.email,
          phone: x.lead.phone,
          company: x.lead.company,
          wantsCall: x.lead.wantsCall,
          branche: x.lead.branche,
        }
      : undefined,
  };
}

/** SEO-Checks einer Akte: gleiche Domain oder gleiche Mail beim Freischalten. */
export async function listSeoChecksFor(domain: string, emails: string[]): Promise<PublicSeoCheck[]> {
  const col = collection(db, 'seoChecks');
  const found = new Map<string, PublicSeoCheck>();
  const jobs: Promise<void>[] = [];
  if (domain) {
    jobs.push(
      getDocs(query(col, where('domain', 'in', [domain, `www.${domain}`]))).then((s) =>
        s.docs.forEach((d) => {
          const c = toPublicCheck(d);
          if (c) found.set(c.id, c);
        }),
      ),
    );
  }
  for (let i = 0; i < emails.length; i += 10) {
    const chunk = emails.slice(i, i + 10);
    jobs.push(
      getDocs(query(col, where('lead.email', 'in', chunk))).then((s) =>
        s.docs.forEach((d) => {
          const c = toPublicCheck(d);
          if (c) found.set(c.id, c);
        }),
      ),
    );
  }
  await Promise.all(jobs);
  return [...found.values()].filter((c) => !c.test && !c.owner);
}

/** Die neuesten öffentlichen SEO-Checks (für „Checks ohne Akte“). */
export async function listRecentSeoChecks(max = 150): Promise<PublicSeoCheck[]> {
  const snap = await getDocs(
    query(collection(db, 'seoChecks'), orderBy('createdAt', 'desc'), limit(max)),
  );
  return snap.docs
    .map(toPublicCheck)
    .filter((c): c is PublicSeoCheck => !!c && !c.test && !c.owner);
}

export async function listMeetingsFor(customerId: string, emails: string[]): Promise<Meeting[]> {
  const snap = await getDocs(
    query(collection(db, 'meetings'), orderBy('startAt', 'desc'), limit(400)),
  );
  const mails = new Set(emails);
  return snap.docs
    .map((d) => fromDoc<Meeting>(d))
    .filter((m) =>
      (m.guests ?? []).some(
        (g) => (g.source === 'kunde' && g.sourceId === customerId) || mails.has(g.email.toLowerCase()),
      ),
    );
}

export async function getOutreachLead(id: string): Promise<OutreachLead | null> {
  const snap = await getDoc(doc(db, 'outreachLeads', id));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as OutreachLead) : null;
}

export interface PortalLogin {
  id: string;
  at: number;
  email: string;
}

export async function listPortalLogins(customerId: string): Promise<PortalLogin[]> {
  const snap = await getDocs(
    query(collection(db, 'portalLoginEvents'), where('customerId', '==', customerId), limit(200)),
  );
  return snap.docs.map((d) => {
    const x = d.data();
    return { id: d.id, at: tsToMillis(x.at, typeof x.at === 'number' ? x.at : 0), email: x.email ?? '' };
  });
}

/** Mail aus Gmail (über /api/crm/mails). */
export interface CrmMail {
  id: string;
  threadId: string;
  at: number;
  from: string;
  to: string;
  subject: string;
  snippet: string;
  outgoing: boolean;
  url: string;
}

// ===================================================================
// VERLAUF
// ===================================================================

export type TimelineKind =
  | 'notiz'
  | 'anruf'
  | 'email'
  | 'meeting'
  | 'aufgabe'
  | 'deal'
  | 'angebot'
  | 'rechnung'
  | 'vertrag'
  | 'termin'
  | 'seo'
  | 'outreach'
  | 'portal'
  | 'gmail'
  | 'akte';

export const TIMELINE_FILTERS: { key: 'alle' | 'gespraeche' | 'mails' | 'geld' | 'seo'; label: string; kinds: TimelineKind[] | null }[] = [
  { key: 'alle', label: 'Alles', kinds: null },
  { key: 'gespraeche', label: 'Notizen & Gespräche', kinds: ['notiz', 'anruf', 'meeting', 'termin', 'aufgabe', 'outreach'] },
  { key: 'mails', label: 'Mails', kinds: ['email', 'gmail'] },
  { key: 'geld', label: 'Angebote & Rechnungen', kinds: ['deal', 'angebot', 'rechnung', 'vertrag'] },
  { key: 'seo', label: 'SEO & Portal', kinds: ['seo', 'portal'] },
];

export interface TimelineItem {
  id: string;
  at: number;
  kind: TimelineKind;
  icon: string;
  title: string;
  detail?: string;
  href?: string;
  external?: boolean;
  /** Eigene Notiz/Anruf: darf gelöscht werden. */
  activityId?: string;
  /** Offene Aufgabe mit Fälligkeit. */
  dueAt?: number;
  done?: boolean;
}

const ACTIVITY_META: Record<Activity['type'], { icon: string; label: string; kind: TimelineKind }> = {
  notiz: { icon: '📝', label: 'Notiz', kind: 'notiz' },
  anruf: { icon: '📞', label: 'Anruf', kind: 'anruf' },
  email: { icon: '✉️', label: 'E-Mail', kind: 'email' },
  meeting: { icon: '🤝', label: 'Gespräch', kind: 'meeting' },
  angebot: { icon: '📋', label: 'Angebot', kind: 'angebot' },
  vertrag: { icon: '✍️', label: 'Vertrag', kind: 'vertrag' },
  sonstiges: { icon: '•', label: 'Sonstiges', kind: 'notiz' },
};

export const ACTIVITY_COMPOSER_TYPES: { type: Activity['type']; label: string; icon: string }[] = [
  { type: 'notiz', label: 'Notiz', icon: '📝' },
  { type: 'anruf', label: 'Anruf', icon: '📞' },
  { type: 'email', label: 'Mail', icon: '✉️' },
  { type: 'meeting', label: 'Gespräch', icon: '🤝' },
];

export interface TimelineSources {
  customer: Customer;
  activities: Activity[];
  deals: Deal[];
  quotes: Quote[];
  invoices: Invoice[];
  contracts: Contract[];
  meetings: Meeting[];
  seoChecks: PublicSeoCheck[];
  outreach: OutreachLead | null;
  portalLogins: PortalLogin[];
  mails: CrmMail[];
}

const DAY = 86400000;

export function buildTimeline(s: TimelineSources): TimelineItem[] {
  const items: TimelineItem[] = [];
  const push = (it: TimelineItem) => {
    if (it.at > 0) items.push(it);
  };

  const created = tsToMillis(s.customer.createdAt);
  push({
    id: 'akte',
    at: created,
    kind: 'akte',
    icon: '🗂️',
    title: 'Akte angelegt',
    detail: s.customer.source ? `Quelle: ${s.customer.source}` : undefined,
  });

  for (const a of s.activities) {
    const meta = ACTIVITY_META[a.type] ?? ACTIVITY_META.sonstiges;
    const isTask = a.dueDate != null && !a.completed;
    push({
      id: `a-${a.id}`,
      at: isTask ? tsToMillis(a.dueDate) : tsToMillis(a.completedAt) || tsToMillis(a.createdAt),
      kind: isTask ? 'aufgabe' : meta.kind,
      icon: isTask ? '⏰' : meta.icon,
      title: a.emailSubject ? `${meta.label}: ${a.emailSubject}` : isTask ? `Aufgabe: ${meta.label}` : meta.label,
      detail: a.description || stripHtml(a.emailBody ?? '') || undefined,
      href: a.dealId ? `/dashboard/vertrieb/${a.dealId}` : undefined,
      activityId: a.customerId ? a.id : undefined,
      dueAt: a.dueDate ? tsToMillis(a.dueDate) : undefined,
      done: a.completed,
    });
  }

  for (const d of s.deals) {
    const sd = stageDef(d.stage);
    push({
      id: `d-${d.id}`,
      at: tsToMillis(d.createdAt),
      kind: 'deal',
      icon: '🔄',
      title: `Deal angelegt: ${d.title}`,
      detail: `Phase jetzt: ${sd.label}${d.value != null ? ` · ${formatEUR(d.value)}` : ''}`,
      href: `/dashboard/vertrieb/${d.id}`,
    });
  }

  for (const q of s.quotes) {
    const href = `/dashboard/angebote/${q.id}`;
    const amount = formatEUR(q.totalAmount);
    const word = q.documentType === 'order_confirmation' ? 'Auftragsbestätigung' : 'Angebot';
    push({ id: `q-${q.id}`, at: tsToMillis(q.quoteDate), kind: 'angebot', icon: '📋', title: `${word} ${q.quoteNumber} erstellt`, detail: amount, href });
    if (q.sentAt) push({ id: `q-${q.id}-s`, at: tsToMillis(q.sentAt), kind: 'angebot', icon: '📤', title: `${word} ${q.quoteNumber} verschickt`, detail: amount, href });
    if (q.acceptedAt) push({ id: `q-${q.id}-a`, at: tsToMillis(q.acceptedAt), kind: 'angebot', icon: '✅', title: `${word} ${q.quoteNumber} angenommen`, detail: amount, href });
    if (q.rejectedAt) push({ id: `q-${q.id}-r`, at: tsToMillis(q.rejectedAt), kind: 'angebot', icon: '✖️', title: `${word} ${q.quoteNumber} abgelehnt`, href });
  }

  for (const inv of s.invoices) {
    if (!inv.invoiceNumber) continue;
    const href = `/dashboard/rechnungen/${inv.id}`;
    const amount = formatEUR(inv.totalAmount);
    if (inv.kind === 'cancellation') {
      push({ id: `i-${inv.id}`, at: tsToMillis(inv.invoiceDate), kind: 'rechnung', icon: '↩️', title: `Storno ${inv.invoiceNumber}`, detail: amount, href });
      continue;
    }
    push({ id: `i-${inv.id}`, at: tsToMillis(inv.sentAt) || tsToMillis(inv.invoiceDate), kind: 'rechnung', icon: '📄', title: `Rechnung ${inv.invoiceNumber} ${inv.sentAt ? 'verschickt' : 'gestellt'}`, detail: `${amount} netto`, href });
    if (inv.status === 'paid' && inv.paidAt)
      push({ id: `i-${inv.id}-p`, at: tsToMillis(inv.paidAt), kind: 'rechnung', icon: '💶', title: `Rechnung ${inv.invoiceNumber} bezahlt`, detail: amount, href });
    for (const [idx, ev] of (inv.dunning?.events ?? []).entries()) {
      if (ev.type !== 'sent' && !ev.stage) continue;
      push({ id: `i-${inv.id}-m${idx}`, at: tsToMillis(ev.at), kind: 'rechnung', icon: '⚠️', title: `Zahlungserinnerung Stufe ${ev.stage ?? '?'} zu ${inv.invoiceNumber}`, detail: ev.to ? `an ${ev.to}` : undefined, href });
    }
  }

  for (const c of s.contracts) {
    const href = `/dashboard/vertraege/${c.id}`;
    push({ id: `c-${c.id}`, at: tsToMillis(c.sentAt) || tsToMillis(c.createdAt), kind: 'vertrag', icon: '✍️', title: `Vertrag „${c.title}“ ${c.sentAt ? 'verschickt' : 'angelegt'}`, href });
    if (c.signedAt) push({ id: `c-${c.id}-s`, at: tsToMillis(c.signedAt), kind: 'vertrag', icon: '✅', title: `Vertrag „${c.title}“ unterschrieben`, detail: c.signedByName ?? undefined, href });
  }

  for (const m of s.meetings) {
    const cancelled = m.status === 'cancelled';
    push({
      id: `m-${m.id}`,
      at: m.startAt,
      kind: 'termin',
      icon: cancelled ? '🚫' : '📅',
      title: `${cancelled ? 'Termin abgesagt' : m.startAt > Date.now() ? 'Termin geplant' : 'Termin'}: ${m.title}`,
      detail: m.bookedAt ? `Gebucht am ${new Date(m.bookedAt).toLocaleDateString('de-DE')}` : undefined,
      href: '/dashboard/termine',
    });
  }

  for (const chk of s.seoChecks) {
    const cats = chk.categories ?? {};
    const parts = [
      cats.technik != null ? `Technik ${cats.technik}` : '',
      cats.inhalte != null ? `Inhalte ${cats.inhalte}` : '',
      cats.sichtbarkeit != null ? `Sichtbarkeit ${cats.sichtbarkeit}` : '',
      cats.lokal != null ? `Lokal ${cats.lokal}` : '',
    ].filter(Boolean);
    push({
      id: `s-${chk.id}`,
      at: chk.createdAt,
      kind: 'seo',
      icon: '🔍',
      title: `SEO-Check ${chk.domain}: ${chk.score}/100${chk.lead ? ' · freigeschaltet' : ''}`,
      detail: [parts.join(', '), chk.landing ? `über ${chk.landing}` : '', chk.lead?.wantsCall ? 'möchte Rückruf' : '']
        .filter(Boolean)
        .join(' · '),
      href: `/seo-check?id=${encodeURIComponent(chk.id)}`,
      external: true,
    });
  }

  const o = s.outreach;
  if (o) {
    const handle = o.instagram ? `@${o.instagram}` : o.tiktok ? `TikTok @${o.tiktok}` : o.email ?? '';
    const mail = o.channel === 'mail';
    if (o.sentAt)
      push({ id: 'o-sent', at: Date.parse(o.sentAt), kind: 'outreach', icon: mail ? '✉️' : '💬', title: `${mail ? 'Outreach-Mail' : 'Instagram-Nachricht'} gesendet ${handle}`.trim(), detail: (mail ? o.mailBody : o.dm)?.slice(0, 280), href: '/dashboard/vertrieb/outreach' });
    if (o.followedUpAt)
      push({ id: 'o-fu', at: Date.parse(o.followedUpAt), kind: 'outreach', icon: '↪️', title: 'Nachgefasst', detail: (mail ? o.mailFollowup : o.followup)?.slice(0, 280), href: '/dashboard/vertrieb/outreach' });
    if (o.repliedAt)
      push({ id: 'o-re', at: Date.parse(o.repliedAt), kind: 'outreach', icon: '💬', title: 'Hat geantwortet', href: '/dashboard/vertrieb/outreach' });
    (o.thread ?? []).forEach((t, i) =>
      push({ id: `o-t${i}`, at: Date.parse(t.at), kind: 'outreach', icon: t.from === 'yusuf' ? '💬' : '🗨️', title: t.from === 'yusuf' ? 'Du (Outreach)' : `${o.name} (Outreach)`, detail: t.text.slice(0, 400) }),
    );
    if (!o.sentAt && !o.thread?.length)
      push({ id: 'o-st', at: Date.parse(o.foundAt) || created, kind: 'outreach', icon: '🎯', title: `Im Outreach: ${OUTREACH_STATUS_LABELS[o.status]}`, href: '/dashboard/vertrieb/outreach' });
  }

  // Portal-Logins pro Tag zusammenfassen, sonst flutet es den Verlauf.
  const byDay = new Map<string, PortalLogin[]>();
  for (const l of s.portalLogins) {
    const key = new Date(l.at).toISOString().slice(0, 10);
    byDay.set(key, [...(byDay.get(key) ?? []), l]);
  }
  for (const [day, list] of byDay) {
    const at = Math.max(...list.map((l) => l.at));
    push({ id: `p-${day}`, at, kind: 'portal', icon: '🔑', title: `Kundenportal geöffnet${list.length > 1 ? ` (${list.length}×)` : ''}`, detail: [...new Set(list.map((l) => l.email))].join(', ') });
  }

  for (const m of s.mails) {
    push({
      id: `g-${m.id}`,
      at: m.at,
      kind: 'gmail',
      icon: m.outgoing ? '📤' : '📥',
      title: `${m.outgoing ? 'Mail an' : 'Mail von'} ${m.outgoing ? m.to : m.from}: ${m.subject || '(ohne Betreff)'}`,
      detail: m.snippet,
      href: m.url,
      external: true,
    });
  }

  return items.sort((a, b) => b.at - a.at);
}

/** Letzter echter Kontakt (keine Rechnungen/Portal), für „zuletzt gesprochen“. */
export function lastContactAt(items: TimelineItem[]): number | null {
  const now = Date.now() + DAY;
  const hit = items.find(
    (i) => ['notiz', 'anruf', 'email', 'meeting', 'termin', 'outreach', 'gmail'].includes(i.kind) && i.at <= now && i.kind !== 'aufgabe',
  );
  return hit ? hit.at : null;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 400);
}
