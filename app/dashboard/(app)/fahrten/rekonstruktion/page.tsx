'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Timestamp } from 'firebase/firestore';
import {
  listExpenses,
  listBusinessTrips,
  createBusinessTrip,
  listCustomers,
  listInvoices,
  listQuotes,
  listDeals,
  listActivities,
} from '@/lib/firestore';
import type {
  Expense,
  BusinessTrip,
  Customer,
  Invoice,
  Quote,
  Deal,
  Activity,
} from '@/lib/types';
import { computeTripAmount, KM_PAUSCHALE_EUR } from '@/lib/types';
import { formatEUR, formatDateDE } from '@/lib/utils';
import { site } from '@/lib/site-config';
import { FAHRTZIELE, kmAusLitern } from '@/lib/fahrten-ziele';
import { classifyExpense } from '@/lib/fahrtkosten-analyse';
import {
  sammleAnker,
  ohneBereitsErfasste,
  QUELLE_LABEL,
  STAERKE_TEXT,
  type Fahrtanker,
} from '@/lib/fahrten-anker';

const HOME = `${site.street}, ${site.zip} ${site.city}`;

/** Liest eine Literangabe wie "30,03 L" aus dem Belegtext. */
function literAusText(text: string): number | null {
  const m = text.match(/(\d+[.,]\d+|\d+)\s*(?:l\b|liter)/i);
  if (!m) return null;
  const v = parseFloat(m[1].replace(',', '.'));
  return Number.isFinite(v) ? v : null;
}

interface Entwurf {
  key: string;
  date: string;
  destinationName: string;
  destinationAddress: string;
  purpose: string;
  distanceKm: number;
  roundTrip: boolean;
}

/**
 * Hilfe beim Nachtragen zurueckliegender Fahrten.
 *
 * Wichtig zum Verstaendnis: Die Tankbelege liefern ZEITPUNKTE und eine
 * Plausibilitaetsgrenze, keine Betraege. Die Kilometer kommen aus den
 * tatsaechlich gefahrenen Strecken. Ein Gleichstand zwischen Belegsumme
 * und Fahrtkosten ist weder noetig noch erstrebenswert, weil die
 * Pauschale mehr abdeckt als nur den Sprit.
 */
