'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  listBusinessTrips,
  createBusinessTrip,
  updateBusinessTrip,
  deleteBusinessTrip,
} from '@/lib/firestore';
import type { BusinessTrip } from '@/lib/types';
import {
  computeTripAmount,
  KM_PAUSCHALE_EUR,
  TRAVEL_EXPENSE_META,
} from '@/lib/types';
import { formatEUR, formatDateDE } from '@/lib/utils';
import { site } from '@/lib/site-config';
import { Timestamp } from 'firebase/firestore';

/** Betriebssitz als Standard-Startadresse. */
const HOME = `${site.street}, ${site.zip} ${site.city}`;

/**
 * Fahrtenbuch fuer betriebliche Fahrten mit dem privaten Fahrzeug.
 *
 * Abgerechnet wird mit der Kilometerpauschale auf die tatsaechlich
 * gefahrenen Kilometer. Aus der Pauschale ist kein Vorsteuerabzug
 * moeglich, deshalb taucht hier nirgends Umsatzsteuer auf.
 */
export default function FahrtenPage() {
  const [trips, setTrips] = useState<BusinessTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [year, setYear] = useState(new Date().getFullYear());

  // Formular
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [startAddress, setStartAddress] = useState(HOME);
  const [destinationName, setDestinationName] = useState('');
  const [destinationAddress, setDestinationAddress] = useState('');
  const [purpose, setPurpose] = useState('');
  const [distanceKm, setDistanceKm] = useState('');
  const [roundTrip, setRoundTrip] = useState(true);
  const [note, setNote] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    listBusinessTrips()
      .then(setTrips)
      .catch((err) => setError((err as Error).message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  const preview = useMemo(() => {
    const d = parseFloat(distanceKm.replace(',', '.'));
    if (!Number.isFinite(d) || d <= 0) return null;
    return computeTripAmount(d, roundTrip, KM_PAUSCHALE_EUR);
  }, [distanceKm, roundTrip]);

  const yearTrips = useMemo(
    () => trips.filter((t) => t.date.toDate().getFullYear() === year),
    [trips, year],
  );

  const summe = useMemo(
    () => ({
      km: Math.round(yearTrips.reduce((a, t) => a + t.totalKm, 0) * 10) / 10,
      betrag:
        Math.round(yearTrips.reduce((a, t) => a + t.amount, 0) * 100) / 100,
    }),
    [yearTrips],
  );

  const jahre = useMemo(() => {
    const set = new Set(trips.map((t) => t.date.toDate().getFullYear()));
    set.add(new Date().getFullYear());
    return Array.from(set).sort((a, b) => b - a);
  }, [trips]);

  const reset = () => {
    setEditId(null);
    setDate(new Date().toISOString().slice(0, 10));
    setStartAddress(HOME);
    setDestinationName('');
    setDestinationAddress('');
    setPurpose('');
    setDistanceKm('');
    setRoundTrip(true);
    setNote('');
  };

  const speichern = async () => {
    if (!preview) {
      setError('Bitte eine gültige Kilometerzahl eintragen.');
      return;
    }
    if (!destinationName.trim() || !purpose.trim()) {
      setError('Ziel und Anlass sind Pflichtangaben für den Nachweis.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const daten = {
        date: Timestamp.fromDate(new Date(`${date}T12:00:00`)),
        startAddress: startAddress.trim(),
        destinationName: destinationName.trim(),
        destinationAddress: destinationAddress.trim(),
        purpose: purpose.trim(),
        distanceKm: parseFloat(distanceKm.replace(',', '.')),
        roundTrip,
        totalKm: preview.totalKm,
        ratePerKm: KM_PAUSCHALE_EUR,
        amount: preview.amount,
        receiptExpenseIds: [] as string[],
        note: note.trim() || undefined,
      };
      if (editId) await updateBusinessTrip(editId, daten);
      else await createBusinessTrip(daten);
      reset();
      load();
    } catch (err) {
      setError(`Speichern fehlgeschlagen: ${(err as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

  const bearbeiten = (t: BusinessTrip) => {
    setEditId(t.id);
    setDate(t.date.toDate().toISOString().slice(0, 10));
    setStartAddress(t.startAddress);
    setDestinationName(t.destinationName);
    setDestinationAddress(t.destinationAddress);
    setPurpose(t.purpose);
    setDistanceKm(String(t.distanceKm).replace('.', ','));
    setRoundTrip(t.roundTrip);
    setNote(t.note ?? '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const loeschen = async (t: BusinessTrip) => {
    if (
      !confirm(
        `Fahrt vom ${formatDateDE(t.date.toDate())} nach ${t.destinationName} löschen?`,
      )
    ) {
      return;
    }
    await deleteBusinessTrip(t.id);
    load();
  };

  const exportCSV = () => {
    const fmt = (n: number) => n.toFixed(2).replace('.', ',');
    const rows: string[][] = [
      [
        'Datum',
        'Start',
        'Ziel',
        'Zieladresse',
        'Anlass',
        'Einfache Entfernung (km)',
        'Hin und zurück',
        'Gefahrene km',
        'Satz je km',
        'Betrag',
      ],
      ...yearTrips
        .slice()
        .sort((a, b) => a.date.toMillis() - b.date.toMillis())
        .map((t) => [
          formatDateDE(t.date.toDate()),
          t.startAddress,
          t.destinationName,
          t.destinationAddress,
          t.purpose,
          String(t.distanceKm).replace('.', ','),
          t.roundTrip ? 'ja' : 'nein',
          String(t.totalKm).replace('.', ','),
          fmt(t.ratePerKm),
          fmt(t.amount),
        ]),
      [],
      ['GESAMT', '', '', '', '', '', '', String(summe.km).replace('.', ','), '', fmt(summe.betrag)],
    ];
    const csv = rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';'))
      .join('\r\n');
    const blob = new Blob(['﻿' + csv], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fahrtenbuch-${year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Fahrten</h1>
        <p className="mt-1 text-sm text-gray-500">
          Betriebliche Fahrten mit dem privaten Auto, abgerechnet mit{' '}
          {formatEUR(KM_PAUSCHALE_EUR)} je gefahrenem Kilometer. Geht als
          Nutzungseinlage in die EÜR, Zeile {TRAVEL_EXPENSE_META.elsterLine}{' '}
          (Kennzahl {TRAVEL_EXPENSE_META.kennzahl}).
        </p>
      </header>

      {error && (
        <div className="card mb-4 bg-red-50 border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Erfassung */}
      <section className="card mb-5">
        <h2 className="text-base font-semibold text-gray-900 mb-3">
          {editId ? 'Fahrt bearbeiten' : 'Fahrt erfassen'}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label">Datum</label>
            <input
              type="date"
              className="input"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Anlass der Fahrt</label>
            <input
              className="input"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="Kundenmeeting, Video-Dreh, Projektabsprache"
            />
          </div>
          <div>
            <label className="label">Start</label>
            <input
              className="input"
              value={startAddress}
              onChange={(e) => setStartAddress(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Ziel</label>
            <input
              className="input"
              value={destinationName}
              onChange={(e) => setDestinationName(e.target.value)}
              placeholder="Firmenname"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Zieladresse</label>
            <input
              className="input"
              value={destinationAddress}
              onChange={(e) => setDestinationAddress(e.target.value)}
              placeholder="Straße, PLZ Ort"
            />
          </div>
          <div>
            <label className="label">Einfache Entfernung in km</label>
            <input
              className="input"
              inputMode="decimal"
              value={distanceKm}
              onChange={(e) => setDistanceKm(e.target.value)}
              placeholder="z. B. 22,5"
            />
          </div>
          <div>
            <label className="label">Rückfahrt</label>
            <label className="flex items-center gap-2 h-[38px] text-sm text-gray-700">
              <input
                type="checkbox"
                checked={roundTrip}
                onChange={(e) => setRoundTrip(e.target.checked)}
                className="rounded border-gray-300"
              />
              Hin und zurück gefahren
            </label>
          </div>
          <div className="sm:col-span-2">
            <label className="label">Notiz (optional)</label>
            <input
              className="input"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>

        {preview && (
          <div className="mt-3 p-3 rounded-lg bg-blue-50 border border-blue-200 text-sm">
            <span className="text-gray-700">
              {preview.totalKm} gefahrene km ×{' '}
              {formatEUR(KM_PAUSCHALE_EUR)}
            </span>
            <span className="font-semibold text-gray-900 ml-2">
              = {formatEUR(preview.amount)}
            </span>
            <span className="text-xs text-gray-600 block mt-1">
              Ohne Vorsteuer. Aus einer Pauschale ist kein Vorsteuerabzug
              möglich.
            </span>
          </div>
        )}

        <div className="flex items-center gap-2 mt-4">
          <button
            onClick={speichern}
            disabled={saving}
            className="btn-primary text-sm disabled:opacity-50"
          >
            {saving ? 'Speichert…' : editId ? 'Änderung speichern' : 'Fahrt anlegen'}
          </button>
          {editId && (
            <button onClick={reset} className="btn-secondary text-sm">
              Abbrechen
            </button>
          )}
        </div>
      </section>

      {/* Liste */}
      <section className="card">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              Fahrtenbuch {year}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {yearTrips.length} Fahrten, {summe.km} km,{' '}
              <strong>{formatEUR(summe.betrag)}</strong> als Betriebsausgabe
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              className="input w-auto text-sm"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
            >
              {jahre.map((j) => (
                <option key={j} value={j}>
                  {j}
                </option>
              ))}
            </select>
            <button onClick={exportCSV} className="btn-secondary text-xs">
              CSV
            </button>
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-gray-500">Lädt…</p>
        ) : yearTrips.length === 0 ? (
          <p className="text-sm text-gray-500">
            Noch keine Fahrten für {year} erfasst.
          </p>
        ) : (
          <div className="table-wrap">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-gray-500 tracking-wider border-b border-gray-100">
                <tr>
                  <th className="text-left py-2 w-24">Datum</th>
                  <th className="text-left py-2">Ziel und Anlass</th>
                  <th className="text-right py-2 w-20">km</th>
                  <th className="text-right py-2 w-24">Betrag</th>
                  <th className="py-2 w-24" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {yearTrips.map((t) => (
                  <tr key={t.id}>
                    <td className="py-2 text-gray-600 whitespace-nowrap">
                      {formatDateDE(t.date.toDate())}
                    </td>
                    <td className="py-2">
                      <div className="text-gray-900">{t.destinationName}</div>
                      <div className="text-xs text-gray-500">
                        {t.purpose}
                        {t.roundTrip && ' · hin und zurück'}
                      </div>
                    </td>
                    <td className="py-2 text-right tabular-nums text-gray-700">
                      {t.totalKm}
                    </td>
                    <td className="py-2 text-right tabular-nums font-medium text-gray-900">
                      {formatEUR(t.amount)}
                    </td>
                    <td className="py-2 text-right whitespace-nowrap">
                      <button
                        onClick={() => bearbeiten(t)}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        bearbeiten
                      </button>
                      <button
                        onClick={() => loeschen(t)}
                        className="text-xs text-red-600 hover:underline ml-2"
                      >
                        löschen
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
