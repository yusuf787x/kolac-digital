'use client';

import { pdf } from '@react-pdf/renderer';
import InvoicePDF from '@/components/invoice/InvoicePDF';
import QuotePDF from '@/components/quote/QuotePDF';
import TemplateContractPdf, {
  type ContractAttachment,
} from '@/components/contract/TemplateContractPdf';
import SignaturePageOnlyPdf from '@/components/contract/SignaturePageOnlyPdf';
import type { Invoice, Customer, Quote } from './types';
import { buildInvoiceQrDataUrl } from './qr';
import { computeInvoiceVat, computeVat, formatEUR } from './utils';

export async function generateInvoicePdfBlob(
  invoice: Invoice,
  customer: Customer,
): Promise<Blob> {
  // GiroCode-Betrag = Brutto (was der Kunde tatsaechlich zahlt).
  // totalAmount ist Netto; Brutto ueber computeInvoiceVat pro Item,
  // Fallback auf Rechnungs-vatRate fuer Legacy.
  const invoiceGross = computeInvoiceVat(invoice.items, invoice.vatRate).gross;
  const qrCodeDataUrl = await buildInvoiceQrDataUrl({
    amount: invoiceGross,
    invoiceNumber: invoice.invoiceNumber ?? 'ENTWURF',
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
  const nr = invoice.invoiceNumber ?? 'Entwurf';
  return `Rechnung ${nr} ${safe}.pdf`;
}

/**
 * Rendert das Angebots-PDF und haengt EINE Signaturseite dahinter —
 * mit Kolac-Signatur + Bielefeld/Datum bereits eingesetzt, rechte
 * Spalte leer fuer den Kunden. Genutzt vom Vertrags-Flow, wenn der
 * User "Angebot" als Vertragstyp waehlt und ein bestehendes Angebot
 * 1:1 zur Unterschrift schicken will. So bleibt das Original-Layout
 * des Angebots erhalten und die Signaturzeilen sitzen an den
 * bekannten Positionen (SIG_FIELD_POSITIONS).
 */
export async function generateQuoteWithSignatureBlob(opts: {
  quote: Quote;
  customer: Customer;
  generatedAt?: string;
}): Promise<Blob> {
  const origin =
    typeof window !== 'undefined' ? window.location.origin : '';
  const logoSrc = `${origin}/images/Logo%20Lang%20Schwarz.png`;
  const kolacSignatureSrc = `${origin}/images/unterschrift-yusuf.png`;
  const generatedAt =
    opts.generatedAt ??
    new Date().toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

  // 1) Original-Angebots-PDF rendern.
  const quoteBlob = await pdf(
    <QuotePDF
      quote={opts.quote}
      customer={opts.customer}
      logoSrc={logoSrc}
    />,
  ).toBlob();

  // 2) Signaturseiten-PDF (eine Seite) rendern.
  const sigBlob = await pdf(
    <SignaturePageOnlyPdf
      title={`Angebot ${opts.quote.quoteNumber}`}
      subtitle={
        opts.customer.company ||
        `${opts.customer.firstName} ${opts.customer.lastName}`
      }
      customer={opts.customer}
      kolacSignatureSrc={kolacSignatureSrc}
      logoSrc={logoSrc}
      generatedAt={generatedAt}
    />,
  ).toBlob();

  // 3) Beide zu einem PDF mergen (Angebot + Signaturseite als Ende).
  const { PDFDocument } = await import('pdf-lib');
  const [quoteBuf, sigBuf] = await Promise.all([
    quoteBlob.arrayBuffer(),
    sigBlob.arrayBuffer(),
  ]);
  const merged = await PDFDocument.create();
  const quoteDoc = await PDFDocument.load(quoteBuf);
  const sigDoc = await PDFDocument.load(sigBuf);
  const quotePages = await merged.copyPages(
    quoteDoc,
    quoteDoc.getPageIndices(),
  );
  quotePages.forEach((p) => merged.addPage(p));
  const sigPages = await merged.copyPages(sigDoc, sigDoc.getPageIndices());
  sigPages.forEach((p) => merged.addPage(p));
  const bytes = await merged.save();
  // ArrayBuffer statt Uint8Array uebergeben, damit Blob den Typ akzeptiert
  return new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' });
}

export async function generateQuotePdfBlob(
  quote: Quote,
  customer: Customer,
): Promise<Blob> {
  const logoSrc =
    typeof window !== 'undefined'
      ? `${window.location.origin}/images/Logo%20Lang%20Schwarz.png`
      : '/images/Logo%20Lang%20Schwarz.png';

  return pdf(
    <QuotePDF quote={quote} customer={customer} logoSrc={logoSrc} />,
  ).toBlob();
}

export function buildQuoteFilename(
  quote: Quote,
  customer: Customer,
): string {
  const cust = customer.company || customer.lastName || 'Kunde';
  const safe = cust.replace(/[^a-zA-ZäöüÄÖÜß0-9 -]/g, '').trim();
  return `Angebot ${quote.quoteNumber} ${safe}.pdf`;
}

/**
 * Rendert ein template-basiertes Vertrags-PDF (Logo, Parteien-Header,
 * Freitext, Signaturblock, Footer). Genutzt vom "Neuer Vertrag aus
 * Vorlage"-Flow.
 */
export async function generateTemplateContractBlob(opts: {
  title: string;
  subtitle?: string;
  customer: Customer;
  bodyText: string;
  attachments?: ContractAttachment[];
  /**
   * Anzeige-Datum links unter der Kolac-Signatur (Erstellungsdatum
   * des Vertrags). Format: TT.MM.JJJJ. Wenn nicht gesetzt, wird das
   * heutige Datum genommen.
   */
  generatedAt?: string;
}): Promise<Blob> {
  const origin =
    typeof window !== 'undefined' ? window.location.origin : '';
  const logoSrc = `${origin}/images/Logo%20Lang%20Schwarz.png`;
  const kolacSignatureSrc = `${origin}/images/unterschrift-yusuf.png`;
  const generatedAt =
    opts.generatedAt ??
    new Date().toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

  return pdf(
    <TemplateContractPdf
      title={opts.title}
      subtitle={opts.subtitle}
      customer={opts.customer}
      bodyText={opts.bodyText}
      attachments={opts.attachments}
      logoSrc={logoSrc}
      kolacSignatureSrc={kolacSignatureSrc}
      generatedAt={generatedAt}
    />,
  ).toBlob();
}

/**
 * Baut aus einem Angebot einen Freitext-Vorschlag (HTML) fuer die
 * Vertrags-Vorlage: Einleitungstext des Angebots + formatierte
 * Positions-Tabelle (Titel, Menge, Einzelpreis, Summe) + Netto/USt/
 * Brutto-Zeilen. Optional-Positionen werden explizit markiert und
 * NICHT in die Bindungs-Summe eingerechnet.
 */
export function quoteToTemplateHtml(quote: Quote): string {
  const bindingNet = quote.items
    .filter((i) => !i.optional)
    .reduce((acc, i) => acc + i.totalPrice, 0);
  const optionalNet = quote.items
    .filter((i) => i.optional)
    .reduce((acc, i) => acc + i.totalPrice, 0);
  const v = computeVat(bindingNet, quote.vatRate);
  const optV = computeVat(optionalNet, quote.vatRate);
  const pct = Math.round(v.rate * 100);

  const parts: string[] = [];

  // 1) Einleitungstext aus Angebot uebernehmen (falls vorhanden).
  if (quote.introText && quote.introText.trim()) {
    parts.push(quote.introText.trim());
  } else {
    parts.push(
      `<p>hiermit bestaetigen wir die Beauftragung des Angebots <strong>${escapeHtml(
        quote.quoteNumber,
      )}</strong> mit folgenden Leistungen:</p>`,
    );
  }

  // 2) Positionen als Aufzaehlung — jede Position als Bullet, optional
  //    als [OPTIONAL] gekennzeichnet.
  parts.push('<p><strong>Leistungsumfang:</strong></p>');
  parts.push('<ul>');
  for (const it of quote.items) {
    const optionalTag = it.optional
      ? ' <strong>[OPTIONAL, nicht im Preis]</strong>'
      : '';
    parts.push(
      `<li><strong>${escapeHtml(it.description.split('\n')[0])}</strong>${optionalTag} — ${it.quantity} × ${formatEUR(it.unitPrice)} = ${formatEUR(it.totalPrice)}</li>`,
    );
  }
  parts.push('</ul>');

  // 3) Preis-Zusammenfassung.
  parts.push(
    `<p><strong>Gesamtbetrag:</strong> netto ${formatEUR(v.net)} + USt (${pct} %) ${formatEUR(v.vat)} = <strong>${formatEUR(v.gross)} brutto</strong>.</p>`,
  );
  if (optionalNet > 0) {
    parts.push(
      `<p>Optional zubuchbar: ${formatEUR(optV.gross)} brutto (nicht im Auftragsvolumen enthalten).</p>`,
    );
  }
  if (v.rate === 0) {
    parts.push('<p>Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.</p>');
  }
  parts.push(
    '<p>Mit der Unterschrift auf diesem Dokument erteilt der Auftraggeber verbindlich den Auftrag zu den oben genannten Leistungen und Konditionen.</p>',
  );

  return parts.join('');
}

const escapeHtml = (s: string): string =>
  s.replace(/[&<>"']/g, (c) =>
    c === '&'
      ? '&amp;'
      : c === '<'
        ? '&lt;'
        : c === '>'
          ? '&gt;'
          : c === '"'
            ? '&quot;'
            : '&#39;',
  );
