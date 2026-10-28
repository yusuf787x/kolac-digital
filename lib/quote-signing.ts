'use client';

import { Timestamp } from 'firebase/firestore';
import { createContract, updateQuote, uploadFile } from './firestore';
import { generateSigningToken, sha256Hex } from './contract-utils';
import type { Contract, ContractField, Customer, Quote } from './types';

/**
 * Erzeugt fuer ein Angebot einen Signing-Link — gleiche Logik wie der
 * Vertrags-Flow "Vertrag aus Angebot": Angebots-PDF + Signaturseite
 * (Kolac schon unterschrieben) werden gemergt, hochgeladen und als
 * Contract mit quoteId angelegt. Der Kunde unterschreibt dann ueber
 * /sign/[token]; der Submit-Endpoint setzt das Angebot auf angenommen.
 *
 * Link laeuft mit dem Angebot ab (Ende des „gueltig bis"-Tages).
 */
export async function createQuoteSigningContract(
  quote: Quote,
  customer: Customer,
): Promise<string> {
  const generatedAt = new Date().toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const { generateQuoteWithSignatureBlob } = await import('./pdf-generator');
  const blob = await generateQuoteWithSignatureBlob({
    quote,
    customer,
    generatedAt,
  });
  const buf = await blob.arrayBuffer();
  const hash = await sha256Hex(buf);
  const token = generateSigningToken();
  const path = `contracts/${token}/original.pdf`;
  const pdfFile = new File([blob], 'contract.pdf', {
    type: 'application/pdf',
  });
  const downloadUrl = await uploadFile(path, pdfFile);

  // Signaturseite ist die letzte Seite des gemergten Dokuments.
  const { PDFDocument } = await import('pdf-lib');
  const pageCount = (await PDFDocument.load(buf)).getPageCount();

  const { SIG_FIELD_POSITIONS } = await import(
    '@/components/contract/TemplateContractPdf'
  );
  const fields: ContractField[] = [
    { type: 'date', page: pageCount, ...SIG_FIELD_POSITIONS.date },
    {
      type: 'customer_signature',
      page: pageCount,
      ...SIG_FIELD_POSITIONS.customerSignature,
    },
  ];

  const validEnd = quote.validUntil.toDate();
  validEnd.setHours(23, 59, 59, 999);
  const expiresAtMs =
    validEnd.getTime() > Date.now()
      ? validEnd.getTime()
      : Date.now() + 14 * 24 * 60 * 60 * 1000;

  // Angebot schon versendet → Link gilt direkt als versendet, damit die
  // Erinnerungs-Logik greift.
  const alreadySent = quote.status === 'sent';

  const data: Omit<Contract, 'id' | 'createdAt' | 'updatedAt'> = {
    customerId: quote.customerId,
    customerSnapshot: {
      company: customer.company,
      firstName: customer.firstName,
      lastName: customer.lastName,
      email: customer.email,
      city: customer.city,
    },
    // Kein Vertragstyp — der Link haengt direkt am Angebot.
    typeId: '',
    typeLabel: 'Angebot',
    title: `Angebot ${quote.quoteNumber}`,
    quoteId: quote.id,
    status: alreadySent ? 'sent' : 'draft',
    originalPdfPath: path,
    originalPdfUrl: downloadUrl,
    originalSha256: hash,
    pageCount,
    fields,
    signingToken: token,
    signingExpiresAt: Timestamp.fromMillis(expiresAtMs),
    signedPdfPath: null,
    signedPdfUrl: null,
    reminderEnabled: true,
    reminderDays: 7,
    lastReminderAt: null,
    sentAt: alreadySent ? Timestamp.now() : null,
    signedAt: null,
    signedByName: null,
    signedFromIp: null,
    signedFromUserAgent: null,
    audit: [
      {
        at: Timestamp.now(),
        event: 'created',
        note: `Aus Angebot ${quote.quoteNumber} erzeugt.`,
      },
      ...(alreadySent
        ? [{ at: Timestamp.now(), event: 'sent' as const }]
        : []),
    ],
  };
  const contractId = await createContract(data);
  await updateQuote(quote.id, { contractId });
  return contractId;
}
