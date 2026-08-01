'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Timestamp } from 'firebase/firestore';
import {
  createExpense,
  getExpense,
  getGoogleAuth,
  uploadFile,
} from '@/lib/firestore';
import { EXPENSE_CATEGORIES, type ExpenseCategory } from '@/lib/types';
import {
  formatEUR,
  defaultVatRateForDate,
  grossToNet,
} from '@/lib/utils';
import { fileToBase64 } from '@/lib/file-utils';
import { authedFetch } from '@/lib/api-client';

const dateInputValue = (d: Date) => d.toISOString().slice(0, 10);

interface ExtractedReceipt {
  date: string;
  amount: number;
  supplier: string;
  description: string;
  category: ExpenseCategory;
  confidence: 'high' | 'medium' | 'low';
}

export default function NeueAusgabePage() {
  const router = useRouter();
  const [date, setDate] = useState(dateInputValue(new Date()));
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('Software/Tools');
  const [supplier, setSupplier] = useState('');
  const [vatRate, setVatRate] = useState<number>(
    defaultVatRateForDate(new Date()),
  );
  const [vatRateUserSet, setVatRateUserSet] = useState(false);
  const [reverseCharge, setReverseCharge] = useState(false);
  const [receipt, setReceipt] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // VAT-Default auch beim Datum-Wechsel nachziehen, solange Nutzer
  // den Satz nicht manuell gesetzt hat.
  useEffect(() => {
    if (!vatRateUserSet && date) {
      setVatRate(defaultVatRateForDate(date));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [extracted, setExtracted] = useState<ExtractedReceipt | null>(null);

  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Build/revoke an Object URL whenever the receipt file changes — avoids
  // memory leaks when the user picks several files in a row.
  useEffect(() => {
    if (!receipt) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(receipt);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [receipt]);

  const handleFileSelect = async (file: File | null) => {
    setReceipt(file);
    setExtracted(null);
    setExtractError(null);
    if (!file) return;

    setExtracting(true);
    try {
      const base64 = await fileToBase64(file);
      const res = await authedFetch('/api/expense/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileBase64: base64,
          mimeType: file.type || 'application/octet-stream',
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const json = (await res.json()) as { data: ExtractedReceipt };
      const data = json.data;

      // Pre-fill form fields with extracted data
      if (data.date) setDate(data.date);
      if (typeof data.amount === 'number')
        setAmount(data.amount.toFixed(2).replace('.', ','));
      if (data.description) setDescription(data.description);
      if (data.supplier) setSupplier(data.supplier);
      if (data.category && EXPENSE_CATEGORIES.includes(data.category))
        setCategory(data.category);

      setExtracted(data);
    } catch (err) {
      console.error(err);
      setExtractError(
        `Auto-Erkennung fehlgeschlagen: ${(err as Error).message}. Du kannst die Felder manuell ausfüllen.`,
      );
    } finally {
      setExtracting(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const numericAmount = parseFloat(amount.replace(',', '.'));
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setError('Bitte gültigen Betrag angeben.');
      return;
    }
    if (!description.trim()) {
      setError('Bitte Beschreibung angeben.');
      return;
    }

    setSubmitting(true);
    setSyncStatus(null);
    let uploadWarning: string | null = null;
    try {
      let receiptUrl: string | null = null;
      if (receipt) {
        try {
          const safe = receipt.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
          const path = `expenses/${Date.now()}-${Math.random()
            .toString(36)
            .slice(2, 8)}-${safe}`;
          receiptUrl = await uploadFile(path, receipt);
        } catch (uploadErr) {
          // Storage-Fehler (z.B. Quota exceeded auf Spark-Tarif):
          // Ausgabe trotzdem speichern, User klar warnen.
          console.warn('Beleg-Upload fehlgeschlagen:', uploadErr);
          const msg = (uploadErr as Error).message;
          if (msg.includes('quota-exceeded')) {
            uploadWarning =
              'Beleg konnte NICHT hochgeladen werden: Firebase Storage-Quota erreicht. Die Ausgabe wurde ohne Beleg-URL gespeichert. Beleg lokal aufheben und Firebase auf Blaze-Tarif upgraden — dann kannst du den Beleg spaeter nachtragen.';
          } else {
            uploadWarning = `Beleg-Upload fehlgeschlagen (${msg}). Ausgabe wurde ohne Beleg gespeichert.`;
          }
        }
      }

      const expenseId = await createExpense({
        date: Timestamp.fromDate(new Date(date)),
        description: description.trim(),
        amount: numericAmount,
        vatRate,
        reverseCharge,
        category,
        supplier: supplier.trim(),
        receiptUrl,
        driveUrl: null,
      });

      // Drive-Sync if Google Drive is connected — non-blocking, logs failures
      let syncMessage: string | null = null;
      try {
        const auth = await getGoogleAuth();
        if (auth?.refreshToken && receipt) {
          setSyncStatus('Synchronisiere mit Google Drive…');
          const expense = await getExpense(expenseId);
          if (expense) {
            const { syncExpenseToDrive } = await import('@/lib/drive-sync');
            const { sheetSyncError } = await syncExpenseToDrive(expense, {
              file: receipt,
            });
            if (sheetSyncError) {
              syncMessage = `Beleg ist auf Google Drive ✓ — ABER Sheet-Eintrag fehlgeschlagen: ${sheetSyncError}`;
            } else {
              syncMessage = 'Auf Google Drive gesichert ✓ (Beleg + Sheet-Zeile)';
            }
          }
        }
      } catch (syncErr) {
        console.warn('Drive-Sync fehlgeschlagen:', syncErr);
        syncMessage = `Drive-Sync fehlgeschlagen (${(syncErr as Error).message}). Ausgabe wurde lokal gespeichert.`;
      }

      // Upload-Warnung hat Vorrang — die ist wichtiger als der Drive-Sync-Status.
      const finalMessage = uploadWarning ?? syncMessage;
      if (finalMessage) {
        setSyncStatus(finalMessage);
        // Bei Upload-Fehler laenger stehen lassen — der User muss das lesen.
        await new Promise((r) => setTimeout(r, uploadWarning ? 5000 : 2500));
      }

      router.push('/dashboard/ausgaben');
    } catch (err) {
      console.error(err);
      setError(`Speichern fehlgeschlagen: ${(err as Error).message}`);
      setSubmitting(false);
    }
  };

  const confidenceLabel: Record<ExtractedReceipt['confidence'], string> = {
    high: 'hoch',
    medium: 'mittel',
    low: 'niedrig',
  };

  return (
    <div>
      <header className="mb-8">
        <Link
          href="/dashboard/ausgaben"
          className="text-sm text-gray-500 hover:text-gray-900 mb-3 inline-block"
        >
          ← Zurück zu Ausgaben
        </Link>
        <h1 className="text-3xl font-semibold text-gray-900">Neue Ausgabe</h1>
        <p className="mt-1 text-sm text-gray-500">
          Beleg hochladen — Datum, Betrag und Lieferant werden automatisch
          erkannt.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_minmax(320px,40%)] gap-6">

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="card space-y-4">
          <div>
            <label className="label">
              Beleg (Foto oder PDF) — empfohlen für Auto-Erkennung
            </label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
              onChange={(e) => handleFileSelect(e.target.files?.[0] ?? null)}
              disabled={extracting || submitting}
              className="block w-full text-sm text-gray-700 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 disabled:opacity-50"
            />
            {receipt && (
              <p className="mt-1 text-xs text-gray-500">{receipt.name}</p>
            )}

            {extracting && (
              <div className="mt-3 px-3 py-2 rounded-lg bg-blue-50 border border-blue-200 text-sm text-blue-800">
                Belegdaten werden erkannt…
              </div>
            )}

            {extractError && (
              <div className="mt-3 px-3 py-2 rounded-lg bg-yellow-50 border border-yellow-200 text-sm text-yellow-900">
                {extractError}
              </div>
            )}

            {extracted && !extracting && (
              <div className="mt-3 px-3 py-2 rounded-lg bg-green-50 border border-green-200 text-sm text-green-900">
                ✓ Daten erkannt (Konfidenz:{' '}
                <strong>{confidenceLabel[extracted.confidence]}</strong>) —
                bitte prüfen und ggf. korrigieren.
              </div>
            )}
          </div>
        </section>

        <section className="card space-y-4">
          <h2 className="text-base font-semibold text-gray-900">Felder</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Datum *</label>
              <input
                type="date"
                className="input"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label">
                {reverseCharge
                  ? 'Rechnungsbetrag netto (EUR) *'
                  : 'Brutto-Betrag (EUR) *'}
              </label>
              <input
                type="text"
                inputMode="decimal"
                className="input"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="z.B. 12,34"
                required
              />
            </div>
          </div>

          <label className="flex items-start gap-3 p-3 rounded-lg border border-amber-200 bg-amber-50/60 cursor-pointer">
            <input
              type="checkbox"
              checked={reverseCharge}
              onChange={(e) => setReverseCharge(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-amber-600"
            />
            <span className="text-sm text-gray-800">
              <strong>Reverse Charge (§ 13b UStG)</strong> — Rechnung aus dem
              EU-Ausland ohne ausgewiesene MwSt. (z.B. Meta Ireland, Google
              Ireland, Canva, Anthropic).
              <span className="block text-xs text-gray-600 mt-1">
                Ich deklariere die fiktive USt als geschuldete Steuer UND
                ziehe sie sofort als Vorsteuer ab. Netto-Effekt für dich:
                null.
              </span>
            </span>
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">
                {reverseCharge
                  ? 'Fiktiver MwSt-Satz (für Reverse Charge)'
                  : 'MwSt-Satz auf dem Beleg'}
              </label>
              <select
                className="input"
                value={String(vatRate)}
                onChange={(e) => {
                  setVatRate(parseFloat(e.target.value));
                  setVatRateUserSet(true);
                }}
              >
                <option value="0.19">19 % (Regelsatz)</option>
                <option value="0.07">7 % (ermäßigt)</option>
                <option value="0">0 % (keine MwSt)</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">
                {reverseCharge
                  ? 'In Deutschland üblich: 19 %. Wird beidseitig in der UStVA deklariert.'
                  : 'Default kommt aus dem Datum: vor 01.07.2026 = 0 % (Kleinunternehmer), danach 19 %.'}
              </p>
            </div>
            <div className="flex items-end">
              {(() => {
                const n = parseFloat(amount.replace(',', '.'));
                if (!amount || isNaN(n)) return null;
                if (reverseCharge) {
                  const net = Math.round(n * 100) / 100;
                  const fictiveVat = Math.round(net * vatRate * 100) / 100;
                  return (
                    <div className="w-full px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-sm space-y-0.5">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Netto (Rechnungsbetrag)</span>
                        <span className="text-gray-900 font-medium">
                          {formatEUR(net)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">
                          Fiktive USt ({Math.round(vatRate * 100)} %)
                        </span>
                        <span className="text-gray-900 font-medium">
                          {formatEUR(fictiveVat)}
                        </span>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-gray-200 text-xs">
                        <span className="text-gray-500">Netto-Effekt UStVA</span>
                        <span className="text-green-700 font-semibold">
                          {formatEUR(0)}
                        </span>
                      </div>
                    </div>
                  );
                }
                const split = grossToNet(n, vatRate);
                return (
                  <div className="w-full px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-sm space-y-0.5">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Netto</span>
                      <span className="text-gray-900 font-medium">
                        {formatEUR(split.net)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">
                        Vorsteuer ({Math.round(vatRate * 100)} %)
                      </span>
                      <span className="text-gray-900 font-medium">
                        {formatEUR(split.vat)}
                      </span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-gray-200">
                      <span className="text-gray-500">Brutto</span>
                      <span className="text-gray-900 font-semibold">
                        {formatEUR(split.gross)}
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          <div>
            <label className="label">Posten / Beschreibung *</label>
            <input
              className="input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Kategorie *</label>
              <select
                className="input"
                value={category}
                onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
              >
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Lieferant / Anbieter</label>
              <input
                className="input"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
              />
            </div>
          </div>
        </section>

        {error && (
          <div className="px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
            {error}
          </div>
        )}

        {syncStatus && (
          <div className="px-3 py-2 rounded-lg bg-blue-50 border border-blue-200 text-sm text-blue-800">
            {syncStatus}
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={submitting || extracting}
            className="btn-primary"
          >
            {submitting ? 'Speichern…' : 'Ausgabe anlegen'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="btn-secondary"
            disabled={submitting}
          >
            Abbrechen
          </button>
          {amount && (
            <span className="ml-auto text-sm text-gray-500">
              {(() => {
                const n = parseFloat(amount.replace(',', '.'));
                return isNaN(n) ? '' : `→ ${formatEUR(n)}`;
              })()}
            </span>
          )}
        </div>
      </form>

      <aside className="lg:sticky lg:top-6 lg:self-start lg:max-h-[calc(100vh-4rem)]">
        <div className="card p-3 h-full flex flex-col">
          <h2 className="text-base font-semibold text-gray-900 mb-3 px-2">
            Beleg-Vorschau
          </h2>
          {!receipt || !previewUrl ? (
            <div className="flex-1 min-h-[400px] flex items-center justify-center text-sm text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
              Noch kein Beleg hochgeladen
            </div>
          ) : receipt.type === 'application/pdf' ? (
            <iframe
              src={previewUrl}
              title={receipt.name}
              className="w-full flex-1 min-h-[500px] rounded-lg border border-gray-200 bg-white"
            />
          ) : receipt.type.startsWith('image/') ? (
            <div className="flex-1 min-h-[400px] flex items-center justify-center bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt={receipt.name}
                className="max-w-full max-h-[600px] object-contain"
              />
            </div>
          ) : (
            <div className="flex-1 min-h-[400px] flex items-center justify-center text-sm text-gray-500 border border-gray-200 rounded-lg">
              {receipt.name} · Vorschau für diesen Dateityp nicht verfügbar
            </div>
          )}
          {receipt && (
            <div className="mt-2 px-2 text-xs text-gray-500 flex items-center justify-between">
              <span className="truncate">{receipt.name}</span>
              <a
                href={previewUrl ?? '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-blue hover:underline ml-2 shrink-0"
              >
                In neuem Tab öffnen
              </a>
            </div>
          )}
        </div>
      </aside>

      </div>
    </div>
  );
}
