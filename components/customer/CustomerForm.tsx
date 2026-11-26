'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import type { Customer, Salutation } from '@/lib/types';
import { createCustomer, updateCustomer } from '@/lib/firestore';
import { LIFECYCLE_HINTS, LIFECYCLE_LABELS, LIFECYCLE_ORDER, normalizeDomain } from '@/lib/crm';

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
  lifecycle: 'lead',
  website: '',
  source: '',
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
          lifecycle: initial.lifecycle ?? 'kunde',
          website: initial.website ?? '',
          source: initial.source ?? '',
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
    const clean: CustomerFormData = {
      ...data,
      email: data.email.trim(),
      website: normalizeDomain(data.website) || (data.website ?? '').trim(),
      source: (data.source ?? '').trim(),
    };
    try {
      if (mode === 'create') {
        await createCustomer(clean);
        // Land on the list with a success banner — avoids a race where
        // the detail page tries to read the new doc before Firestore has
        // propagated it locally.
        router.push(
          `/dashboard/kunden?created=${encodeURIComponent(data.company || data.lastName || 'Kunde')}`,
        );
      } else if (initial) {
        await updateCustomer(initial.id, clean);
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
        <h2 className="text-base font-semibold text-gray-900">Vertrieb</h2>
        <div>
          <span className="label">Status</span>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Status">
            {LIFECYCLE_ORDER.map((l) => (
              <button
                key={l}
                type="button"
                role="radio"
                aria-checked={data.lifecycle === l}
                onClick={() => update('lifecycle', l)}
                title={LIFECYCLE_HINTS[l]}
                className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${
                  data.lifecycle === l
                    ? 'border-brand-blue bg-blue-50 text-brand-blue font-medium'
                    : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {LIFECYCLE_LABELS[l]}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-gray-500">
            {data.lifecycle ? LIFECYCLE_HINTS[data.lifecycle] : ''}
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="cf-website">Website</label>
            <input
              id="cf-website"
              className="input"
              placeholder="beispiel.de"
              value={data.website ?? ''}
              onChange={(e) => update('website', e.target.value)}
            />
            <p className="mt-1 text-xs text-gray-500">Verknüpft SEO-Checks und Mails dieser Firma.</p>
          </div>
          <div>
            <label className="label" htmlFor="cf-source">Woher kam der Kontakt?</label>
            <input
              id="cf-source"
              className="input"
              list="cf-source-list"
              placeholder="z. B. SEO-Check, Empfehlung"
              value={data.source ?? ''}
              onChange={(e) => update('source', e.target.value)}
            />
            <datalist id="cf-source-list">
              {['SEO-Check', 'Empfehlung', 'TikTok', 'Instagram', 'Outreach Instagram', 'Google', 'Kontaktformular', 'Meta-Werbung', 'BNI / Netzwerk'].map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
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
            multiple
            className="input"
            value={data.retainerInvoiceEmail ?? ''}
            onChange={(e) => update('retainerInvoiceEmail', e.target.value)}
            placeholder="z.B. rechnungen@carhifi-herford.de, chef@carhifi-herford.de"
          />
          <p className="mt-1 text-xs text-gray-500">
            Wenn gesetzt, gehen Rechnungen und Zahlungserinnerungen nur an
            diese Adresse(n), nicht an die Haupt-Mail. Mehrere mit Komma
            trennen. Domain-Match prüft alle Adressen.
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
