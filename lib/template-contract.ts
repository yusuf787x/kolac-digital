'use client';

import type { Customer } from './types';
import type { ContractAttachment } from '@/components/contract/TemplateContractPdf';

interface BuildInput {
  title: string;
  subtitle?: string;
  customer: Customer;
  bodyText: string;
  attachments: ContractAttachment[];
}

interface BuildResult {
  blob: Blob;
  pageCount: number;
  /**
   * Seite, auf der der Signaturblock steht. Bei Vertraegen ohne Anlagen
   * = pageCount. Bei Vertraegen mit Anlagen wird der Hauptteil ohne
   * Anlagen ein zweites Mal gerendert, um die Signatur-Seite exakt zu
   * bestimmen (Anlagen koennen jeweils >1 Seite belegen — reine
   * Substraktion `pageCount - attachments.length` waere ungenau).
   */
  signaturePage: number;
}

/**
 * Rendert das Template-PDF und bestimmt die Signatur-Seite.
 * Doppel-Render nur bei Anlagen (sonst waer's Verschwendung).
 */
export async function buildTemplateContractPdf(
  input: BuildInput,
): Promise<BuildResult> {
  const { generateTemplateContractBlob } = await import('./pdf-generator');
  const { PDFDocument } = await import('pdf-lib');

  const validAttachments = input.attachments.filter(
    (a) => a.title.trim() || a.body.trim(),
  );

  // Finales PDF (mit Anlagen).
  const blob = await generateTemplateContractBlob({
    title: input.title,
    subtitle: input.subtitle,
    customer: input.customer,
    bodyText: input.bodyText,
    attachments: validAttachments,
  });
  const buf = await blob.arrayBuffer();
  const doc = await PDFDocument.load(buf);
  const pageCount = doc.getPageCount();

  let signaturePage = pageCount;
  if (validAttachments.length > 0) {
    // Zweiter Render nur mit Hauptteil, um die Signatur-Seite zu
    // bestimmen (letzte Seite des Hauptteils).
    const mainBlob = await generateTemplateContractBlob({
      title: input.title,
      subtitle: input.subtitle,
      customer: input.customer,
      bodyText: input.bodyText,
      attachments: [],
    });
    const mainBuf = await mainBlob.arrayBuffer();
    const mainDoc = await PDFDocument.load(mainBuf);
    signaturePage = mainDoc.getPageCount();
  }

  return { blob, pageCount, signaturePage };
}
