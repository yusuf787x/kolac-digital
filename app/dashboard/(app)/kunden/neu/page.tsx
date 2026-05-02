import Link from 'next/link';
import CustomerForm from '@/components/customer/CustomerForm';

export default function NeuerKundePage() {
  return (
    <div>
      <header className="mb-8">
        <Link
          href="/dashboard/kunden"
          className="text-sm text-gray-500 hover:text-gray-900 mb-3 inline-block"
        >
          ← Zurück zu Kunden
        </Link>
        <h1 className="text-3xl font-semibold text-gray-900">Neuer Kunde</h1>
      </header>

      <CustomerForm mode="create" />
    </div>
  );
}
