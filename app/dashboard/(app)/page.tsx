'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  listInvoices,
  listExpenses,
  listCustomers,
  listQuotes,
  listDeals,
  listOpenActivities,
} from '@/lib/firestore';
import type {
  Invoice,
  Expense,
  Customer,
  Quote,
  Deal,
  Activity,
} from '@/lib/types';
import {
  formatEUR,
  formatDateDE,
  isOverdue,
  daysOverdue,
} from '@/lib/utils';
import { activityDef } from '@/lib/sales';
import { STATUS_LABELS, STATUS_BADGE_CLASSES } from '@/lib/invoice-status';
import { computeQuoteStatus } from '@/lib/quote-status';
import SensitiveValue from '@/components/ui/SensitiveValue';

export default function DashboardHomePage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [customerMap, setCustomerMap] = useState<Map<string, Customer>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      listInvoices(),
      listExpenses(),
      listCustomers(),
      listQuotes(),
      listDeals(),
      listOpenActivities(),
    ])
      .then(([inv, exp, cust, qts, dls, acts]) => {
        setInvoices(inv);
        setExpenses(exp);
        setQuotes(qts);
        setDeals(dls);
        setActivities(acts);
        setCustomerMap(new Map(cust.map((c) => [c.id, c])));
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const dealMap = useMemo(
    () => new Map(deals.map((d) => [d.id, d])),
    [deals],
  );

  // Heute fällige + überfällige (offene) Aktivitäten, früheste zuerst.
  const dueActivities = useMemo(() => {
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);
    return activities
      .filter((a) => a.dueDate && a.dueDate.toMillis() <= endOfToday.getTime())
      .sort((a, b) => a.dueDate!.toMillis() - b.dueDate!.toMillis());
  }, [activities]);

  const stats = useMemo(() => {
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();
    const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;
    const lastMonthYear = thisMonth === 0 ? thisYear - 1 : thisYear;

    let revenueThisMonth = 0;
    let revenueLastMonth = 0;
    let revenueThisYear = 0;
    let openCount = 0;
    let openAmount = 0;
    let overdueCount = 0;
    let overdueAmount = 0;

    invoices.forEach((inv) => {
      // Revenue counts: paid amount of paid + partially_paid invoices,
      // attributed to the invoice date (cash-basis / Kleinunternehmer).
      const date = inv.invoiceDate.toDate();
      const earned =
        inv.status === 'paid'
          ? inv.totalAmount
          : inv.status === 'partially_paid'
            ? inv.paidAmount
            : 0;

      if (date.getFullYear() === thisYear) revenueThisYear += earned;
      if (date.getFullYear() === thisYear && date.getMonth() === thisMonth)
        revenueThisMonth += earned;
      if (
        date.getFullYear() === lastMonthYear &&
        date.getMonth() === lastMonth
      )
        revenueLastMonth += earned;

      if (inv.status === 'sent' || inv.status === 'partially_paid') {
        const remaining =
          inv.status === 'partially_paid'
            ? inv.totalAmount - inv.paidAmount
            : inv.totalAmount;
        openCount++;
        openAmount += remaining;
        if (isOverdue(inv.status, inv.dueDate.toDate())) {
          overdueCount++;
          overdueAmount += remaining;
        }
      }
    });

    let expensesThisMonth = 0;
    expenses.forEach((e) => {
      const d = e.date.toDate();
      if (d.getFullYear() === thisYear && d.getMonth() === thisMonth)
        expensesThisMonth += e.amount;
    });

    const profitThisMonth = revenueThisMonth - expensesThisMonth;

    let openQuotesCount = 0;
    let openQuotesAmount = 0;
    quotes.forEach((q) => {
      const cs = computeQuoteStatus(q.status, q.validUntil.toDate());
      if (cs === 'sent' || cs === 'draft') {
        openQuotesCount++;
        openQuotesAmount += q.totalAmount;
      }
    });

    return {
      revenueThisMonth,
      revenueLastMonth,
      revenueThisYear,
      openCount,
      openAmount,
      overdueCount,
      overdueAmount,
      expensesThisMonth,
      profitThisMonth,
      openQuotesCount,
      openQuotesAmount,
    };
  }, [invoices, expenses, quotes]);

  const recentInvoices = useMemo(
    () =>
      [...invoices]
        .sort((a, b) => b.invoiceDate.toMillis() - a.invoiceDate.toMillis())
        .slice(0, 5),
    [invoices],
  );

  const overdueList = useMemo(
    () =>
      invoices
        .filter(
          (inv) =>
            inv.status !== 'paid' &&
            inv.status !== 'partially_paid' &&
            isOverdue(inv.status, inv.dueDate.toDate()),
        )
        .sort((a, b) => a.dueDate.toMillis() - b.dueDate.toMillis()),
    [invoices],
  );

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-3xl font-semibold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Übersicht über Umsatz, offene Rechnungen und Ausgaben.
        </p>
      </header>

      {loading ? (
        <div className="card text-sm text-gray-500">Lädt Daten…</div>
      ) : (
        <>
          {stats.overdueCount > 0 && (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-5 py-4 flex items-center justify-between">
              <div className="text-sm text-red-800">
                <strong>{stats.overdueCount}</strong>{' '}
                {stats.overdueCount === 1 ? 'Rechnung' : 'Rechnungen'} überfällig ·{' '}
                <SensitiveValue>{formatEUR(stats.overdueAmount)}</SensitiveValue>{' '}
                offen
              </div>
              <Link
                href="/dashboard/rechnungen"
                className="text-sm font-medium text-red-700 hover:underline"
              >
                Anzeigen →
              </Link>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Umsatz aktueller Monat"
              value={formatEUR(stats.revenueThisMonth)}
              hint={`Vormonat: ${formatEUR(stats.revenueLastMonth)}`}
            />
            <StatCard
              label="Umsatz dieses Jahr"
              value={formatEUR(stats.revenueThisYear)}
            />
            <StatCard
              label="Offene Rechnungen"
              value={formatEUR(stats.openAmount)}
              hint={`${stats.openCount} ${stats.openCount === 1 ? 'Rechnung' : 'Rechnungen'}`}
            />
            <StatCard
              label="Ausgaben aktueller Monat"
              value={formatEUR(stats.expensesThisMonth)}
              hint={`Gewinn: ${formatEUR(stats.profitThisMonth)}`}
            />
          </div>

          {stats.openQuotesCount > 0 && (
            <div className="mt-4">
              <Link
                href="/dashboard/angebote"
                className="block card hover:bg-gray-50 transition-colors"
              >
                <p className="text-xs uppercase tracking-wider text-gray-500">
                  Offene Angebote (Sales Pipeline)
                </p>
                <p className="mt-2 text-2xl font-semibold text-orange-700">
                  <SensitiveValue>
                    {formatEUR(stats.openQuotesAmount)}
                  </SensitiveValue>
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  {stats.openQuotesCount}{' '}
                  {stats.openQuotesCount === 1 ? 'Angebot' : 'Angebote'} warten
                  auf Antwort →
                </p>
              </Link>
            </div>
          )}

          {dueActivities.length > 0 && (
            <section className="card mt-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-gray-900">
                  Fällige Aktivitäten
                </h2>
                <Link
                  href="/dashboard/vertrieb"
                  className="text-xs text-brand-blue hover:underline font-medium"
                >
                  Zum Vertrieb →
                </Link>
              </div>
              <div className="divide-y divide-gray-100">
                {dueActivities.map((a) => {
                  const deal = dealMap.get(a.dealId);
                  const def = activityDef(a.type);
                  const due = a.dueDate!.toDate();
                  const overdue = a.dueDate!.toMillis() < Date.now();
                  const days = daysOverdue(due);
                  const customerName = deal
                    ? customerMap.get(deal.customerId)?.company ??
                      `${customerMap.get(deal.customerId)?.firstName ?? ''} ${customerMap.get(deal.customerId)?.lastName ?? ''}`.trim()
                    : '';
                  return (
                    <Link
                      key={a.id}
                      href={
                        deal ? `/dashboard/vertrieb/${deal.id}` : '/dashboard/vertrieb'
                      }
                      className="flex items-center justify-between py-3 hover:bg-gray-50 -mx-2 px-2 rounded"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {def.icon} {a.description}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {customerName || '—'}
                          {deal?.title ? ` · ${deal.title}` : ''}
                        </p>
                      </div>
                      <span
                        className={`ml-3 flex-shrink-0 text-xs font-medium ${
                          overdue ? 'text-red-600' : 'text-gray-500'
                        }`}
                      >
                        {overdue
                          ? `${days} ${days === 1 ? 'Tag' : 'Tage'} überfällig`
                          : `heute fällig`}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <section className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-gray-900">
                  Letzte Rechnungen
                </h2>
                <Link
                  href="/dashboard/rechnungen"
                  className="text-xs text-brand-blue hover:underline font-medium"
                >
                  Alle →
                </Link>
              </div>
              {recentInvoices.length === 0 ? (
                <p className="text-sm text-gray-500">
                  Noch keine Rechnungen erstellt.
                </p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {recentInvoices.map((inv) => {
                    const computedStatus =
                      inv.status !== 'paid' &&
                      inv.status !== 'partially_paid' &&
                      isOverdue(inv.status, inv.dueDate.toDate())
                        ? 'overdue'
                        : inv.status;
                    return (
                      <Link
                        key={inv.id}
                        href={`/dashboard/rechnungen/${inv.id}`}
                        className="flex items-center justify-between py-3 hover:bg-gray-50 -mx-2 px-2 rounded"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {inv.invoiceNumber ?? 'Entwurf'} ·{' '}
                            {customerMap.get(inv.customerId)?.company ?? '—'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatDateDE(inv.invoiceDate.toDate())}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 ml-3">
                          <span
                            className={`text-xs font-medium px-2 py-0.5 rounded ${STATUS_BADGE_CLASSES[computedStatus]}`}
                          >
                            {STATUS_LABELS[computedStatus]}
                          </span>
                          <span className="text-sm font-medium text-gray-900 w-24 text-right">
                            <SensitiveValue>
                              {formatEUR(inv.totalAmount)}
                            </SensitiveValue>
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="card">
              <h2 className="text-base font-semibold text-gray-900 mb-4">
                Überfällige Rechnungen
              </h2>
              {overdueList.length === 0 ? (
                <p className="text-sm text-gray-500">
                  Keine überfälligen Rechnungen. 🎉
                </p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {overdueList.map((inv) => {
                    const days = daysOverdue(inv.dueDate.toDate());
                    return (
                      <Link
                        key={inv.id}
                        href={`/dashboard/rechnungen/${inv.id}`}
                        className="flex items-center justify-between py-3 hover:bg-gray-50 -mx-2 px-2 rounded"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {inv.invoiceNumber ?? 'Entwurf'} ·{' '}
                            {customerMap.get(inv.customerId)?.company ?? '—'}
                          </p>
                          <p className="text-xs text-red-600">
                            {days} {days === 1 ? 'Tag' : 'Tage'} überfällig ·
                            zahlbar bis {formatDateDE(inv.dueDate.toDate())}
                          </p>
                        </div>
                        <span className="text-sm font-medium text-gray-900 ml-3">
                          <SensitiveValue>
                            {formatEUR(inv.totalAmount)}
                          </SensitiveValue>
                        </span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="card">
      <p className="text-xs uppercase tracking-wider text-gray-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-gray-900">
        <SensitiveValue>{value}</SensitiveValue>
      </p>
      {hint && (
        <p className="mt-1 text-xs text-gray-500">
          {hint.includes('€') ? (
            <SensitiveValue>{hint}</SensitiveValue>
          ) : (
            hint
          )}
        </p>
      )}
    </div>
  );
}
