import { pdf } from '@react-pdf/renderer';
import InvoicePDF from '@/components/invoice/InvoicePDF';
import type { Invoice, Customer } from './types';
import { buildInvoiceQrDataUrl } from './qr';

/**
 * Server-Variante des Invoice-PDF-Generators für API-Routes (z.B. den
 * GoCardless-Webhook). Liefert einen Node-Buffer statt Browser-Blob.
 */
export async function generateInvoicePdfBuffer(
  invoice: Invoice,
  customer: Customer,
): Promise<Buffer> {
  const qrCodeDataUrl = await buildInvoiceQrDataUrl({
    amount: invoice.totalAmount,
    invoiceNumber: invoice.invoiceNumber,
  });

  const base = appBaseUrl();
  const logoSrc = base
    ? `${base}/images/Logo%20Lang%20Schwarz.png`
    : '/images/Logo%20Lang%20Schwarz.png';

  // pdf() von @react-pdf/renderer: in Node-Umgebung gibt toBuffer() einen
  // Readable-Stream zurück — wir sammeln die Chunks und konkatenieren.
  const instance = pdf(
    <InvoicePDF
      invoice={invoice}
      customer={customer}
      logoSrc={logoSrc}
      qrCodeDataUrl={qrCodeDataUrl}
    />,
  );

  const stream = await instance.toBuffer();
  return await streamToBuffer(stream);
}

function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (c) =>
      chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)),
    );
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

function appBaseUrl(): string {
  if (process.env.APP_BASE_URL) return process.env.APP_BASE_URL;
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return '';
}
