'use client';

import {
  getGoogleAuth,
  updateInvoice,
  updateExpense,
} from './firestore';
import type { Invoice, Customer, Expense } from './types';
import { formatDateDE } from './utils';
import {
  generateInvoicePdfBlob,
  buildInvoiceFilename,
} from './pdf-generator';

async function blobToBase64(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

export async function syncInvoiceToDrive(
  invoice: Invoice,
  customer: Customer,
): Promise<string> {
  const auth = await getGoogleAuth();
  if (!auth?.refreshToken) {
    throw new Error(
      'Google Drive ist nicht verbunden. Bitte zuerst in den Einstellungen verbinden.',
    );
  }

  const pdf = await generateInvoicePdfBlob(invoice, customer);
  const pdfBase64 = await blobToBase64(pdf);
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

  const { webViewLink } = (await res.json()) as { webViewLink: string };

  await updateInvoice(invoice.id, { driveUrl: webViewLink });
  return webViewLink;
}

export async function syncExpenseToDrive(
  expense: Expense,
  receipt: { file: File } | { url: string; mimeType: string; filename: string },
): Promise<string> {
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
    receiptBase64 = await blobToBase64(receipt.file);
    receiptFilename = receipt.file.name;
    receiptMimeType = receipt.file.type || 'application/octet-stream';
  } else {
    // Fetch the file from the URL (already uploaded to Firebase Storage).
    const r = await fetch(receipt.url);
    const blob = await r.blob();
    receiptBase64 = await blobToBase64(blob);
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

  const { webViewLink } = (await res.json()) as { webViewLink: string };
  await updateExpense(expense.id, { driveUrl: webViewLink });
  return webViewLink;
}
