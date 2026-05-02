import { Suspense } from 'react';
import Link from 'next/link';
import InvoiceForm from '@/components/invoice/InvoiceForm';

export default function NeueRechnungPage() {
  return (
    <div>
      <header className="mb-8">
        <Link
          href="/dashboard/rechnungen"
          className="text-sm text-gray-500 hover:text-gray-900 mb-3 inline-block"
        >
          ← Zurück zu Rechnungen
        </Link>
        <h1 className="text-3xl font-semibold text-gray-900">Neue Rechnung</h1>
      </header>

      <Suspense fallback={<div className="card text-sm text-gray-500">Lädt…</div>}>
        <InvoiceForm mode="create" />
      </Suspense>
    </div>
  );
}
