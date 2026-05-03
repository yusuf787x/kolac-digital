'use client';

import { Timestamp } from 'firebase/firestore';
import {
  listCustomers,
  listInvoices,
  listExpenses,
  createCustomer,
  getGoogleAuth,
  updateSettings,
  getSettings,
} from './firestore';
import {
  doc,
  setDoc,
  collection,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { buildInvoiceNumber } from './utils';
import type { ExpenseCategory } from './types';

export interface ImportResult {
  invoicesCreated: number;
  invoicesSkipped: number;
  expensesCreated: number;
  expensesSkipped: number;
  customersCreated: number;
  highestInvoiceCounter: number;
  errors: string[];
}

/** Parse a German date string like "30.04.2026" or "30/04/2026". */
function parseGermanDate(input: string | number | undefined): Date | null {
  if (input == null || input === '') return null;
  const str = String(input).trim();
  // Handle "DD.MM.YYYY" or "DD/MM/YYYY"
  const m = str.match(/^(\d{1,2})[.\/](\d{1,2})[.\/](\d{2,4})$/);
  if (m) {
    const [, d, mo, y] = m;
    const year = y.length === 2 ? 2000 + parseInt(y, 10) : parseInt(y, 10);
    const date = new Date(year, parseInt(mo, 10) - 1, parseInt(d, 10));
    if (!isNaN(date.getTime())) return date;
  }
  // ISO format fallback
  const iso = new Date(str);
  if (!isNaN(iso.getTime())) return iso;
  return null;
}

/** Parse a German number string like "1.234,56" or "50,04" or 50.04 (number). */
function parseGermanNumber(input: string | number | undefined): number | null {
  if (input == null || input === '') return null;
  if (typeof input === 'number') return input;
  const str = String(input)
    .trim()
    .replace(/[€\s]/g, '')
    .replace(/\./g, '') // remove thousand separators
    .replace(',', '.');
  const n = parseFloat(str);
  return isNaN(n) ? null : n;
}

/** Extract the numeric counter from an invoice number ("R1218" → 1218). */
function extractInvoiceCounter(num: string): number | null {
  const rMatch = num.match(/^R(\d+)$/);
  if (rMatch) return parseInt(rMatch[1], 10);
  const kdMatch = num.match(/^KD-\d{4}-(\d+)$/);
  if (kdMatch) return parseInt(kdMatch[1], 10);
  return null;
}

/** Categorize an expense by description heuristically. */
function guessCategory(description: string): ExpenseCategory {
  const d = description.toLowerCase();
  if (/(google|meta|facebook|instagram|tiktok|ads|werbung)/.test(d))
    return 'Werbung/Ads';
  if (/(domain|hosting|figma|adobe|notion|github|vercel|firebase|software|saas|abo|subscription)/.test(d))
    return 'Software/Tools';
  if (/(macbook|laptop|kamera|monitor|hardware|drucker|kabel)/.test(d))
    return 'Hardware';
  if (/(reise|hotel|bahn|deutsche bahn|flug|taxi|uber)/.test(d))
    return 'Reisen';
  if (/(internet|telefon|handy|mobil|vodafone|telekom|o2)/.test(d))
    return 'Telefon/Internet';
  if (/(versicherung|haftpflicht)/.test(d)) return 'Versicherungen';
  if (/(büro|büro|stuhl|tisch|papier)/.test(d)) return 'Büro';
  if (/(kurs|seminar|buch|schulung|udemy|coursera|fortbildung|weiterbildung)/.test(d))
    return 'Weiterbildung';
  return 'Sonstiges';
}

interface SheetRows {
  einnahmen: (string | number)[][];
  ausgaben: (string | number)[][];
}

async function fetchSheet(refreshToken: string): Promise<SheetRows> {
  const res = await fetch('/api/import/read-sheet', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  const data = (await res.json()) as SheetRows;
  return data;
}

export async function importFromGoogleSheet(): Promise<ImportResult> {
  const auth = await getGoogleAuth();
  if (!auth?.refreshToken) {
    throw new Error(
      'Google Drive ist nicht verbunden. Erst in Einstellungen verbinden.',
    );
  }

  const result: ImportResult = {
    invoicesCreated: 0,
    invoicesSkipped: 0,
    expensesCreated: 0,
    expensesSkipped: 0,
    customersCreated: 0,
    highestInvoiceCounter: 0,
    errors: [],
  };

  const { einnahmen, ausgaben } = await fetchSheet(auth.refreshToken);

  // Pre-fetch existing data for deduplication.
  const [existingCustomers, existingInvoices, existingExpenses] =
    await Promise.all([listCustomers(), listInvoices(), listExpenses()]);

  // Mutable customer cache: company-name (lower) -> id
  const customerByCompany = new Map<string, string>();
  existingCustomers.forEach((c) => {
    if (c.company) customerByCompany.set(c.company.toLowerCase(), c.id);
  });
  existingCustomers.forEach((c) => {
    const fullName = `${c.firstName} ${c.lastName}`.trim().toLowerCase();
    if (fullName) customerByCompany.set(fullName, c.id);
  });

  const existingInvoiceNumbers = new Set(
    existingInvoices.map((i) => i.invoiceNumber.toLowerCase()),
  );

  const existingExpenseKeys = new Set(
    existingExpenses.map(
      (e) =>
        `${e.date.toMillis()}|${e.description.trim().toLowerCase()}|${e.amount.toFixed(2)}`,
    ),
  );

  // Process EINNAHMEN
  // Spalten: Datum, Kunde, Rechnungsnr, Leistung, Betrag, Link
  for (let i = 0; i < einnahmen.length; i++) {
    const row = einnahmen[i];
    if (!row || row.length === 0) continue;

    // Skip header row (heuristic: row 0, contains "Datum" oder "Kunde")
    if (i === 0) {
      const blob = row.map((c) => String(c ?? '').toLowerCase()).join('|');
      if (blob.includes('datum') || blob.includes('kunde')) continue;
    }

    const [datumRaw, kundeRaw, rnrRaw, leistungRaw, betragRaw, linkRaw] = row;

    const datum = parseGermanDate(datumRaw as string);
    const kunde = String(kundeRaw ?? '').trim();
    const rnr = String(rnrRaw ?? '').trim();
    const leistung = String(leistungRaw ?? '').trim();
    const betrag = parseGermanNumber(betragRaw as string | number);
    const link = String(linkRaw ?? '').trim();

    if (!datum || !kunde || !rnr || betrag == null) {
      // Probably an empty row or summary row — skip silently.
      continue;
    }

    if (existingInvoiceNumbers.has(rnr.toLowerCase())) {
      result.invoicesSkipped++;
      continue;
    }

    // Resolve or create customer
    let customerId = customerByCompany.get(kunde.toLowerCase());
    if (!customerId) {
      try {
        customerId = await createCustomer({
          company: kunde,
          salutation: 'Herr',
          firstName: '',
          lastName: '',
          street: '',
          zip: '',
          city: '',
          email: '',
          phone: '',
          notes: 'Auto-erstellt aus Sheet-Import',
        });
        customerByCompany.set(kunde.toLowerCase(), customerId);
        result.customersCreated++;
      } catch (err) {
        result.errors.push(
          `Konnte Kunde "${kunde}" nicht anlegen: ${(err as Error).message}`,
        );
        continue;
      }
    }

    // Track highest counter for settings update
    const counter = extractInvoiceCounter(rnr);
    if (counter !== null && counter > result.highestInvoiceCounter) {
      result.highestInvoiceCounter = counter;
    }

    // Create invoice with status "paid" (it's from the historical sheet)
    try {
      const newRef = doc(collection(db, 'invoices'));
      const dateTs = Timestamp.fromDate(datum);
      // Due date assumed = invoice date (already paid, no longer relevant)
      await setDoc(newRef, {
        customerId,
        invoiceNumber: rnr,
        invoiceDate: dateTs,
        dueDate: dateTs,
        status: 'paid',
        paidAmount: betrag,
        totalAmount: betrag,
        closingText: 'Vielen Dank und liebe Grüße\nYusuf Kolac',
        pdfUrl: null,
        driveUrl: link || null,
        sentAt: dateTs,
        paidAt: dateTs,
        items: [
          {
            position: 1,
            description: leistung || 'Leistung',
            quantity: 1,
            unitPrice: betrag,
            totalPrice: betrag,
          },
        ],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      existingInvoiceNumbers.add(rnr.toLowerCase());
      result.invoicesCreated++;
    } catch (err) {
      result.errors.push(
        `Rechnung ${rnr} konnte nicht angelegt werden: ${(err as Error).message}`,
      );
    }
  }

  // Process AUSGABEN
  // Spalten: Datum, Posten, Betrag, Link
  for (let i = 0; i < ausgaben.length; i++) {
    const row = ausgaben[i];
    if (!row || row.length === 0) continue;

    if (i === 0) {
      const blob = row.map((c) => String(c ?? '').toLowerCase()).join('|');
      if (blob.includes('datum') || blob.includes('posten')) continue;
    }

    const [datumRaw, postenRaw, betragRaw, linkRaw] = row;

    const datum = parseGermanDate(datumRaw as string);
    const posten = String(postenRaw ?? '').trim();
    const betrag = parseGermanNumber(betragRaw as string | number);
    const link = String(linkRaw ?? '').trim();

    if (!datum || !posten || betrag == null) continue;

    const dedupKey = `${Timestamp.fromDate(datum).toMillis()}|${posten.toLowerCase()}|${betrag.toFixed(2)}`;
    if (existingExpenseKeys.has(dedupKey)) {
      result.expensesSkipped++;
      continue;
    }

    try {
      const newRef = doc(collection(db, 'expenses'));
      await setDoc(newRef, {
        date: Timestamp.fromDate(datum),
        description: posten,
        amount: betrag,
        category: guessCategory(posten),
        supplier: '',
        receiptUrl: null,
        driveUrl: link || null,
        createdAt: serverTimestamp(),
      });
      existingExpenseKeys.add(dedupKey);
      result.expensesCreated++;
    } catch (err) {
      result.errors.push(
        `Ausgabe "${posten}" konnte nicht angelegt werden: ${(err as Error).message}`,
      );
    }
  }

  // Update settings counter if we found a higher invoice number
  if (result.highestInvoiceCounter > 0) {
    try {
      const settings = await getSettings();
      const next = result.highestInvoiceCounter + 1;
      if (next > settings.nextInvoiceNumber) {
        const sample = buildInvoiceNumber(next, new Date());
        await updateSettings({ nextInvoiceNumber: next });
        result.errors.push(
          `Hinweis: Nächste Rechnungsnummer auf ${sample} (${next}) gesetzt.`,
        );
      }
    } catch (err) {
      result.errors.push(
        `Settings-Update fehlgeschlagen: ${(err as Error).message}`,
      );
    }
  }

  return result;
}
