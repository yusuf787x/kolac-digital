'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Timestamp } from 'firebase/firestore';
import { createExpense, uploadFile } from '@/lib/firestore';
import { EXPENSE_CATEGORIES, type ExpenseCategory } from '@/lib/types';

const dateInputValue = (d: Date) => d.toISOString().slice(0, 10);

export default function NeueAusgabePage() {
  const router = useRouter();
  const [date, setDate] = useState(dateInputValue(new Date()));
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('Software/Tools');
  const [supplier, setSupplier] = useState('');
  const [receipt, setReceipt] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    try {
      let receiptUrl: string | null = null;
      if (receipt) {
        const safe = receipt.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
        const path = `expenses/${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)}-${safe}`;
        receiptUrl = await uploadFile(path, receipt);
      }

      await createExpense({
        date: Timestamp.fromDate(new Date(date)),
        description: description.trim(),
        amount: numericAmount,
        category,
        supplier: supplier.trim(),
        receiptUrl,
        driveUrl: null,
      });
      router.push('/dashboard/ausgaben');
    } catch (err) {
      console.error(err);
      setError('Speichern fehlgeschlagen.');
      setSubmitting(false);
    }
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
      </header>

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="card space-y-4">
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
              <label className="label">Betrag (EUR) *</label>
              <input
                type="number"
                step="0.01"
                className="input"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label className="label">Posten / Beschreibung *</label>
            <input
              className="input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              autoFocus
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

          <div>
            <label className="label">Beleg (Foto oder PDF)</label>
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => setReceipt(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-gray-700 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
            />
            {receipt && (
              <p className="mt-1 text-xs text-gray-500">{receipt.name}</p>
            )}
          </div>
        </section>

        {error && (
          <div className="px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex items-center gap-3">
          <button type="submit" disabled={submitting} className="btn-primary">
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
        </div>
      </form>
    </div>
  );
}
