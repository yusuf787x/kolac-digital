'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getCustomer } from '@/lib/firestore';
import type { Customer } from '@/lib/types';
import CustomerForm from '@/components/customer/CustomerForm';

export default function KundeEditPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getCustomer(id)
      .then(setCustomer)
      .catch((err) => {
        console.error(err);
        setError('Kunde konnte nicht geladen werden.');
      })
      .finally(() => setLoading(false));
  }, [id]);

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
          href={`/dashboard/kunden/${customer.id}`}
          className="text-sm text-gray-500 hover:text-gray-900 mb-3 inline-block"
        >
          ← Zurück zu {customer.company}
        </Link>
        <h1 className="text-3xl font-semibold text-gray-900">
          Kunde bearbeiten
        </h1>
      </header>

      <CustomerForm mode="edit" initial={customer} />
    </div>
  );
}
