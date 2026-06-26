'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import type { Customer, Salutation } from '@/lib/types';
import { createCustomer, updateCustomer } from '@/lib/firestore';

type CustomerFormData = Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>;

const EMPTY: CustomerFormData = {
  company: '',
  salutation: 'Herr',
  firstName: '',
  lastName: '',
  street: '',
  zip: '',
  city: '',
  email: '',
  phone: '',
  taxId: '',
  notes: '',
  gocardlessCustomerId: '',
  retainerInvoiceEmail: '',
  retainerInvoiceTemplate: '',
};

const DEFAULT_RETAINER_TEMPLATE = `Systempflege {monat_jahr}
inklusive Software-Updates, Wartung und Serverhosting.
DSGVO-konformes Hosting in der EU, automatische Backups, schnelle Reaktionszeiten.`;

interface Props {
  initial?: Customer;
  mode: 'create' | 'edit';
}

export default function CustomerForm({ initial, mode }: Props) {
  const router = useRouter();
  const [data, setData] = useState<CustomerFormData>(
    initial
      ? {
          company: initial.company,
          salutation: initial.salutation,
          firstName: initial.firstName,
          lastName: initial.lastName,
          street: initial.street,
          zip: initial.zip,
          city: initial.city,
          email: initial.email,
          phone: initial.phone,
          taxId: initial.taxId ?? '',
          notes: initial.notes ?? '',
          gocardlessCustomerId: initial.gocardlessCustomerId ?? '',
          retainerInvoiceEmail: initial.retainerInvoiceEmail ?? '',
          retainerInvoiceTemplate: initial.retainerInvoiceTemplate ?? '',
        }
      : EMPTY,
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = <K extends keyof CustomerFormData>(
    key: K,
    value: CustomerFormData[K],
  ) => setData((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === 'create') {
        await createCustomer(data);
        // Land on the list with a success banner — avoids a race where
        // the detail page tries to read the new doc before Firestore has
        // propagated it locally.
        router.push(
          `/dashboard/kunden?created=${encodeURIComponent(data.company || data.lastName || 'Kunde')}`,
        );
      } else if (initial) {
        await updateCustomer(initial.id, data);
        router.push(
          `/dashboard/kunden/${initial.id}?updated=${encodeURIComponent(data.company || data.lastName || 'Kunde')}`,
        );
      }
    } catch (err) {
      console.error(err);
      setError(`Speichern fehlgeschlagen: ${(err as Error).message}`);
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <section className="card space-y-4">
        <h2 className="text-base font-semibold text-gray-900">
          Stammdaten
        </h2>

        <div>
          <label className="label">Firma *</label>
          <input
            className="input"
            value={data.company}
            onChange={(e) => update('company', e.target.value)}
            required
            autoFocus
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="label">Anrede</label>
            <select
              className="input"
              value={data.salutation}
              onChange={(e) =>
                update('salutation', e.target.value as Salutation)
              }
            >
              <option value="Herr">Herr</option>
              <option value="Frau">Frau</option>
              <option value="Divers">Divers</option>
            </select>
          </div>
          <div>
            <label className="label">Vorname</label>
            <input
              className="input"
              value={data.firstName}
              onChange={(e) => update('firstName', e.target.value)}
            />
          </div>
          <div>
            <label className="label">Nachname</label>
            <input
              className="input"
              value={data.lastName}
              onChange={(e) => update('lastName', e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="label">Straße + Hausnummer</label>
          <input
            className="input"
            value={data.street}
            onChange={(e) => update('street', e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="label">PLZ</label>
            <input
              className="input"
              value={data.zip}
              onChange={(e) => update('zip', e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Ort</label>
            <input
              className="input"
              value={data.city}
              onChange={(e) => update('city', e.target.value)}
            />
          </div>
        </div>
      </section>

      <section className="card space-y-4">
        <h2 className="text-base font-semibold text-gray-900">Kontakt</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">E-Mail</label>
            <input
              type="email"
              className="input"
              value={data.email}
              onChange={(e) => update('email', e.target.value)}
            />
          </div>
          <div>
            <label className="label">Telefon</label>
            <input
              type="tel"
              className="input"
              value={data.phone}
              onChange={(e) => update('phone', e.target.value)}
            />
          </div>
        </div>
      </section>

      <section className="card space-y-4">
        <h2 className="text-base font-semibold text-gray-900">
          GoCardless / Lastschrift
        </h2>
        <p className="text-xs text-gray-500 -mt-2">
          Wenn dieser Kunde per SEPA-Lastschrift bezahlt, läuft die Rechnung
          automatisch raus, sobald GoCardless eine Zahlung bestätigt.
        </p>

        <div>
          <label className="label">GoCardless Customer ID (optional, Hardlink)</label>
          <input
            className="input font-mono text-sm"
            value={data.gocardlessCustomerId ?? ''}
            onChange={(e) => update('gocardlessCustomerId', e.target.value)}
            placeholder="z.B. CU000123ABCDEFG"
          />
          <p className="mt-1 text-xs text-gray-500">
            Wenn gesetzt, hat das Vorrang vor dem Domain-Match. Brauchst du
            nur in Sonderfällen (z.B. mehrere Kunden teilen sich eine Domain).
          </p>
        </div>

        <div>
          <label className="label">Rechnungs-Mail (optional)</label>
          <input
            type="email"
            className="input"
            value={data.retainerInvoiceEmail ?? ''}
            onChange={(e) => update('retainerInvoiceEmail', e.target.value)}
            placeholder="z.B. rechnungen@carhifi-herford.de"
          />
          <p className="mt-1 text-xs text-gray-500">
            Falls Rechnungen an eine andere Adresse als die Haupt-Mail sollen.
            Domain-Match prüft beide Adressen.
          </p>
        </div>

        <div>
          <label className="label">Rechnungstext (Template)</label>
          <textarea
            className="input min-h-[100px] font-mono text-sm"
            value={data.retainerInvoiceTemplate ?? ''}
            onChange={(e) => update('retainerInvoiceTemplate', e.target.value)}
            placeholder={DEFAULT_RETAINER_TEMPLATE}
          />
          <p className="mt-1 text-xs text-gray-500">
            Variablen: {'{monat}'}, {'{jahr}'}, {'{monat_jahr}'},{' '}
            {'{kunde_firma}'}, {'{betrag}'}. Leer lassen für Default.
          </p>
        </div>
      </section>

      <section className="card space-y-4">
        <h2 className="text-base font-semibold text-gray-900">Sonstiges</h2>
        <div>
          <label className="label">Steuernr. / USt-ID</label>
          <input
            className="input"
            value={data.taxId}
            onChange={(e) => update('taxId', e.target.value)}
          />
        </div>
        <div>
          <label className="label">Notizen</label>
          <textarea
            className="input min-h-[100px]"
            value={data.notes}
            onChange={(e) => update('notes', e.target.value)}
          />
        </div>
      </section>

      {error && (
        <div className="px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="btn-primary"
        >
          {submitting ? 'Speichern…' : mode === 'create' ? 'Anlegen' : 'Speichern'}
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
