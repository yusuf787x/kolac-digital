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
  createContractType,
  uploadFile,
  listQuotes,
  getQuote,
} from '@/lib/firestore';
import {
  generateSigningToken,
  sha256Hex,
} from '@/lib/contract-utils';
import type {
  ContractField,
  ContractType,
  Customer,
  Quote,
} from '@/lib/types';
import RichTextArea from '@/components/quote/RichTextArea';
import AttachmentsEditor from '@/components/contract/AttachmentsEditor';
import {
  SIG_FIELD_POSITIONS,
  type ContractAttachment,
} from '@/components/contract/TemplateContractPdf';
import { buildTemplateContractPdf } from '@/lib/template-contract';

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
type Mode = 'template' | 'upload';

const ANGEBOT_LABEL_HINTS = ['angebot', 'offerte'];
const isAngebotType = (label: string) =>
  ANGEBOT_LABEL_HINTS.some((h) => label.toLowerCase().includes(h));

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

  // Inline "Neuen Typ anlegen" — spart den Umweg ueber die Einstellungen,
  // wenn der Nutzer z.B. mal ein Angebot verschicken will und "Angebot"
  // noch nicht als Typ existiert. Neuer Typ wird direkt gespeichert und
  // im Dropdown vorausgewaehlt.
  const [showNewType, setShowNewType] = useState(false);
  const [newTypeLabel, setNewTypeLabel] = useState('');
  const [newTypeShort, setNewTypeShort] = useState('');
  const [creatingType, setCreatingType] = useState(false);

  // Template-Modus (neu) vs. klassischer PDF-Upload.
  const [mode, setMode] = useState<Mode>('template');
  const [bodyText, setBodyText] = useState('');
  const [attachments, setAttachments] = useState<ContractAttachment[]>([]);
  const [generating, setGenerating] = useState(false);

  // Wenn Vertragstyp „Angebot" ist: bestehende Angebote laden und
  // per Dropdown anbieten, um Inhalt in den Freitext zu uebernehmen.
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [quotesLoaded, setQuotesLoaded] = useState(false);
  const [selectedQuoteId, setSelectedQuoteId] = useState('');

  const selectedType = types.find((t) => t.id === typeId);
  const showQuotePicker =
    mode === 'template' && selectedType && isAngebotType(selectedType.label);

  // Angebote lazy laden — erst wenn der Nutzer "Angebot" waehlt.
  useEffect(() => {
    if (!showQuotePicker || quotesLoaded) return;
    (async () => {
      try {
        const list = await listQuotes();
        // Nur Angebote des ausgewaehlten Kunden anzeigen, wenn einer
        // gesetzt ist — sonst alle.
        setQuotes(list);
        setQuotesLoaded(true);
      } catch (err) {
        console.error(err);
      }
    })();
  }, [showQuotePicker, quotesLoaded]);

  const filteredQuotes = customerId
    ? quotes.filter((q) => q.customerId === customerId)
    : quotes;

  // Wenn ein Angebot ausgewaehlt wird: Titel-Default sinnvoll setzen.
  // Kein Import-Handler mehr — das Angebot wird beim Speichern direkt
  // 1:1 als PDF-Basis genutzt und die Signaturseite hintendran gemergt.
  useEffect(() => {
    if (!selectedQuoteId) return;
    const q = quotes.find((x) => x.id === selectedQuoteId);
    if (q && !title) setTitle(`Angebot ${q.quoteNumber}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedQuoteId, quotes]);

  const handleCreateType = async () => {
    const label = newTypeLabel.trim();
    const short = newTypeShort.trim() || label.slice(0, 4).toUpperCase();
    if (!label) return;
    setCreatingType(true);
    setError(null);
    try {
      const id = await createContractType({
        label,
        shortLabel: short,
        description: '',
        active: true,
      });
      const fresh = await listContractTypes();
      setTypes(fresh.filter((x) => x.active));
      setTypeId(id);
      setNewTypeLabel('');
      setNewTypeShort('');
      setShowNewType(false);
    } catch (err) {
      console.error(err);
      setError(`Typ anlegen fehlgeschlagen: ${(err as Error).message}`);
    } finally {
      setCreatingType(false);
    }
  };

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

  /**
   * Angebot-Modus: Ausgewaehltes Angebot wird 1:1 als PDF-Basis genutzt
   * (Original-Layout, Positionen, Preise unveraendert). Signaturseite
   * mit Kolac-Signatur + "Bielefeld, den [heute]" wird automatisch
   * hintendran gemergt. Signatur-Felder liegen an den bekannten
   * SIG_FIELD_POSITIONS auf der letzten Seite.
   */
  const handleSaveFromQuote = async () => {
    if (!customerId || !typeId || !title || !selectedQuoteId) return;
    const customer = customers.find((x) => x.id === customerId);
    const type = types.find((x) => x.id === typeId);
    if (!customer || !type) return;

    setSaving(true);
    setError(null);
    try {
      const q = await getQuote(selectedQuoteId);
      if (!q) {
        setError('Angebot konnte nicht geladen werden.');
        setSaving(false);
        return;
      }

      const generatedAt = new Date().toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
      const { generateQuoteWithSignatureBlob } = await import(
        '@/lib/pdf-generator'
      );
      const blob = await generateQuoteWithSignatureBlob({
        quote: q,
        customer,
        generatedAt,
      });
      const buf = await blob.arrayBuffer();
      const hash = await sha256Hex(buf);
      const token = generateSigningToken();
      const path = `contracts/${token}/original.pdf`;
      const pdfFile = new File([blob], 'contract.pdf', {
        type: 'application/pdf',
      });
      const downloadUrl = await uploadFile(path, pdfFile);

      // Signaturseite ist die letzte Seite des gemergten Dokuments.
      let pageCount = 1;
      try {
        const { PDFDocument } = await import('pdf-lib');
        pageCount = (await PDFDocument.load(buf)).getPageCount();
      } catch (e) {
        console.warn('Seitenzahl konnte nicht bestimmt werden:', e);
      }

      const { SIG_FIELD_POSITIONS } = await import(
        '@/components/contract/TemplateContractPdf'
      );
      const fields: ContractField[] = [
        { type: 'date', page: pageCount, ...SIG_FIELD_POSITIONS.date },
        {
          type: 'customer_signature',
          page: pageCount,
          ...SIG_FIELD_POSITIONS.customerSignature,
        },
      ];

      const expiresAt = Timestamp.fromMillis(
        Date.now() + expiryDays * 24 * 60 * 60 * 1000,
      );

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
        // KEIN templateData — Bearbeiten faellt weg, weil die Basis das
        // eigentliche Angebot ist. Wenn du was aendern willst, mach's
        // im Angebot selbst und leg einen neuen Vertrag an.
        status: 'draft',
        originalPdfPath: path,
        originalPdfUrl: downloadUrl,
        originalSha256: hash,
        pageCount,
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
        audit: [{ at: Timestamp.now(), event: 'created' }],
      });
      router.push(`/dashboard/vertraege/${id}`);
    } catch (err) {
      console.error(err);
      setError(`Speichern fehlgeschlagen: ${(err as Error).message}`);
      setSaving(false);
    }
  };

  /**
   * Template-Modus: PDF wird live aus dem Freitext generiert, hochgeladen,
   * Signatur-Felder werden programmatisch platziert (Positionen sind im
   * Template festgelegt — Auftraggeber unten rechts). Der restliche Save-
   * Flow ist identisch zum Upload-Weg.
   */
  const handleSaveFromTemplate = async () => {
    if (!customerId || !typeId || !title || !bodyText.trim()) return;
    const customer = customers.find((x) => x.id === customerId);
    const type = types.find((x) => x.id === typeId);
    if (!customer || !type) return;

    setSaving(true);
    setError(null);
    try {
      const subtitle = `${type.label} · ${customer.company || `${customer.firstName} ${customer.lastName}`}`;
      const generatedAt = new Date().toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
      const {
        blob,
        pageCount,
        signaturePage,
      } = await buildTemplateContractPdf({
        title,
        subtitle,
        customer,
        bodyText,
        attachments,
        generatedAt,
      });

      const buf = await blob.arrayBuffer();
      const hash = await sha256Hex(buf);
      const token = generateSigningToken();
      const path = `contracts/${token}/original.pdf`;
      const pdfFile = new File([blob], 'contract.pdf', {
        type: 'application/pdf',
      });
      const downloadUrl = await uploadFile(path, pdfFile);

      // Signatur-Felder exakt an den Positionen des Templates —
      // Konstanten aus TemplateContractPdf.tsx (SIG_FIELD_POSITIONS)
      // halten PDF-Layout und Signing-Overlay in Sync.
      const fields: ContractField[] = [
        { type: 'date', page: signaturePage, ...SIG_FIELD_POSITIONS.date },
        {
          type: 'customer_signature',
          page: signaturePage,
          ...SIG_FIELD_POSITIONS.customerSignature,
        },
      ];

      const expiresAt = Timestamp.fromMillis(
        Date.now() + expiryDays * 24 * 60 * 60 * 1000,
      );

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
        // Editor-Zustand fuer spaeteres Bearbeiten mitspeichern.
        templateData: {
          bodyText,
          subtitle,
          attachments: attachments.map((a) => ({
            title: a.title,
            body: a.body,
          })),
          generatedAt,
        },
        status: 'draft',
        originalPdfPath: path,
        originalPdfUrl: downloadUrl,
        originalSha256: hash,
        pageCount,
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
        audit: [{ at: Timestamp.now(), event: 'created' }],
      });
      router.push(`/dashboard/vertraege/${id}`);
    } catch (err) {
      console.error(err);
      setError(`Speichern fehlgeschlagen: ${(err as Error).message}`);
      setSaving(false);
    }
  };

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
          Aus Vorlage erzeugen oder fertiges PDF hochladen — danach
          Signing-Link an den Kunden.
        </p>
      </header>

      {step !== 'edit' && (
        <div className="mb-4 inline-flex rounded-lg border border-gray-200 bg-white p-1 text-sm">
          <button
            type="button"
            onClick={() => setMode('template')}
            className={`px-3 py-1.5 rounded-md ${
              mode === 'template'
                ? 'bg-brand-blue text-white'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            Aus Vorlage erstellen
          </button>
          <button
            type="button"
            onClick={() => setMode('upload')}
            className={`px-3 py-1.5 rounded-md ${
              mode === 'upload'
                ? 'bg-brand-blue text-white'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            Fertiges PDF hochladen
          </button>
        </div>
      )}

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
              <div className="flex items-baseline justify-between gap-2 mb-1.5">
                <label className="label !mb-0">Vertragstyp</label>
                <button
                  type="button"
                  onClick={() => setShowNewType((s) => !s)}
                  className="text-xs text-brand-blue hover:underline"
                >
                  {showNewType ? '× abbrechen' : '+ Neuer Typ'}
                </button>
              </div>
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

              {showNewType && (
                <div className="mt-2 p-3 rounded-lg border border-gray-200 bg-gray-50 space-y-2">
                  <p className="text-xs text-gray-600">
                    Neuer Typ (z.B. „Angebot", „NDA", „Auftragsbestätigung")
                    — wird gespeichert und steht ab sofort im Dropdown.
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      className="input col-span-2"
                      value={newTypeLabel}
                      onChange={(e) => setNewTypeLabel(e.target.value)}
                      placeholder="Bezeichnung, z.B. Angebot"
                    />
                    <input
                      className="input"
                      value={newTypeShort}
                      onChange={(e) => setNewTypeShort(e.target.value)}
                      placeholder="Kürzel"
                    />
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleCreateType}
                      disabled={creatingType || !newTypeLabel.trim()}
                      className="btn-secondary text-xs py-1.5 px-3"
                    >
                      {creatingType ? 'Speichere…' : 'Typ speichern'}
                    </button>
                  </div>
                </div>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Weitere Typen findest du unter Einstellungen → Vertragstypen.
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

          {mode === 'upload' && (
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
          )}

          {mode === 'template' && (
            <div className="border-t border-gray-100 pt-4 space-y-4">
              {showQuotePicker && (
                <div className="p-3 rounded-lg border border-blue-200 bg-blue-50/60 space-y-2">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-sm font-medium text-blue-900">
                      Bestehendes Angebot zur Unterschrift
                    </p>
                    <span className="text-xs text-blue-700">
                      {customerId
                        ? `${filteredQuotes.length} Angebote für diesen Kunden`
                        : `${quotes.length} Angebote insgesamt`}
                    </span>
                  </div>
                  <select
                    className="input"
                    value={selectedQuoteId}
                    onChange={(e) => setSelectedQuoteId(e.target.value)}
                  >
                    <option value="">– Angebot wählen –</option>
                    {filteredQuotes.map((q) => (
                      <option key={q.id} value={q.id}>
                        {q.quoteNumber} · {q.totalAmount.toFixed(2)} € netto
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-blue-800">
                    Das ausgewählte Angebot wird 1:1 als Basis genutzt. Eine
                    Signaturseite mit Ihrer Unterschrift + „Bielefeld, den
                    heute" wird automatisch hintendran gehängt. Der Kunde
                    unterschreibt rechts daneben.
                  </p>
                </div>
              )}

              {/* Freitext + Anlagen NUR wenn KEIN Angebot ausgewaehlt ist.
                  Bei Angebot-Modus wird das Angebot direkt als PDF-Basis
                  genutzt, kein Freitext-Editor noetig. */}
              {!selectedQuoteId && (
                <>
                  <div>
                    <label className="label">Freitext (Vertragsinhalt)</label>
                    <RichTextArea
                      value={bodyText}
                      onChange={setBodyText}
                      placeholder="Hier den Inhalt des Vertrags eintragen…"
                      minHeight={280}
                    />
                    <p className="mt-1.5 text-xs text-gray-500">
                      Header (Kolac + Kunde), Signaturbereich und Footer werden
                      automatisch ergänzt. Signaturfeld sitzt unten rechts
                      direkt unter Ihrem Freitext.
                    </p>
                  </div>

                  <div className="border-t border-gray-100 pt-4">
                    <AttachmentsEditor
                      attachments={attachments}
                      onChange={setAttachments}
                    />
                  </div>
                </>
              )}

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={
                    selectedQuoteId
                      ? handleSaveFromQuote
                      : handleSaveFromTemplate
                  }
                  disabled={
                    saving ||
                    generating ||
                    !customerId ||
                    !typeId ||
                    !title ||
                    (!selectedQuoteId && !bodyText.trim())
                  }
                  className="btn-primary disabled:opacity-50"
                >
                  {saving
                    ? 'Erzeuge PDF & speichere…'
                    : selectedQuoteId
                      ? 'Angebot mit Signaturseite versenden'
                      : 'PDF erzeugen & Signing-Link generieren'}
                </button>
              </div>
              {(!customerId || !typeId || !title) && (
                <p className="text-xs text-amber-700">
                  Bitte zuerst Kunde, Typ und Titel ausfüllen.
                </p>
              )}
            </div>
          )}
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
