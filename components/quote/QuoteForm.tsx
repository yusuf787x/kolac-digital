'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Timestamp } from 'firebase/firestore';
import {
  createQuoteWithNumber,
  updateQuote,
  listCustomers,
  getSettings,
} from '@/lib/firestore';
import type { Customer, Quote, InvoiceItem } from '@/lib/types';
import { formatEUR } from '@/lib/utils';

interface ItemDraft {
  description: string;
  quantity: string;
  unitPrice: string;
}

const emptyItem = (): ItemDraft => ({
  description: '',
  quantity: '1',
  unitPrice: '0',
});

const dateInputValue = (d: Date) => d.toISOString().slice(0, 10);

interface Props {
  initial?: Quote;
  mode: 'create' | 'edit';
}

export default function QuoteForm({ initial, mode }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedCustomerId = searchParams.get('customerId');

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(true);

  const [customerId, setCustomerId] = useState(initial?.customerId ?? '');
  const [quoteDate, setQuoteDate] = useState(
    initial ? dateInputValue(initial.quoteDate.toDate()) : dateInputValue(new Date()),
  );
  const [validUntil, setValidUntil] = useState(
    initial ? dateInputValue(initial.validUntil.toDate()) : '',
  );
  const [items, setItems] = useState<ItemDraft[]>(
    initial
      ? initial.items.map((i) => ({
          description: i.description,
          quantity: String(i.quantity),
          unitPrice: i.unitPrice.toFixed(2),
        }))
      : [emptyItem()],
  );
  const [closingText, setClosingText] = useState(
    initial?.closingText ?? 'Vielen Dank und liebe Grüße\nYusuf Kolac',
  );
  const [acceptanceText, setAcceptanceText] = useState(initial?.acceptanceText ?? '');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // validUntil flow: starts as quoteDate + validDays, auto-tracks quoteDate
  // until the user manually edits it.
  const [validDays, setValidDays] = useState(14);
  const [validUntilUserSet, setValidUntilUserSet] = useState(mode === 'edit');

  const addDays = (isoDate: string, days: number): string => {
    const d = new Date(isoDate);
    d.setDate(d.getDate() + days);
    return dateInputValue(d);
  };

  useEffect(() => {
    Promise.all([listCustomers(), getSettings()])
      .then(([cust, settings]) => {
        setCustomers(cust);
        if (mode === 'create') {
          if (preselectedCustomerId) setCustomerId(preselectedCustomerId);
          setValidDays(settings.defaultQuoteValidDays);
          if (!validUntil) {
            setValidUntil(addDays(quoteDate, settings.defaultQuoteValidDays));
          }
          if (!acceptanceText) {
            setAcceptanceText(settings.defaultQuoteAcceptanceText);
          }
          setClosingText(settings.defaultClosingText);
        }
      })
      .catch((err) => {
        console.error(err);
        setError('Daten konnten nicht geladen werden.');
      })
      .finally(() => setLoadingCustomers(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleQuoteDateChange = (newDate: string) => {
    setQuoteDate(newDate);
    if (mode === 'create' && !validUntilUserSet && newDate) {
      setValidUntil(addDays(newDate, validDays));
    }
  };

  const handleValidUntilChange = (newDate: string) => {
    setValidUntil(newDate);
    setValidUntilUserSet(true);
  };

  const updateItem = (idx: number, key: keyof ItemDraft, value: string) => {
    setItems((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [key]: value };
      return next;
    });
  };

  const moveItem = (idx: number, direction: -1 | 1) => {
    setItems((prev) => {
      const next = [...prev];
      const target = idx + direction;
      if (target < 0 || target >= next.length) return next;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  };

  const removeItem = (idx: number) => {
    setItems((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== idx)));
  };

  const addItem = () => setItems((prev) => [...prev, emptyItem()]);

  const itemTotal = (i: ItemDraft) => {
    const q = parseFloat(i.quantity) || 0;
    const p = parseFloat(i.unitPrice) || 0;
    return q * p;
  };

  const grandTotal = items.reduce((acc, i) => acc + itemTotal(i), 0);
  const selectedCustomer = customers.find((c) => c.id === customerId);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!customerId) {
      setError('Bitte einen Kunden auswählen.');
      return;
    }
    if (items.length === 0 || items.every((i) => !i.description.trim())) {
      setError('Bitte mindestens eine Position angeben.');
      return;
    }
    setError(null);
    setSubmitting(true);

    const cleanItems: InvoiceItem[] = items.map((it, idx) => ({
      position: idx + 1,
      description: it.description,
      quantity: parseFloat(it.quantity) || 0,
      unitPrice: parseFloat(it.unitPrice) || 0,
      totalPrice: itemTotal(it),
    }));

    try {
      if (mode === 'create') {
        const { id } = await createQuoteWithNumber({
          customerId,
          quoteDate: Timestamp.fromDate(new Date(quoteDate)),
          validUntil: Timestamp.fromDate(new Date(validUntil)),
          status: 'draft',
          totalAmount: grandTotal,
          closingText,
          acceptanceText,
          pdfUrl: null,
          driveUrl: null,
          confirmationFileUrl: null,
          confirmationFilename: null,
          confirmationDriveUrl: null,
          sentAt: null,
          acceptedAt: null,
          rejectedAt: null,
          invoicedAt: null,
          invoiceId: null,
          items: cleanItems,
        });
        router.push(`/dashboard/angebote/${id}`);
      } else if (initial) {
        await updateQuote(initial.id, {
          customerId,
          quoteDate: Timestamp.fromDate(new Date(quoteDate)),
          validUntil: Timestamp.fromDate(new Date(validUntil)),
          totalAmount: grandTotal,
          closingText,
          acceptanceText,
          items: cleanItems,
        });
        router.push(`/dashboard/angebote/${initial.id}`);
      }
    } catch (err) {
      console.error(err);
      setError(`Speichern fehlgeschlagen: ${(err as Error).message}`);
      setSubmitting(false);
    }
  };

  if (loadingCustomers) {
    return <div className="card text-sm text-gray-500">Lädt Kunden…</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <section className="card space-y-4">
        <h2 className="text-base font-semibold text-gray-900">Kunde & Termine</h2>

        <div>
          <label className="label">Kunde *</label>
          <select
            className="input"
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            required
          >
            <option value="">Bitte wählen…</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.company} — {c.firstName} {c.lastName}
              </option>
            ))}
          </select>
        </div>

        {selectedCustomer && (
          <div className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3 whitespace-pre-line">
            {selectedCustomer.salutation} {selectedCustomer.firstName}{' '}
            {selectedCustomer.lastName}
            {'\n'}
            {selectedCustomer.company}
            {selectedCustomer.street && `\n${selectedCustomer.street}`}
            {(selectedCustomer.zip || selectedCustomer.city) &&
              `\n${selectedCustomer.zip} ${selectedCustomer.city}`}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Angebotsdatum *</label>
            <input
              type="date"
              className="input"
              value={quoteDate}
              onChange={(e) => handleQuoteDateChange(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label">Gültig bis *</label>
            <input
              type="date"
              className="input"
              value={validUntil}
              onChange={(e) => handleValidUntilChange(e.target.value)}
              required
            />
          </div>
        </div>
      </section>

      <section className="card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Positionen</h2>
          <button
            type="button"
            onClick={addItem}
            className="text-sm text-brand-blue hover:underline font-medium"
          >
            + Position hinzufügen
          </button>
        </div>

        <div className="space-y-3">
          {items.map((item, idx) => (
            <div
              key={idx}
              className="grid grid-cols-12 gap-3 items-start border border-gray-200 rounded-lg p-3"
            >
              <div className="col-span-12 sm:col-span-6">
                <label className="label">Beschreibung</label>
                <textarea
                  className="input min-h-[60px]"
                  value={item.description}
                  onChange={(e) => updateItem(idx, 'description', e.target.value)}
                  placeholder="z.B. Webentwicklung Pauschal"
                />
              </div>
              <div className="col-span-4 sm:col-span-2">
                <label className="label">Anzahl</label>
                <input
                  type="number"
                  step="any"
                  className="input"
                  value={item.quantity}
                  onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                />
              </div>
              <div className="col-span-4 sm:col-span-2">
                <label className="label">Einzelpreis</label>
                <input
                  type="number"
                  step="0.01"
                  className="input"
                  value={item.unitPrice}
                  onChange={(e) => updateItem(idx, 'unitPrice', e.target.value)}
                />
              </div>
              <div className="col-span-4 sm:col-span-2">
                <label className="label">Summe</label>
                <div className="input bg-gray-50 text-right">
                  {formatEUR(itemTotal(item))}
                </div>
              </div>

              <div className="col-span-12 flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => moveItem(idx, -1)}
                  disabled={idx === 0}
                  className="text-xs text-gray-500 hover:text-gray-900 disabled:opacity-30"
                >
                  ↑ Nach oben
                </button>
                <button
                  type="button"
                  onClick={() => moveItem(idx, 1)}
                  disabled={idx === items.length - 1}
                  className="text-xs text-gray-500 hover:text-gray-900 disabled:opacity-30"
                >
                  ↓ Nach unten
                </button>
                <button
                  type="button"
                  onClick={() => removeItem(idx)}
                  disabled={items.length === 1}
                  className="text-xs text-red-600 hover:underline disabled:opacity-30"
                >
                  Entfernen
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end pt-2 border-t border-gray-100">
          <div className="text-right">
            <div className="text-lg font-semibold text-gray-900">
              Gesamt: {formatEUR(grandTotal)}
            </div>
          </div>
        </div>
      </section>

      <section className="card space-y-4">
        <h2 className="text-base font-semibold text-gray-900">Bestätigung & Abschluss</h2>
        <div>
          <label className="label">Akzeptanztext</label>
          <textarea
            className="input min-h-[80px]"
            value={acceptanceText}
            onChange={(e) => setAcceptanceText(e.target.value)}
            placeholder="z.B. Bitte bestätigen Sie das Angebot per E-Mail oder WhatsApp…"
          />
          <p className="mt-1 text-xs text-gray-500">
            Erscheint auf dem Angebots-PDF anstelle der Zahlungsinformationen.
          </p>
        </div>
        <div>
          <label className="label">Abschlusstext</label>
          <textarea
            className="input min-h-[60px]"
            value={closingText}
            onChange={(e) => setClosingText(e.target.value)}
          />
        </div>
      </section>

      {error && (
        <div className="px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button type="submit" disabled={submitting} className="btn-primary">
          {submitting
            ? 'Speichern…'
            : mode === 'create'
              ? 'Angebot anlegen'
              : 'Speichern'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="btn-secondary"
          disabled={submitting}
        >
          Abbrechen
        </button>
      </div>
    </form>
  );
}
