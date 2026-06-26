'use client';

import { Suspense, useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  getCustomer,
  deleteCustomer,
  listInvoicesByCustomer,
  listQuotesByCustomer,
  listDealsByCustomer,
  listContractsByCustomer,
} from '@/lib/firestore';
import type { Customer, Invoice, Quote, Deal, Contract } from '@/lib/types';
import {
  CONTRACT_STATUS_LABELS,
  CONTRACT_STATUS_BADGE_CLASSES,
  computeContractStatus,
} from '@/lib/contract-status';
import { formatEUR, formatDateDE, formatTsDE } from '@/lib/utils';
import { stageDef } from '@/lib/sales';
import { STATUS_LABELS, STATUS_BADGE_CLASSES } from '@/lib/invoice-status';
import {
  computeQuoteStatus,
  QUOTE_STATUS_LABELS,
  QUOTE_STATUS_BADGE_CLASSES,
} from '@/lib/quote-status';

export default function KundeDetailPage() {
  return (
    <Suspense fallback={<div className="card text-sm text-gray-500">Lädt…</div>}>
      <KundeDetailInner />
    </Suspense>
  );
}

function KundeDetailInner() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = params.id;
  const updatedName = searchParams.get('updated');

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      getCustomer(id),
      listInvoicesByCustomer(id),
      listQuotesByCustomer(id),
      listDealsByCustomer(id),
      listContractsByCustomer(id),
    ])
      .then(([c, inv, qts, dls, ctr]) => {
        setCustomer(c);
        setInvoices(inv);
        setQuotes(qts);
        setDeals(dls);
        setContracts(ctr);
      })
      .catch((err) => {
        console.error(err);
        setError(`Kunde konnte nicht geladen werden: ${err.message}`);
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!updatedName) return;
    setSuccessBanner(`✓ "${updatedName}" wurde aktualisiert.`);
    router.replace(`/dashboard/kunden/${id}`);
    const t = setTimeout(() => setSuccessBanner(null), 4000);
    return () => clearTimeout(t);
  }, [updatedName, router, id]);

  const handleDelete = async () => {
    if (!customer) return;
    if (invoices.length > 0 || quotes.length > 0) {
      const parts: string[] = [];
      if (invoices.length > 0)
        parts.push(`${invoices.length} Rechnung(en)`);
      if (quotes.length > 0) parts.push(`${quotes.length} Angebot(e)`);
      alert(
        `Kunde hat ${parts.join(' und ')} und kann nicht gelöscht werden.`,
      );
      return;
    }
    if (
      !confirm(
        `"${customer.company}" wirklich löschen? Das kann nicht rückgängig gemacht werden.`,
      )
    )
      return;
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

  if (loading) {
    return <div className="card text-sm text-gray-500">Lädt…</div>;
  }

  if (error || !customer) {
    return (
      <div className="card text-sm text-red-700 bg-red-50 border-red-200">
        {error ?? 'Kunde nicht gefunden.'}
      </div>
    );
  }

  return (
    <div>
      <header className="mb-8">
        <Link
          href="/dashboard/kunden"
          className="text-sm text-gray-500 hover:text-gray-900 mb-3 inline-block"
        >
          ← Zurück zu Kunden
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-gray-900">
              {customer.company || '—'}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {[customer.firstName, customer.lastName]
                .filter(Boolean)
                .join(' ') || '—'}
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href={`/dashboard/kunden/${customer.id}/edit`}
              className="btn-secondary"
            >
              Bearbeiten
            </Link>
            <button
              onClick={handleDelete}
              disabled={deleting || invoices.length > 0 || quotes.length > 0}
              className="btn-secondary text-red-600 hover:bg-red-50 disabled:opacity-50"
              title={
                invoices.length > 0 || quotes.length > 0
                  ? 'Kunde hat Rechnungen oder Angebote und kann nicht gelöscht werden.'
                  : ''
              }
            >
              {deleting ? 'Löschen…' : 'Löschen'}
            </button>
          </div>
        </div>
      </header>

      {successBanner && (
        <div className="mb-6 px-4 py-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-900">
          {successBanner}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <section className="card">
            <h2 className="text-base font-semibold text-gray-900 mb-4">
              Adresse & Kontakt
            </h2>
            <dl className="space-y-3 text-sm">
              <DetailRow label="Anrede" value={customer.salutation} />
              <DetailRow
                label="Adresse"
                value={
                  customer.street || customer.zip || customer.city
                    ? `${customer.street}\n${customer.zip} ${customer.city}`.trim()
                    : '—'
                }
              />
              <DetailRow label="E-Mail" value={customer.email || '—'} />
              <DetailRow label="Telefon" value={customer.phone || '—'} />
              {customer.taxId && (
                <DetailRow label="Steuernr. / USt-ID" value={customer.taxId} />
              )}
              {customer.notes && (
                <DetailRow label="Notizen" value={customer.notes} />
              )}
            </dl>
          </section>

          <section className="card">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-gray-900">
                GoCardless / Lastschrift
              </h2>
              <Link
                href={`/dashboard/kunden/${customer.id}/edit`}
                className="text-xs text-brand-blue hover:underline font-medium"
              >
                Bearbeiten →
              </Link>
            </div>
            {customer.gocardlessCustomerId ? (
              <dl className="space-y-3 text-sm">
                <DetailRow
                  label="Customer ID"
                  value={customer.gocardlessCustomerId}
                />
                {customer.retainerInvoiceEmail && (
                  <DetailRow
                    label="Rechnungs-Mail"
                    value={customer.retainerInvoiceEmail}
                  />
                )}
                {customer.retainerInvoiceTemplate && (
                  <DetailRow
                    label="Rechnungstext (Template)"
                    value={customer.retainerInvoiceTemplate}
                  />
                )}
              </dl>
            ) : (
              <div className="text-sm text-gray-500">
                <p>Noch nicht verknüpft.</p>
                <p className="mt-1.5 text-xs">
                  Lege bei Bearbeiten die GoCardless Customer ID an, dann
                  laufen Lastschrift-Rechnungen automatisch.
                </p>
              </div>
            )}
          </section>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <section className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900">
                Deals ({deals.length})
              </h2>
              <Link
                href="/dashboard/vertrieb"
                className="text-sm text-brand-blue hover:underline font-medium"
              >
                Zum Vertrieb →
              </Link>
            </div>

            {deals.length === 0 ? (
              <p className="text-sm text-gray-500">
                Noch keine Deals für diesen Kunden.
              </p>
            ) : (
              <div className="divide-y divide-gray-100">
                {deals.map((d) => {
                  const sd = stageDef(d.stage);
                  return (
                    <Link
                      key={d.id}
                      href={`/dashboard/vertrieb/${d.id}`}
                      className="flex items-center justify-between py-3 hover:bg-gray-50 -mx-2 px-2 rounded"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {d.title}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatTsDE(d.updatedAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span
                          className="text-xs font-medium px-2 py-0.5 rounded text-white"
                          style={{ backgroundColor: sd.color }}
                        >
                          {sd.label}
                        </span>
                        <span className="text-sm font-medium text-gray-900 w-24 text-right">
                          {d.value != null ? formatEUR(d.value) : '—'}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>

          <section className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900">
                Angebote ({quotes.length})
              </h2>
              <Link
                href={`/dashboard/angebote/neu?customerId=${customer.id}`}
                className="text-sm text-brand-blue hover:underline font-medium"
              >
                + Neues Angebot
              </Link>
            </div>

            {quotes.length === 0 ? (
              <p className="text-sm text-gray-500">
                Noch keine Angebote für diesen Kunden.
              </p>
            ) : (
              <div className="divide-y divide-gray-100">
                {quotes.map((q) => {
                  const cs = computeQuoteStatus(q.status, q.validUntil.toDate());
                  return (
                    <Link
                      key={q.id}
                      href={`/dashboard/angebote/${q.id}`}
                      className="flex items-center justify-between py-3 hover:bg-gray-50 -mx-2 px-2 rounded"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {q.quoteNumber}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatDateDE(q.quoteDate.toDate())} · gültig bis{' '}
                          {formatDateDE(q.validUntil.toDate())}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded ${QUOTE_STATUS_BADGE_CLASSES[cs]}`}
                        >
                          {QUOTE_STATUS_LABELS[cs]}
                        </span>
                        <span className="text-sm font-medium text-gray-900 w-24 text-right">
                          {formatEUR(q.totalAmount)}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>

          <section className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900">
                Verträge ({contracts.length})
              </h2>
              <Link
                href={`/dashboard/vertraege/neu?customerId=${customer.id}`}
                className="text-sm text-brand-blue hover:underline font-medium"
              >
                + Neuer Vertrag
              </Link>
            </div>

            {contracts.length === 0 ? (
              <p className="text-sm text-gray-500">
                Noch keine Verträge für diesen Kunden.
              </p>
            ) : (
              <div className="divide-y divide-gray-100">
                {contracts.map((c) => {
                  const cs = computeContractStatus(c);
                  return (
                    <Link
                      key={c.id}
                      href={`/dashboard/vertraege/${c.id}`}
                      className="flex items-center justify-between py-3 hover:bg-gray-50 -mx-2 px-2 rounded"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {c.title}
                        </p>
                        <p className="text-xs text-gray-500">
                          {c.typeLabel}
                          {c.signedAt
                            ? ` · signiert ${formatTsDE(c.signedAt)}`
                            : c.sentAt
                              ? ` · versendet ${formatTsDE(c.sentAt)}`
                              : ' · Entwurf'}
                        </p>
                      </div>
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded ${CONTRACT_STATUS_BADGE_CLASSES[cs]}`}
                      >
                        {CONTRACT_STATUS_LABELS[cs]}
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>

          <section className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900">
                Rechnungen ({invoices.length})
              </h2>
              <Link
                href={`/dashboard/rechnungen/neu?customerId=${customer.id}`}
                className="text-sm text-brand-blue hover:underline font-medium"
              >
                + Neue Rechnung
              </Link>
            </div>

            {invoices.length === 0 ? (
              <p className="text-sm text-gray-500">
                Noch keine Rechnungen für diesen Kunden.
              </p>
            ) : (
              <div className="divide-y divide-gray-100">
                {invoices.map((inv) => (
                  <Link
                    key={inv.id}
                    href={`/dashboard/rechnungen/${inv.id}`}
                    className="flex items-center justify-between py-3 hover:bg-gray-50 -mx-2 px-2 rounded"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {inv.invoiceNumber}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatDateDE(inv.invoiceDate.toDate())}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded ${
                          STATUS_BADGE_CLASSES[inv.status] ?? ''
                        }`}
                      >
                        {STATUS_LABELS[inv.status]}
                      </span>
                      <span className="text-sm font-medium text-gray-900 w-24 text-right">
                        {formatEUR(inv.totalAmount)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-gray-500">
        {label}
      </dt>
      <dd className="mt-0.5 text-gray-900 whitespace-pre-line">{value}</dd>
    </div>
  );
}