export default function RekonstruktionPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [trips, setTrips] = useState<BusinessTrip[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [ankerGewaehlt, setAnkerGewaehlt] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [verbrauch, setVerbrauch] = useState('7');
  const [entwuerfe, setEntwuerfe] = useState<Entwurf[]>([]);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      listExpenses(),
      listBusinessTrips(),
      listCustomers(),
      listInvoices(),
      listQuotes(),
      listDeals(),
      listActivities(),
    ])
      .then(([e, t, c, i, q, d, a]) => {
        setExpenses(e);
        setTrips(t);
        setCustomers(c);
        setInvoices(i);
        setQuotes(q);
        setDeals(d);
        setActivities(a);
      })
      .catch((err) => setError((err as Error).message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  /** Alle Treibstoff-Belege, egal ob schon ausgebucht. */
  const tankbelege = useMemo(
    () =>
      expenses
        .map(classifyExpense)
        .filter((f) => f && f.verdict === 'treibstoff')
        .map((f) => f!)
        .sort((a, b) => a.expense.date.toMillis() - b.expense.date.toMillis()),
    [expenses],
  );

  const spritBilanz = useMemo(() => {
    const v = parseFloat(verbrauch.replace(',', '.'));
    let liter = 0;
    let literGeschaetzt = false;
    let netto = 0;
    // Mittlerer Literpreis aus den Belegen, bei denen beides bekannt ist.
    const mitLiter = tankbelege
      .map((f) => ({ l: literAusText(f.expense.description), b: f.gross }))
      .filter((x): x is { l: number; b: number } => x.l !== null && x.l > 0);
    const mittelpreis =
      mitLiter.length > 0
        ? mitLiter.reduce((a, x) => a + x.b / x.l, 0) / mitLiter.length
        : null;

    for (const f of tankbelege) {
      netto += f.net;
      const l = literAusText(f.expense.description);
      if (l) liter += l;
      else if (mittelpreis) {
        liter += f.gross / mittelpreis;
        literGeschaetzt = true;
      }
    }
    const kmMoeglich =
      Number.isFinite(v) && v > 0 ? kmAusLitern(liter, v) : 0;
    return {
      liter: Math.round(liter * 10) / 10,
      literGeschaetzt,
      netto: Math.round(netto * 100) / 100,
      kmMoeglich,
      wertBeiPauschale: Math.round(kmMoeglich * KM_PAUSCHALE_EUR * 100) / 100,
      mittelpreis,
    };
  }, [tankbelege, verbrauch]);

  const zeitraum = useMemo(() => {
    if (tankbelege.length === 0) return null;
    return {
      von: tankbelege[0].expense.date.toDate(),
      bis: tankbelege[tankbelege.length - 1].expense.date.toDate(),
    };
  }, [tankbelege]);

  /** Bereits erfasste Fahrten im selben Zeitraum. */
  const vorhandene = useMemo(() => {
    if (!zeitraum) return [];
    return trips.filter((t) => {
      const d = t.date.toDate();
      return d >= zeitraum.von && d <= zeitraum.bis;
    });
  }, [trips, zeitraum]);

  /**
   * Zeitraum fuer die Ankersuche: vom ersten Tankbeleg bis zum letzten,
   * grosszuegig auf ganze Monate erweitert. Fahrten ohne Tankbeleg
   * zaehlen genauso, deshalb wird nicht auf die Belegtage eingeengt.
   */
  const anker = useMemo(() => {
    if (!zeitraum) return [];
    const von = new Date(zeitraum.von);
    von.setDate(1);
    von.setHours(0, 0, 0, 0);
    const bis = new Date(zeitraum.bis);
    bis.setMonth(bis.getMonth() + 1, 0);
    bis.setHours(23, 59, 59, 999);
    const alle = sammleAnker({
      customers,
      invoices,
      quotes,
      deals,
      activities,
      von,
      bis,
    });
    return ohneBereitsErfasste(alle, trips);
  }, [customers, invoices, quotes, deals, activities, trips, zeitraum]);

  const ankerUebernehmen = () => {
    const neu: Entwurf[] = [];
    for (const a of anker) {
      if (!ankerGewaehlt.has(a.key)) continue;
      neu.push({
        key: `anker-${a.key}`,
        date: a.date.toISOString().slice(0, 10),
        destinationName: a.ziel?.name ?? a.customerName,
        destinationAddress: a.ziel?.address ?? a.customerAddress,
        purpose: a.ziel?.defaultPurpose ?? a.label,
        distanceKm: a.ziel?.distanceKm ?? 0,
        roundTrip: true,
      });
    }
    setEntwuerfe((prev) => {
      const vorhandeneKeys = new Set(prev.map((e) => e.key));
      return [...prev, ...neu.filter((n) => !vorhandeneKeys.has(n.key))];
    });
    setAnkerGewaehlt(new Set());
  };

  const entwurfSumme = useMemo(() => {
    let km = 0;
    let betrag = 0;
    for (const e of entwuerfe) {
      const c = computeTripAmount(e.distanceKm, e.roundTrip, KM_PAUSCHALE_EUR);
      km += c.totalKm;
      betrag += c.amount;
    }
    const vorhandenKm = vorhandene.reduce((a, t) => a + t.totalKm, 0);
    const vorhandenBetrag = vorhandene.reduce((a, t) => a + t.amount, 0);
    return {
      km: Math.round((km + vorhandenKm) * 10) / 10,
      betrag: Math.round((betrag + vorhandenBetrag) * 100) / 100,
      neuKm: Math.round(km * 10) / 10,
      neuBetrag: Math.round(betrag * 100) / 100,
    };
  }, [entwuerfe, vorhandene]);

  const addEntwurf = (zielName: string) => {
    const z = FAHRTZIELE.find((x) => x.name === zielName);
    if (!z) return;
    setEntwuerfe((prev) => [
      ...prev,
      {
        key: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        date:
          tankbelege[0]?.expense.date.toDate().toISOString().slice(0, 10) ??
          new Date().toISOString().slice(0, 10),
        destinationName: z.name,
        destinationAddress: z.address,
        purpose: z.defaultPurpose,
        distanceKm: z.distanceKm,
        roundTrip: true,
      },
    ]);
  };

  const patch = (key: string, data: Partial<Entwurf>) =>
    setEntwuerfe((prev) =>
      prev.map((e) => (e.key === key ? { ...e, ...data } : e)),
    );

  const remove = (key: string) =>
    setEntwuerfe((prev) => prev.filter((e) => e.key !== key));

  const speichern = async () => {
    const ungueltig = entwuerfe.find(
      (e) => !e.purpose.trim() || !e.destinationName.trim() || e.distanceKm <= 0,
    );
    if (ungueltig) {
      setError('Jede Fahrt braucht Ziel, Anlass und eine Entfernung über null.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      for (const e of entwuerfe) {
        const c = computeTripAmount(
          e.distanceKm,
          e.roundTrip,
          KM_PAUSCHALE_EUR,
        );
        await createBusinessTrip({
          date: Timestamp.fromDate(new Date(`${e.date}T12:00:00`)),
          startAddress: HOME,
          destinationName: e.destinationName.trim(),
          destinationAddress: e.destinationAddress.trim(),
          purpose: e.purpose.trim(),
          distanceKm: e.distanceKm,
          roundTrip: e.roundTrip,
          totalKm: c.totalKm,
          ratePerKm: KM_PAUSCHALE_EUR,
          amount: c.amount,
          receiptExpenseIds: [],
          note: 'Nachträglich erfasst.',
        });
      }
      setDone(`${entwuerfe.length} Fahrt(en) angelegt.`);
      setEntwuerfe([]);
      load();
    } catch (err) {
      setError(`Speichern fehlgeschlagen: ${(err as Error).message}`);
    } finally {
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
          href="/dashboard/fahrten"
          className="text-sm text-gray-500 hover:text-gray-900 mb-3 inline-block"
        >
          ← Zurück zu den Fahrten
        </Link>
        <h1 className="text-2xl font-semibold text-gray-900">
          Fahrten nachtragen
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Trägt zurückliegende Fahrten nach. Die Tankbelege dienen als
          Gedächtnisstütze für die Zeitpunkte und als Plausibilitätsgrenze.
        </p>
      </header>

      {error && (
        <div className="card mb-4 bg-red-50 border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}
      {done && (
        <div className="card mb-4 bg-green-50 border-green-200 text-sm text-green-800">
          {done}{' '}
          <Link href="/dashboard/fahrten" className="underline">
            Zum Fahrtenbuch
          </Link>
        </div>
      )}

      {/* Grundsatz */}
      <div className="card mb-5 bg-blue-50 border-blue-200">
        <h2 className="text-sm font-semibold text-gray-900 mb-1.5">
          Warum die Summen nicht übereinstimmen müssen
        </h2>
        <p className="text-sm text-gray-700">
          Die Kilometerpauschale deckt nicht nur den Sprit ab, sondern auch
          Versicherung, Steuer, Wartung und Wertverlust. Sie liegt deshalb
          systematisch über den reinen Tankkosten. Wer die Kilometer so
          wählt, dass die Summen gleich sind, verschenkt die Differenz und
          hat obendrein Zahlen, die keiner echten Fahrt entsprechen.
        </p>
        <p className="text-sm text-gray-700 mt-2">
          Richtig herum: echte Fahrten eintragen, Betrag ausrechnen lassen.
          Die Tankbelege sagen dir nur, ob die Größenordnung stimmen kann.
        </p>
      </div>

      {/* Tankbelege */}
      <section className="card mb-5">
        <h2 className="text-base font-semibold text-gray-900 mb-1">
          Deine Tankbelege
        </h2>
        <p className="text-xs text-gray-500 mb-3">
          {zeitraum
            ? `Zeitraum ${formatDateDE(zeitraum.von)} bis ${formatDateDE(zeitraum.bis)}`
            : 'Keine Tankbelege gefunden.'}
        </p>
        {tankbelege.length > 0 && (
          <div className="table-wrap mb-4">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-gray-500 tracking-wider border-b border-gray-100">
                <tr>
                  <th className="text-left py-2 w-24">Datum</th>
                  <th className="text-left py-2">Beleg</th>
                  <th className="text-right py-2 w-20">Liter</th>
                  <th className="text-right py-2 w-24">Netto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tankbelege.map((f) => {
                  const l = literAusText(f.expense.description);
                  return (
                    <tr key={f.expense.id}>
                      <td className="py-2 text-gray-600 whitespace-nowrap">
                        {formatDateDE(f.expense.date.toDate())}
                      </td>
                      <td className="py-2 text-gray-900">
                        {f.expense.description}
                      </td>
                      <td className="py-2 text-right tabular-nums text-gray-700">
                        {l ? `${l} L` : <span className="text-gray-400">?</span>}
                      </td>
                      <td className="py-2 text-right tabular-nums text-gray-700">
                        {formatEUR(f.net)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-wrap items-end gap-3 p-3 rounded-lg bg-gray-50 border border-gray-200">
          <div>
            <label className="label">Verbrauch in L je 100 km</label>
            <input
              className="input w-28"
              inputMode="decimal"
              value={verbrauch}
              onChange={(e) => setVerbrauch(e.target.value)}
            />
          </div>
          <div className="text-sm text-gray-700">
            <div>
              {spritBilanz.liter} L getankt
              {spritBilanz.literGeschaetzt && (
                <span className="text-gray-500">
                  {' '}
                  (teils über den Literpreis geschätzt)
                </span>
              )}{' '}
              reichen für rund{' '}
              <strong>{spritBilanz.kmMoeglich} km</strong>.
            </div>
            <div className="text-xs text-gray-500 mt-0.5">
              Wären das alles betriebliche Fahrten, entspräche das{' '}
              {formatEUR(spritBilanz.wertBeiPauschale)} statt der{' '}
              {formatEUR(spritBilanz.netto)} aus den Belegen. Privatfahrten
              sind darin noch enthalten, der echte Wert liegt also
              darunter.
            </div>
          </div>
        </div>
      </section>

      {/* Anker aus dem eigenen System */}
      <section className="card mb-5">
        <h2 className="text-base font-semibold text-gray-900 mb-1">
          Vorschläge aus deinen Geschäftsvorfällen
        </h2>
        <p className="text-xs text-gray-500 mb-3">
          Tage, an denen laut deinem eigenen System etwas mit einem Kunden
          lief. Das sind Anhaltspunkte, keine Beweise. Hak nur ab, wo du
          wirklich hingefahren bist.
        </p>

        {anker.length === 0 ? (
          <p className="text-sm text-gray-500">
            Keine Vorgänge im Zeitraum gefunden, zu denen eine Fahrt passen
            könnte.
          </p>
        ) : (
          <>
            <div className="table-wrap mb-3">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase text-gray-500 tracking-wider border-b border-gray-100">
                  <tr>
                    <th className="py-2 w-8" />
                    <th className="text-left py-2 w-24">Datum</th>
                    <th className="text-left py-2">Kunde und Vorgang</th>
                    <th className="text-left py-2 w-28">Hinweis</th>
                    <th className="text-right py-2 w-28">Strecke</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {anker.map((a: Fahrtanker) => (
                    <tr key={a.key}>
                      <td className="py-2">
                        <input
                          type="checkbox"
                          checked={ankerGewaehlt.has(a.key)}
                          onChange={() =>
                            setAnkerGewaehlt((prev) => {
                              const n = new Set(prev);
                              if (n.has(a.key)) n.delete(a.key);
                              else n.add(a.key);
                              return n;
                            })
                          }
                          className="rounded border-gray-300"
                        />
                      </td>
                      <td className="py-2 text-gray-600 whitespace-nowrap">
                        {formatDateDE(a.date)}
                      </td>
                      <td className="py-2">
                        <div className="text-gray-900">{a.customerName}</div>
                        <div className="text-xs text-gray-500">
                          {QUELLE_LABEL[a.quelle]}: {a.label}
                        </div>
                      </td>
                      <td className="py-2">
                        <span
                          className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold ${
                            a.staerke === 'stark'
                              ? 'bg-green-50 text-green-700'
                              : a.staerke === 'mittel'
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-gray-100 text-gray-500'
                          }`}
                          title={STAERKE_TEXT[a.staerke]}
                        >
                          {a.staerke}
                        </span>
                      </td>
                      <td className="py-2 text-right text-gray-700">
                        {a.ziel ? (
                          <span className="tabular-nums">
                            {a.ziel.distanceKm} km
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">
                            km eintragen
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              onClick={ankerUebernehmen}
              disabled={ankerGewaehlt.size === 0}
              className="btn-secondary text-sm disabled:opacity-50"
            >
              {ankerGewaehlt.size} ausgewählte übernehmen
            </button>
          </>
        )}
      </section>

      {/* Entwurf */}
      <section className="card mb-5">
        <h2 className="text-base font-semibold text-gray-900 mb-1">
          Fahrten zusammenstellen
        </h2>
        <p className="text-xs text-gray-500 mb-3">
          Ziel anklicken, dann Datum und Anlass anpassen. Trag nur ein, was
          du tatsächlich gefahren bist.
        </p>
        <div className="flex flex-wrap gap-1.5 mb-4">
          {FAHRTZIELE.map((z) => (
            <button
              key={z.name}
              type="button"
              onClick={() => addEntwurf(z.name)}
              className="px-2.5 py-1 rounded-full border border-gray-200 bg-white text-xs text-gray-700 hover:border-blue-400 hover:text-blue-700"
            >
              + {z.name}
              <span className="text-gray-400 ml-1">{z.distanceKm} km</span>
            </button>
          ))}
        </div>

        {entwuerfe.length === 0 ? (
          <p className="text-sm text-gray-500">
            Noch nichts zusammengestellt.
          </p>
        ) : (
          <div className="space-y-2">
            {entwuerfe.map((e) => {
              const c = computeTripAmount(
                e.distanceKm,
                e.roundTrip,
                KM_PAUSCHALE_EUR,
              );
              return (
                <div
                  key={e.key}
                  className="p-3 rounded-lg border border-gray-200 bg-white"
                >
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <input
                      type="date"
                      className="input w-auto text-sm"
                      value={e.date}
                      onChange={(ev) => patch(e.key, { date: ev.target.value })}
                    />
                    <span className="font-medium text-gray-900">
                      {e.destinationName}
                    </span>
                    <label className="flex items-center gap-1.5 text-xs text-gray-600">
                      <input
                        type="checkbox"
                        checked={e.roundTrip}
                        onChange={(ev) =>
                          patch(e.key, { roundTrip: ev.target.checked })
                        }
                        className="rounded border-gray-300"
                      />
                      hin und zurück
                    </label>
                    <input
                      className="input w-24 text-sm"
                      inputMode="decimal"
                      value={String(e.distanceKm).replace('.', ',')}
                      onChange={(ev) =>
                        patch(e.key, {
                          distanceKm:
                            parseFloat(ev.target.value.replace(',', '.')) || 0,
                        })
                      }
                    />
                    <span className="text-xs text-gray-500">km einfach</span>
                    <span className="ml-auto text-sm tabular-nums font-medium text-gray-900">
                      {c.totalKm} km = {formatEUR(c.amount)}
                    </span>
                    <button
                      onClick={() => remove(e.key)}
                      className="text-xs text-red-600 hover:underline"
                    >
                      entfernen
                    </button>
                  </div>
                  <input
                    className="input text-sm"
                    value={e.purpose}
                    onChange={(ev) => patch(e.key, { purpose: ev.target.value })}
                    placeholder="Anlass der Fahrt, möglichst konkret"
                  />
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Bilanz */}
      <section className="card mb-5">
        <h2 className="text-base font-semibold text-gray-900 mb-3">
          Gegenüberstellung
        </h2>
        <div className="space-y-2 text-sm">
          <Zeile
            label="Tankbelege netto, bisher in der EÜR"
            wert={formatEUR(spritBilanz.netto)}
          />
          <Zeile
            label={`Bereits erfasste Fahrten im Zeitraum (${vorhandene.length})`}
            wert={formatEUR(
              Math.round(vorhandene.reduce((a, t) => a + t.amount, 0) * 100) /
                100,
            )}
          />
          <Zeile
            label={`Neu zusammengestellt (${entwuerfe.length})`}
            wert={formatEUR(entwurfSumme.neuBetrag)}
          />
          <div className="border-t border-gray-200 pt-2">
            <Zeile
              label={`Fahrtkosten gesamt (${entwurfSumme.km} km)`}
              wert={formatEUR(entwurfSumme.betrag)}
              fett
            />
          </div>
          <Zeile
            label="Plausibilitätsgrenze aus dem getankten Sprit"
            wert={formatEUR(spritBilanz.wertBeiPauschale)}
            grau
          />
        </div>

        {entwurfSumme.betrag > spritBilanz.wertBeiPauschale &&
          spritBilanz.wertBeiPauschale > 0 && (
            <div className="mt-3 p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-900">
              Die zusammengestellten Fahrten liegen über dem, was der
              getankte Sprit hergibt. Entweder fehlt ein Tankbeleg oder eine
              Entfernung ist zu hoch angesetzt. Bitte nochmal durchgehen.
            </div>
          )}

        <div className="flex items-center gap-2 mt-4">
          <button
            onClick={speichern}
            disabled={saving || entwuerfe.length === 0}
            className="btn-primary text-sm disabled:opacity-50"
          >
            {saving
              ? 'Speichert…'
              : `${entwuerfe.length} Fahrt(en) ins Fahrtenbuch übernehmen`}
          </button>
        </div>
      </section>
    </div>
  );
}

function Zeile({
  label,
  wert,
  fett,
  grau,
}: {
  label: string;
  wert: string;
  fett?: boolean;
  grau?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className={grau ? 'text-gray-500' : 'text-gray-700'}>{label}</span>
      <span
        className={`tabular-nums ${
          fett ? 'font-semibold text-gray-900' : grau ? 'text-gray-500' : 'text-gray-800'
        }`}
      >
        {wert}
      </span>
    </div>
  );
}
