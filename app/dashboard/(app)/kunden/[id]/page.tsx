'use client';

import { Suspense, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Timestamp } from 'firebase/firestore';
import {
  getCustomer,
  deleteCustomer,
  updateCustomer,
  listInvoicesByCustomer,
  listQuotesByCustomer,
  listDealsByCustomer,
  listContractsByCustomer,
} from '@/lib/firestore';
import type { Activity, Contact, Contract, Customer, CustomerLifecycle, Deal, Invoice, Quote } from '@/lib/types';
import type { Meeting } from '@/lib/meetings/types';
import type { OutreachLead } from '@/lib/outreach';
import {
  CONTRACT_STATUS_LABELS,
  CONTRACT_STATUS_BADGE_CLASSES,
  computeContractStatus,
} from '@/lib/contract-status';
import { formatEUR, formatDateDE, formatTsDE, tsToMillis } from '@/lib/utils';
import SensitiveValue from '@/components/ui/SensitiveValue';
import { stageDef } from '@/lib/sales';
import { invoiceStatusBadgeClass, invoiceStatusLabel } from '@/lib/invoice-status';
import { computeQuoteStatus, QUOTE_STATUS_LABELS, QUOTE_STATUS_BADGE_CLASSES } from '@/lib/quote-status';
import {
  buildTimeline,
  customerMoney,
  customerName,
  domainOf,
  emailsOf,
  getOutreachLead,
  lastContactAt,
  LIFECYCLE_BADGES,
  LIFECYCLE_HINTS,
  LIFECYCLE_LABELS,
  hasSeoCheck,
  leadStageOf,
  LIFECYCLE_ORDER,
  lifecycleOf,
  listActivitiesByCustomer,
  listActivitiesByDeals,
  listContactsByCustomer,
  listMeetingsFor,
  listPortalLogins,
  listSeoChecksFor,
  type CrmMail,
  type PortalLogin,
  type PublicSeoCheck,
} from '@/lib/crm';
import { authedFetch } from '@/lib/api-client';
import ContactsCard from '@/components/crm/ContactsCard';
import Timeline, { type MailState } from '@/components/crm/Timeline';
import CallScript from '@/components/crm/CallScript';

export default function KundeDetailPage() {
  return (
    <Suspense fallback={<div className="card text-sm text-gray-500">Lädt…</div>}>
      <KundenAkte />
    </Suspense>
  );
}

interface Extra {
  activities: Activity[];
  meetings: Meeting[];
  seoChecks: PublicSeoCheck[];
  outreach: OutreachLead | null;
  portalLogins: PortalLogin[];
}

const NO_EXTRA: Extra = { activities: [], meetings: [], seoChecks: [], outreach: null, portalLogins: [] };

