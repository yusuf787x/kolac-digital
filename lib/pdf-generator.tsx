'use client';

import { pdf } from '@react-pdf/renderer';
import InvoicePDF from '@/components/invoice/InvoicePDF';
import type { Invoice, Customer } from './types';
import { buildInvoiceQrDataUrl } from './qr';

export async function generateInvoicePdfBlob(
  invoice: Invoice,
  customer: Customer,
): Promise<Blob> {
  const qrCodeDataUrl = await buildInvoiceQrDataUrl({
    amount: invoice.totalAmount,
    invoiceNumber: invoice.invoiceNumber,
  });

  const logoSrc =
    typeof window !== 'undefined'
      ? `${window.location.origin}/images/Logo%20Lang%20Schwarz.png`
      : '/images/Logo%20Lang%20Schwarz.png';

  const blob = await pdf(
    <InvoicePDF
      invoice={invoice}
      customer={customer}
      logoSrc={logoSrc}
      qrCodeDataUrl={qrCodeDataUrl}
    />,
  ).toBlob();

  return blob;
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function buildInvoiceFilename(
  invoice: Invoice,
  customer: Customer,
): string {
  const cust = customer.company || customer.lastName || 'Kunde';
  const safe = cust.replace(/[^a-zA-ZäöüÄÖÜß0-9 -]/g, '').trim();
  return `Rechnung ${invoice.invoiceNumber} ${safe}.pdf`;
}
