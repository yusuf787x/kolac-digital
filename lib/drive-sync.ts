'use client';

import {
  getGoogleAuth,
  updateInvoice,
  updateExpense,
  updateQuote,
} from './firestore';
import type { Invoice, Customer, Expense, Quote } from './types';
import { formatDateDE } from './utils';
import {
  generateInvoicePdfBlob,
  buildInvoiceFilename,
} from './pdf-generator';
import { fileToBase64 } from './file-utils';

export interface DriveSyncResult {
  webViewLink: string;
  sheetSyncError: string | null;
}

export async function syncInvoiceToDrive(
  invoice: Invoice,
  customer: Customer,
): Promise<DriveSyncResult> {
  const auth = await getGoogleAuth();
  if (!auth?.refreshToken) {
    throw new Error(
      'Google Drive ist nicht verbunden. Bitte zuerst in den Einstellungen verbinden.',
    );
  }

  const pdf = await generateInvoicePdfBlob(invoice, customer);
  const pdfBase64 = await fileToBase64(pdf);
  const filename = buildInvoiceFilename(invoice, customer);
  const leistung =
    invoice.items
      .map((i) => i.description.split('\n')[0])
      .filter(Boolean)
      .slice(0, 3)
      .join('; ') || '—';

  const res = await fetch('/api/drive/save-invoice', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      refreshToken: auth.refreshToken,
      pdfBase64,
      filename,
      date: formatDateDE(invoice.invoiceDate.toDate()),
      customerName: customer.company || customer.lastName || '—',
      invoiceNumber: invoice.invoiceNumber,
      leistung,
      amount: invoice.totalAmount,
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error ?? 'Drive-Sync fehlgeschlagen.');
  }

  const { webViewLink, sheetSyncError } = (await res.json()) as {
    webViewLink: string;
    sheetSyncError: string | null;
  };

  // Persist drive URL even when sheet append failed — file IS in Drive.
  await updateInvoice(invoice.id, { driveUrl: webViewLink });
  return { webViewLink, sheetSyncError };
}

/**
 * Upload an order-confirmation file to the "Aufträge" Drive folder and
 * persist the resulting Drive link on the quote document.
 *
 * Caller should already have uploaded the file to Firebase Storage
 * (which provides the in-app preview link). This adds the Drive backup.
 */
export async function syncConfirmationToDrive(
  quote: Quote,
  customer: Customer,
  file: File,
): Promise<string> {
  const auth = await getGoogleAuth();
  if (!auth?.refreshToken) {
    throw new Error(
      'Google Drive ist nicht verbunden. Bitte zuerst in den Einstellungen verbinden.',
    );
  }

  const ext = file.name.includes('.') ? file.name.split('.').pop() : 'bin';
  const cust = (customer.company || customer.lastName || 'Kunde').replace(
    /[^a-zA-ZäöüÄÖÜß0-9 -]/g,
    '',
  );
  const filename = `Bestätigung ${quote.quoteNumber} ${cust}.${ext}`;
  const mimeType = file.type || 'application/octet-stream';
  const fileBase64 = await fileToBase64(file);

  const res = await fetch('/api/drive/save-confirmation', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      refreshToken: auth.refreshToken,
      fileBase64,
      filename,
      mimeType,
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error ?? 'Drive-Sync fehlgeschlagen.');
  }

  const { webViewLink } = (await res.json()) as { webViewLink: string };
  await updateQuote(quote.id, { confirmationDriveUrl: webViewLink });
  return webViewLink;
}

export async function syncExpenseToDrive(
  expense: Expense,
  receipt: { file: File } | { url: string; mimeType: string; filename: string },
): Promise<DriveSyncResult> {
  const auth = await getGoogleAuth();
  if (!auth?.refreshToken) {
    throw new Error(
      'Google Drive ist nicht verbunden. Bitte zuerst in den Einstellungen verbinden.',
    );
  }

  let receiptBase64: string;
  let receiptFilename: string;
  let receiptMimeType: string;

  if ('file' in receipt) {
    receiptBase64 = await fileToBase64(receipt.file);
    receiptFilename = receipt.file.name;
    receiptMimeType = receipt.file.type || 'application/octet-stream';
  } else {
    // Fetch the file from the URL (already uploaded to Firebase Storage).
    const r = await fetch(receipt.url);
    const blob = await r.blob();
    receiptBase64 = await fileToBase64(blob);
    receiptFilename = receipt.filename;
    receiptMimeType = receipt.mimeType;
  }

  const res = await fetch('/api/drive/save-expense', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      refreshToken: auth.refreshToken,
      receiptBase64,
      receiptFilename,
      receiptMimeType,
      date: formatDateDE(expense.date.toDate()),
      posten: expense.description,
      amount: expense.amount,
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error ?? 'Drive-Sync fehlgeschlagen.');
  }

  const { webViewLink, sheetSyncError } = (await res.json()) as {
    webViewLink: string;
    sheetSyncError: string | null;
  };
  await updateExpense(expense.id, { driveUrl: webViewLink });
  return { webViewLink, sheetSyncError };
}