function KundenAkte() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = params.id;
  const updatedName = searchParams.get('updated');

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [extra, setExtra] = useState<Extra>(NO_EXTRA);
  const [mails, setMails] = useState<CrmMail[]>([]);
  const [mailState, setMailState] = useState<MailState>('loading');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [c, kontakte, inv, qts, dls, ctr, acts] = await Promise.all([
        getCustomer(id),
        listContactsByCustomer(id),
        listInvoicesByCustomer(id),
        listQuotesByCustomer(id),
        listDealsByCustomer(id),
        listContractsByCustomer(id),
        listActivitiesByCustomer(id),
      ]);
      setCustomer(c);
      setContacts(kontakte);
      setInvoices(inv);
      setQuotes(qts);
      setDeals(dls);
      setContracts(ctr);
      if (!c) return;

      // Zweite Welle: Quellen, die Mail-Adressen oder Domain der Akte brauchen.
      // Fehler einzelner Quellen dürfen die Akte nicht blockieren.
      const emails = emailsOf(c, kontakte);
      const safe = <T,>(p: Promise<T>, fallback: T) => p.catch((e) => (console.error(e), fallback));
      const [dealActs, meetings, seoChecks, outreach, portalLogins] = await Promise.all([
        safe(listActivitiesByDeals(dls.map((d) => d.id)), [] as Activity[]),
        safe(listMeetingsFor(id, emails), [] as Meeting[]),
        safe(listSeoChecksFor(domainOf(c), emails), [] as PublicSeoCheck[]),
        c.outreachLeadId ? safe(getOutreachLead(c.outreachLeadId), null) : Promise.resolve(null),
        safe(listPortalLogins(id), [] as PortalLogin[]),
      ]);
      const seen = new Set(acts.map((a) => a.id));
      setExtra({
        activities: [...acts, ...dealActs.filter((a) => !seen.has(a.id))],
        meetings,
        seoChecks,
        outreach,
        portalLogins,
      });
    } catch (err) {
      console.error(err);
      setError(`Akte konnte nicht geladen werden: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadMails = useCallback(async () => {
    try {
      const res = await authedFetch(`/api/crm/mails?customerId=${encodeURIComponent(id)}`);
      const data = (await res.json()) as { status?: string; mails?: CrmMail[] };
      setMails(data.mails ?? []);
      setMailState(
        data.status === 'scope_missing' || data.status === 'not_connected' ? data.status : res.ok ? 'ok' : 'error',
      );
    } catch (err) {
      console.error(err);
      setMailState('error');
    }
  }, [id]);

  useEffect(() => {
    load();
    loadMails();
  }, [load, loadMails]);

  useEffect(() => {
    if (!updatedName) return;
    setSuccessBanner(`✓ "${updatedName}" wurde aktualisiert.`);
    router.replace(`/dashboard/kunden/${id}`);
    const t = setTimeout(() => setSuccessBanner(null), 4000);
    return () => clearTimeout(t);
  }, [updatedName, router, id]);

  const timeline = useMemo(
    () =>
      customer
        ? buildTimeline({
            customer,
            activities: extra.activities,
            deals,
            quotes,
            invoices,
            contracts,
            meetings: extra.meetings,
            seoChecks: extra.seoChecks,
            outreach: extra.outreach,
            portalLogins: extra.portalLogins,
            mails,
          })
        : [],
    [customer, extra, deals, quotes, invoices, contracts, mails],
  );

  const money = useMemo(() => customerMoney(invoices), [invoices]);
  const lastContact = useMemo(() => lastContactAt(timeline), [timeline]);
  const openDeal = useMemo(
    () => deals.filter((d) => d.stage !== 'abgeschlossen' && d.stage !== 'verloren').sort((a, b) => tsToMillis(b.updatedAt) - tsToMillis(a.updatedAt))[0],
    [deals],
  );
  const latestCheck = useMemo(() => [...extra.seoChecks].sort((a, b) => b.createdAt - a.createdAt)[0], [extra.seoChecks]);

  const setLifecycle = async (l: CustomerLifecycle) => {
    if (!customer) return;
    // Board „SEO-Leads“ mitziehen: verloren in die Spalte Verloren, zurück auf Lead aus Verloren heraus.
    const leadStage = !hasSeoCheck(customer)
      ? customer.leadStage
      : l === 'verloren'
        ? 'verloren'
        : l === 'lead' && customer.leadStage === 'verloren'
          ? 'gesprochen'
          : customer.leadStage;
    setCustomer({ ...customer, lifecycle: l, ...(leadStage ? { leadStage } : {}) });
    await updateCustomer(customer.id, { lifecycle: l, ...(leadStage ? { leadStage } : {}) });
  };

  // Notiz, Anruf oder Mail in der Akte: der Lead ist nicht mehr neu.
  const onLogged = async (type: Activity['type']) => {
    if (!customer || leadStageOf(customer) !== 'neu') return;
    await updateCustomer(customer.id, { leadStage: type === 'email' ? 'kontaktiert' : 'gesprochen' });
  };

  const handleDelete = async () => {
    if (!customer) return;
    if (invoices.length > 0 || quotes.length > 0) return;
    if (!confirm(`"${customerName(customer)}" wirklich löschen? Ansprechpartner und Notizen bleiben dann ohne Akte. Das kann nicht rückgängig gemacht werden.`)) return;
    setDeleting(true);
    try {
      await deleteCustomer(customer.id);
      router.push('/dashboard/kunden');
    } catch (err) {
      console.error(err);
      alert('Löschen fehlgeschlagen.');
      setDeleting(false);
    }
  };

  if (loading) return <div className="card text-sm text-gray-500">Akte wird geladen…</div>;
  if (error || !customer) {
    return <div className="card text-sm text-red-700 bg-red-50 border-red-200">{error ?? 'Akte nicht gefunden.'}</div>;
  }

  const lc = lifecycleOf(customer);
  const domain = domainOf(customer);
  const place = [customer.zip, customer.city].filter(Boolean).join(' ');

  return (
    <div>
      <header className="mb-6">
        <Link href="/dashboard/kunden" className="text-sm text-gray-500 hover:text-gray-900 mb-3 inline-block">
          ← Alle Kontakte
        </Link>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-semibold text-gray-900 break-words">{customerName(customer)}</h1>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${LIFECYCLE_BADGES[lc]}`}>{LIFECYCLE_LABELS[lc]}</span>
            </div>
            <p className="mt-1.5 text-sm text-gray-500 flex flex-wrap gap-x-3 gap-y-1">
              {domain && (
                <a href={`https://${domain}`} target="_blank" rel="noopener noreferrer" className="text-brand-blue hover:underline">
                  {domain} ↗
                </a>
              )}
              {place && <span>{place}</span>}
              {customer.source && <span>Quelle: {customer.source}</span>}
              {openDeal && (
                <Link href={`/dashboard/vertrieb/${openDeal.id}`} className="hover:underline">
                  Deal: <span style={{ color: stageDef(openDeal.stage).color }}>{stageDef(openDeal.stage).label}</span>
                </Link>
              )}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <Link href={`/dashboard/angebote/neu?customerId=${customer.id}`} className="btn-secondary">
              Angebot erstellen
            </Link>
            <Link href={`/dashboard/kunden/${customer.id}/edit`} className="btn-secondary">
              Bearbeiten
            </Link>
          </div>
        </div>
      </header>

      {successBanner && (
        <div className="mb-6 px-4 py-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-900">{successBanner}</div>
      )}

      {/* Kennzahlen: wo steht der Kontakt, was ist er wert */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Kpi label="Umsatz bisher (netto)" value={<SensitiveValue>{formatEUR(money.earnedNet)}</SensitiveValue>} hint={money.invoiceCount ? `${money.invoiceCount} Rechnung${money.invoiceCount === 1 ? '' : 'en'}` : 'Noch keine Rechnung'} />
        <Kpi
          label="Offen (brutto)"
          value={<SensitiveValue>{formatEUR(money.openGross)}</SensitiveValue>}
          hint={money.openGross > 0 ? 'noch nicht bezahlt' : 'alles bezahlt'}
          tone={money.openGross > 0 ? 'warn' : undefined}
        />
        <Kpi
          label="Ø pro Monat"
          value={<SensitiveValue>{formatEUR(money.perMonthNet)}</SensitiveValue>}
          hint={money.firstInvoiceAt ? `Kunde seit ${formatDateDE(new Date(money.firstInvoiceAt))}` : '—'}
        />
        <Kpi
          label="Letzter Kontakt"
          value={lastContact ? relativeDays(lastContact) : '—'}
          hint={latestCheck ? `SEO-Check: ${latestCheck.score}/100 am ${formatDateDE(new Date(latestCheck.createdAt))}` : 'Kein SEO-Check'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <StatusCard customer={customer} lifecycle={lc} onLifecycle={setLifecycle} onSaved={(c) => setCustomer(c)} />
          <ContactsCard customer={customer} contacts={contacts} onChanged={load} />

          <section className="card">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Firma</h2>
            <dl className="space-y-3 text-sm">
              <DetailRow label="Adresse" value={customer.street || place ? `${customer.street}\n${place}`.trim() : '—'} />
              {customer.taxId && <DetailRow label="Steuernr. / USt-ID" value={customer.taxId} />}
              {customer.notes && <DetailRow label="Notizen" value={customer.notes} />}
              {customer.importedFrom && <DetailRow label="Übernommen" value={customer.importedFrom.replace('crm-import-', 'am ')} />}
            </dl>
          </section>

          {(customer.gocardlessCustomerId || lc === 'kunde') && (
            <section className="card">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-semibold text-gray-900">Lastschrift</h2>
                <Link href={`/dashboard/kunden/${customer.id}/edit`} className="text-xs text-brand-blue hover:underline font-medium">
                  Bearbeiten →
                </Link>
              </div>
              {customer.gocardlessCustomerId ? (
                <dl className="space-y-3 text-sm">
                  <DetailRow label="GoCardless-ID" value={customer.gocardlessCustomerId} />
                  {customer.retainerInvoiceEmail && <DetailRow label="Rechnungs-Mail" value={customer.retainerInvoiceEmail} />}
                  {customer.retainerInvoiceTemplate && <DetailRow label="Rechnungstext" value={customer.retainerInvoiceTemplate} />}
                </dl>
              ) : (
                <p className="text-sm text-gray-500">Nicht verknüpft. Mit GoCardless-ID laufen Lastschrift-Rechnungen automatisch.</p>
              )}
            </section>
          )}
        </div>

        <div className="lg:col-span-2 space-y-6">
          {(hasSeoCheck(customer) || customer.callStatus || lc === 'lead' || lc === 'interessent') && (
            <CallScript
              key={customer.id}
              customer={customer}
              vorname={customer.firstName || contacts[0]?.firstName}
              check={latestCheck}
              domain={domain}
              openTaskIds={extra.activities
                .filter((a) => a.customerId === customer.id && a.type === 'anruf' && a.dueDate && !a.completed)
                .map((a) => a.id)}
              onLogged={load}
            />
          )}
          <Timeline customerId={customer.id} contacts={contacts} items={timeline} mailState={mailState} onChanged={load} onLogged={onLogged} />

          <ListSection title="Deals" count={deals.length} action={{ href: '/dashboard/vertrieb', label: 'Zur Pipeline →' }} empty="Noch kein Deal.">
            {deals.map((d) => {
              const sd = stageDef(d.stage);
              return (
                <Row key={d.id} href={`/dashboard/vertrieb/${d.id}`} title={d.title} sub={formatTsDE(d.updatedAt)}>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-sm text-white" style={{ backgroundColor: sd.color }}>
                    {sd.label}
                  </span>
                  <Amount value={d.value} />
                </Row>
              );
            })}
          </ListSection>

          <ListSection title="Angebote" count={quotes.length} action={{ href: `/dashboard/angebote/neu?customerId=${customer.id}`, label: '+ Neues Angebot' }} empty="Noch kein Angebot.">
            {quotes.map((q) => {
              const cs = computeQuoteStatus(q.status, q.validUntil.toDate());
              return (
                <Row key={q.id} href={`/dashboard/angebote/${q.id}`} title={q.quoteNumber} sub={`${formatDateDE(q.quoteDate.toDate())} · gültig bis ${formatDateDE(q.validUntil.toDate())}`}>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-sm ${QUOTE_STATUS_BADGE_CLASSES[cs]}`}>{QUOTE_STATUS_LABELS[cs]}</span>
                  <Amount value={q.totalAmount} />
                </Row>
              );
            })}
          </ListSection>

          <ListSection title="Verträge" count={contracts.length} action={{ href: `/dashboard/vertraege/neu?customerId=${customer.id}`, label: '+ Neuer Vertrag' }} empty="Noch kein Vertrag.">
            {contracts.map((c) => {
              const cs = computeContractStatus(c);
              return (
                <Row
                  key={c.id}
                  href={`/dashboard/vertraege/${c.id}`}
                  title={c.title}
                  sub={`${c.typeLabel}${c.signedAt ? ` · signiert ${formatTsDE(c.signedAt)}` : c.sentAt ? ` · versendet ${formatTsDE(c.sentAt)}` : ' · Entwurf'}`}
                >
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-sm ${CONTRACT_STATUS_BADGE_CLASSES[cs]}`}>{CONTRACT_STATUS_LABELS[cs]}</span>
                </Row>
              );
            })}
          </ListSection>

          <ListSection title="Rechnungen" count={invoices.length} action={{ href: `/dashboard/rechnungen/neu?customerId=${customer.id}`, label: '+ Neue Rechnung' }} empty="Noch keine Rechnung.">
            {invoices.map((inv) => (
              <Row
                key={inv.id}
                href={`/dashboard/rechnungen/${inv.id}`}
                title={inv.invoiceNumber ?? 'Entwurf'}
                sub={formatDateDE(inv.invoiceDate.toDate())}
              >
                <span className={`text-xs font-medium px-2 py-0.5 rounded ${invoiceStatusBadgeClass(inv, inv.status) ?? ''}`}>{invoiceStatusLabel(inv, inv.status)}</span>
                <Amount value={inv.totalAmount} />
              </Row>
            ))}
          </ListSection>

          <div className="pt-2 text-right">
            <button
              onClick={handleDelete}
              disabled={deleting || invoices.length > 0 || quotes.length > 0}
              className="text-xs text-gray-400 hover:text-red-600 disabled:hover:text-gray-400 disabled:cursor-not-allowed"
              title={invoices.length > 0 || quotes.length > 0 ? 'Akte hat Rechnungen oder Angebote und kann nicht gelöscht werden.' : ''}
            >
              {deleting ? 'Löschen…' : 'Akte löschen'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Status und nächster Schritt: das, was man vor jedem Anruf wissen will. */
function StatusCard({
  customer,
  lifecycle,
  onLifecycle,
  onSaved,
}: {
  customer: Customer;
  lifecycle: CustomerLifecycle;
  onLifecycle: (l: CustomerLifecycle) => void;
  onSaved: (c: Customer) => void;
}) {
  const [step, setStep] = useState(customer.nextStep ?? '');
  const [date, setDate] = useState(customer.nextStepAt ? new Date(tsToMillis(customer.nextStepAt)).toISOString().slice(0, 10) : '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const dirty = step !== (customer.nextStep ?? '') || date !== (customer.nextStepAt ? new Date(tsToMillis(customer.nextStepAt)).toISOString().slice(0, 10) : '');
  const overdue = !!customer.nextStepAt && tsToMillis(customer.nextStepAt) < new Date().setHours(0, 0, 0, 0);

  const save = async () => {
    setSaving(true);
    const nextStepAt = date ? Timestamp.fromDate(new Date(`${date}T09:00:00`)) : null;
    await updateCustomer(customer.id, { nextStep: step.trim(), nextStepAt });
    onSaved({ ...customer, nextStep: step.trim(), nextStepAt });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <section className="card">
      <h2 className="text-base font-semibold text-gray-900 mb-3">Status</h2>
      <div className="grid grid-cols-3 gap-1.5" role="radiogroup" aria-label="Status">
        {LIFECYCLE_ORDER.map((l) => (
          <button
            key={l}
            type="button"
            role="radio"
            aria-checked={lifecycle === l}
            title={LIFECYCLE_HINTS[l]}
            onClick={() => onLifecycle(l)}
            className={`px-2 py-1.5 rounded-lg border text-xs transition-colors ${
              lifecycle === l ? 'border-brand-blue bg-blue-50 text-brand-blue font-medium' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {LIFECYCLE_LABELS[l]}
          </button>
        ))}
      </div>
      <p className="mt-1.5 text-xs text-gray-500">{LIFECYCLE_HINTS[lifecycle]}</p>

      <div className="mt-5">
        <label className="label" htmlFor="next-step">
          Nächster Schritt
        </label>
        <input
          id="next-step"
          className="input"
          placeholder="z. B. Freitag anrufen, Angebot nachfassen"
          value={step}
          onChange={(e) => setStep(e.target.value)}
        />
        <div className="mt-2 flex items-center gap-2">
          <input type="date" className={`input w-auto text-sm ${overdue ? 'border-red-300 text-red-700' : ''}`} value={date} onChange={(e) => setDate(e.target.value)} aria-label="Bis wann" />
          {dirty && (
            <button type="button" onClick={save} disabled={saving} className="btn-primary text-sm">
              {saving ? 'Speichert…' : 'Speichern'}
            </button>
          )}
          {saved && <span className="text-xs text-green-700">✓ gespeichert</span>}
        </div>
        {overdue && !dirty && <p className="mt-1.5 text-xs text-red-700">Überfällig</p>}
      </div>
    </section>
  );
}

function Kpi({ label, value, hint, tone }: { label: string; value: ReactNode; hint?: string; tone?: 'warn' }) {
  return (
    <div className="card p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`mt-1 text-xl font-semibold tabular-nums ${tone === 'warn' ? 'text-amber-700' : 'text-gray-900'}`}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-gray-500 truncate">{hint}</p>}
    </div>
  );
}

function ListSection({
  title,
  count,
  action,
  empty,
  children,
}: {
  title: string;
  count: number;
  action: { href: string; label: string };
  empty: string;
  children: ReactNode;
}) {
  return (
    <details className="card group" open={count > 0 && count <= 5}>
      <summary className="flex cursor-pointer list-none items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">
          <span className="inline-block w-4 text-gray-400 transition-transform group-open:rotate-90">›</span> {title}{' '}
          <span className="text-gray-400 font-normal">({count})</span>
        </h2>
        <Link href={action.href} className="text-sm text-brand-blue hover:underline font-medium" onClick={(e) => e.stopPropagation()}>
          {action.label}
        </Link>
      </summary>
      <div className="mt-3">{count === 0 ? <p className="text-sm text-gray-500">{empty}</p> : <div className="divide-y divide-gray-100">{children}</div>}</div>
    </details>
  );
}

function Row({ href, title, sub, children }: { href: string; title: string; sub: string; children: ReactNode }) {
  return (
    <Link href={href} className="flex items-center justify-between gap-3 py-3 hover:bg-gray-50 -mx-2 px-2 rounded-sm">
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{title}</p>
        <p className="text-xs text-gray-500 truncate">{sub}</p>
      </div>
      <div className="flex items-center gap-3 shrink-0">{children}</div>
    </Link>
  );
}

function Amount({ value }: { value: number | null }) {
  return (
    <span className="text-sm font-medium text-gray-900 w-24 text-right tabular-nums">
      {value != null ? <SensitiveValue>{formatEUR(value)}</SensitiveValue> : '—'}
    </span>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-gray-500">{label}</dt>
      <dd className="mt-0.5 text-gray-900 whitespace-pre-line">{value}</dd>
    </div>
  );
}

function relativeDays(ms: number): string {
  const days = Math.floor((new Date().setHours(23, 59, 59, 999) - ms) / 86400000);
  if (days <= 0) return 'Heute';
  if (days === 1) return 'Gestern';
  if (days < 30) return `vor ${days} Tagen`;
  return formatDateDE(new Date(ms));
}
