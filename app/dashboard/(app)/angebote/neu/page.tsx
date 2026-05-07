import { Suspense } from 'react';
import Link from 'next/link';
import QuoteForm from '@/components/quote/QuoteForm';

export default function NeuesAngebotPage() {
  return (
    <div>
      <header className="mb-8">
        <Link
          href="/dashboard/angebote"
          className="text-sm text-gray-500 hover:text-gray-900 mb-3 inline-block"
        >
          ← Zurück zu Angeboten
        </Link>
        <h1 className="text-3xl font-semibold text-gray-900">Neues Angebot</h1>
      </header>

      <Suspense fallback={<div className="card text-sm text-gray-500">Lädt…</div>}>
        <QuoteForm mode="create" />
      </Suspense>
    </div>
  );
}
