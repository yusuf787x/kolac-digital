'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Timestamp } from 'firebase/firestore';
import Link from 'next/link';
import {
  listCustomers,
  listContractTypes,
  seedContractTypes,
  createContract,
  uploadFile,
} from '@/lib/firestore';
import {
  generateSigningToken,
  sha256Hex,
} from '@/lib/contract-utils';
import type {
  ContractField,
  ContractType,
  Customer,
} from '@/lib/types';

// PDF-Editor nur im Client laden — react-pdf nutzt window.
const PdfFieldEditor = dynamic(
  () => import('@/components/contract/PdfFieldEditor'),
  { ssr: false, loading: () => <div className="card text-sm text-gray-500">Lade PDF-Editor…</div> },
);

export default function NeuerVertragPage() {
  return (
    <Suspense fallback={<div className="card text-sm text-gray-500">Lädt…</div>}>
      <NeuerVertragInner />
    </Suspense>
  );
}

type Step = 'meta' | 'upload' | 'edit';

function NeuerVertragInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const presetCustomerId = searchParams.get('customerId') ?? '';

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [types, setTypes] = useState<ContractType[]>([]);
  const [loading, setLoading] = useState(true);

  const [step, setStep] = useState<Step>('meta');
  const [customerId, setCustomerId] = useState(presetCustomerId);
  const [typeId, setTypeId] = useState('');
  const [title, setTitle] = useState('');
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [reminderDays, setReminderDays] = useState(7);
  const [expiryDays, setExpiryDays] = useState(14);

  const [file, setFile] = useState<File | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfHash, setPdfHash] = useState<string | null>(null);
  const [fields, setFields] = useState<ContractField[]>([]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        await seedContractTypes();
        const [c, t] = await Promise.all([
          listCustomers(),
          listContractTypes(),
        ]);
        setCustomers(c);
        setTypes(t.filter((x) => x.active));
      } catch (err) {
        console.error(err);
        setError('Stammdaten konnten nicht geladen werden.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Title-Vorschlag, wenn Kunde + Typ gewählt.
  useEffect(() => {
    if (title) return;
    const c = customers.find((x) => x.id === customerId);
    const t = types.find((x) => x.id === typeId);
    if (c && t) {
      setTitle(`${t.shortLabel} ${c.company}`.trim());
    }
  }, [customerId, typeId, customers, types, title]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.type !== 'application/pdf') {
      setError('Bitte eine PDF-Datei wählen.');
      return;
    }
    setError(null);
    setFile(f);
    const buf = await f.arrayBuffer();
    const hash = await sha256Hex(buf);
    setPdfHash(hash);
    const url = URL.createObjectURL(f);
    setPdfUrl(url);
    setFields([]);
    setStep('edit');
  };

  const canSave =
    !!customerId &&
    !!typeId &&
    !!title &&
    !!file &&
    !!pdfUrl &&
    !!pdfHash &&
    fields.some((f) => f.type === 'customer_signature');

  const handleSave = async () => {
    if (!canSave || !file || !pdfHash) return;
    const customer = customers.find((x) => x.id === customerId);
    const type = types.find((x) => x.id === typeId);
    if (!customer || !type) return;

    setSaving(true);
    setError(null);
    try {
      const token = generateSigningToken();
      const path = `contracts/${token}/original.pdf`;
      const downloadUrl = await uploadFile(path, file);
      const expiresAt = Timestamp.fromMillis(
        Date.now() + expiryDays * 24 * 60 * 60 * 1000,
      );

      // Seitenzahl wird nicht extra getrackt — fields tragen schon page.
      const maxPage = fields.reduce((m, f) => Math.max(m, f.page), 1);

      const id = await createContract({
        customerId,
        customerSnapshot: {
          company: customer.company,
          firstName: customer.firstName,
          lastName: customer.lastName,
          email: customer.email,
          city: customer.city,
        },
        typeId,
        typeLabel: type.label,
        title,
        status: 'draft',
        originalPdfPath: path,
        originalPdfUrl: downloadUrl,
        originalSha256: pdfHash,
        pageCount: maxPage,
        fields,
        signingToken: token,
        signingExpiresAt: expiresAt,
        signedPdfPath: null,
        signedPdfUrl: null,
        reminderEnabled,
        reminderDays,
        lastReminderAt: null,
        sentAt: null,
        signedAt: null,
        signedByName: null,
        signedFromIp: null,
        signedFromUserAgent: null,
        audit: [
          {
            at: Timestamp.now(),
            event: 'created',
          },
        ],
      });
      router.push(`/dashboard/vertraege/${id}`);
    } catch (err) {
      console.error(err);
      setError(`Speichern fehlgeschlagen: ${(err as Error).message}`);
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="card text-sm text-gray-500">Lädt…</div>;
  }

  return (
    <div>
      <header className="mb-6">
        <Link
          href="/dashboard/vertraege"
          className="text-sm text-gray-500 hover:text-gray-900 mb-3 inline-block"
        >
          ← Zurück zu Verträgen
        </Link>
        <h1 className="text-3xl font-semibold text-gray-900">Neuer Vertrag</h1>
        <p className="mt-1 text-sm text-gray-500">
          Kunde wählen → PDF hochladen → Unterschriftenfelder platzieren →
          Signing-Link generieren.
        </p>
      </header>

      {error && (
        <div className="card mb-4 bg-red-50 border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      {step !== 'edit' && (
        <div className="card space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Kunde</label>
              <select
                className="input"
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
              >
                <option value="">– Kunde wählen –</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.company} ({c.firstName} {c.lastName})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Vertragstyp</label>
              <select
                className="input"
                value={typeId}
                onChange={(e) => setTypeId(e.target.value)}
              >
                <option value="">– Typ wählen –</option>
                {types.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Weitere Typen anlegen unter Einstellungen → Vertragstypen.
              </p>
            </div>
          </div>

          <div>
            <label className="label">Titel</label>
            <input
              className="input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="z.B. DSV CarHifi-Herford"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-end gap-2">
              <label className="inline-flex items-center gap-2 text-sm text-gray-800">
                <input
                  type="checkbox"
                  checked={reminderEnabled}
                  onChange={(e) => setReminderEnabled(e.target.checked)}
                  className="h-4 w-4 accent-blue-600"
                />
                Erinnerung per Mail an mich
              </label>
            </div>
            <div>
              <label className="label">Erinnerung nach (Tagen)</label>
              <input
                type="number"
                className="input"
                value={reminderDays}
                min={1}
                onChange={(e) =>
                  setReminderDays(parseInt(e.target.value, 10) || 7)
                }
                disabled={!reminderEnabled}
              />
            </div>
            <div>
              <label className="label">Link-Ablauf nach (Tagen)</label>
              <input
                type="number"
                className="input"
                value={expiryDays}
                min={1}
                onChange={(e) =>
                  setExpiryDays(parseInt(e.target.value, 10) || 14)
                }
              />
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <p className="text-sm font-medium text-gray-900 mb-2">
              Vertrag als PDF hochladen
            </p>
            <p className="text-sm text-gray-500 mb-3">
              Du füllst den Vertrag in Word/Pages wie gewohnt aus und
              exportierst ihn als PDF. Bitte ohne Verschlüsselung oder
              Passwortschutz.
            </p>
            <input
              type="file"
              accept="application/pdf"
              onChange={handleFileChange}
              disabled={!customerId || !typeId || !title}
              className="block w-full text-sm text-gray-700 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-brand-blue file:text-white file:font-medium file:cursor-pointer disabled:opacity-50"
            />
            {(!customerId || !typeId || !title) && (
              <p className="mt-2 text-xs text-amber-700">
                Bitte zuerst Kunde, Typ und Titel ausfüllen.
              </p>
            )}
          </div>
        </div>
      )}

      {step === 'edit' && pdfUrl && (
        <div className="space-y-4">
          <div className="card flex items-center justify-between flex-wrap gap-3">
            <div className="text-sm">
              <p className="font-medium text-gray-900">{title}</p>
              <p className="text-gray-500">
                {file?.name} · {fields.length} Feld
                {fields.length !== 1 ? 'er' : ''} platziert
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setStep('meta');
                  setFile(null);
                  setPdfUrl(null);
                  setFields([]);
                }}
                className="btn-secondary"
              >
                Anderes PDF
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={!canSave || saving}
                className="btn-primary disabled:opacity-50"
                title={
                  !fields.some((f) => f.type === 'customer_signature')
                    ? 'Mindestens 1 Feld "Kundenunterschrift" platzieren.'
                    : ''
                }
              >
                {saving ? 'Speichern…' : 'Speichern & Link generieren'}
              </button>
            </div>
          </div>

          <PdfFieldEditor
            pdfUrl={pdfUrl}
            fields={fields}
            onChange={setFields}
            showKolacPreview
          />
        </div>
      )}
    </div>
  );
}
