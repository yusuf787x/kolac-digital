'use client';

import { Suspense, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getQuote } from '@/lib/firestore';
import type { Quote } from '@/lib/types';
import QuoteForm from '@/components/quote/QuoteForm';

export default function AngebotEditPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getQuote(id)
      .then(setQuote)
      .catch((err) => {
        console.error(err);
        setError(`Angebot konnte nicht geladen werden: ${err.message}`);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="card text-sm text-gray-500">Lädt…</div>;

  if (error || !quote) {
    return (
      <div className="card text-sm text-red-700 bg-red-50 border-red-200">
        {error ?? 'Angebot nicht gefunden.'}
      </div>
    );
  }

  if (quote.status !== 'draft') {
    return (
      <div className="card text-sm text-gray-700">
        Nur Entwürfe können bearbeitet werden. Aktueller Status:{' '}
        <strong>{quote.status}</strong>.
        <div className="mt-3">
          <Link
            href={`/dashboard/angebote/${quote.id}`}
            className="text-brand-blue hover:underline text-sm font-medium"
          >
            ← Zurück zum Angebot
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <header className="mb-8">
        <Link
          href={`/dashboard/angebote/${quote.id}`}
          className="text-sm text-gray-500 hover:text-gray-900 mb-3 inline-block"
        >
          ← Zurück zu {quote.quoteNumber}
        </Link>
        <h1 className="text-3xl font-semibold text-gray-900">Angebot bearbeiten</h1>
      </header>

      <Suspense fallback={<div className="card text-sm text-gray-500">Lädt…</div>}>
        <QuoteForm mode="edit" initial={quote} />
      </Suspense>
    </div>
  );
}
