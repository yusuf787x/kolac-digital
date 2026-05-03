'use client';

import { Suspense, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getInvoice } from '@/lib/firestore';
import type { Invoice } from '@/lib/types';
import InvoiceForm from '@/components/invoice/InvoiceForm';

export default function RechnungEditPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getInvoice(id)
      .then(setInvoice)
      .catch((err) => {
        console.error(err);
        setError('Rechnung konnte nicht geladen werden.');
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="card text-sm text-gray-500">Lädt…</div>;

  if (error || !invoice) {
    return (
      <div className="card text-sm text-red-700 bg-red-50 border-red-200">
        {error ?? 'Rechnung nicht gefunden.'}
      </div>
    );
  }

  if (invoice.status !== 'draft') {
    return (
      <div className="card text-sm text-gray-700">
        Nur Entwürfe können bearbeitet werden. Diese Rechnung hat den Status:{' '}
        <strong>{invoice.status}</strong>.
        <div className="mt-3">
          <Link
            href={`/dashboard/rechnungen/${invoice.id}`}
            className="text-brand-blue hover:underline text-sm font-medium"
          >
            ← Zurück zur Rechnung
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <header className="mb-8">
        <Link
          href={`/dashboard/rechnungen/${invoice.id}`}
          className="text-sm text-gray-500 hover:text-gray-900 mb-3 inline-block"
        >
          ← Zurück zu {invoice.invoiceNumber}
        </Link>
        <h1 className="text-3xl font-semibold text-gray-900">
          Rechnung bearbeiten
        </h1>
      </header>

      <Suspense fallback={<div className="card text-sm text-gray-500">Lädt…</div>}>
        <InvoiceForm mode="edit" initial={invoice} />
      </Suspense>
    </div>
  );
}
