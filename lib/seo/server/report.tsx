import 'server-only';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pdf } from '@react-pdf/renderer';
import { Timestamp } from 'firebase-admin/firestore';
import SeoReportPdf from '@/components/seo/SeoReportPdf';
import { adminStorage } from '@/lib/firebase-admin';
import { listActiveAccessEmails } from '@/lib/portal/access';
import { suggestAssessment } from '../assessment';
import { formatMonthDE } from '../months';
import type { SeoClient, SeoMonth } from '../types';
import type { PortalData } from '../view';
import { portalBaseUrl } from './config';
import { sendReportReleasedEmail } from './emails';
import { getReport, loadPortalData, upsertReport } from './store';

/**
 * Monatsbericht: Entwurf erzeugen, als PDF ablegen, freigeben.
 * PDF-Pfad im Storage: seo-reports/{customerId}/{YYYY-MM}.pdf
 * Das PDF ist nicht oeffentlich. Ausgeliefert wird es nur ueber
 * /api/portal/report/[month] (Session) bzw. /api/seo/report/pdf (Admin).
 */

export const reportStoragePath = (customerId: string, month: SeoMonth) =>
  `seo-reports/${customerId}/${month}.pdf`;

async function logoSource(): Promise<string | { data: Buffer; format: 'png' }> {
  try {
    const data = await readFile(path.join(process.cwd(), 'public', 'images', 'Logo Lang Schwarz.png'));
    return { data, format: 'png' };
  } catch {
    return `${portalBaseUrl()}/images/Logo%20Lang%20Schwarz.png`;
  }
}

async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks);
}

export async function renderReportPdf(data: PortalData, draft: boolean): Promise<Buffer> {
  const instance = pdf(<SeoReportPdf data={data} logoSrc={await logoSource()} draft={draft} />);
  const stream = await instance.toBuffer();
  return streamToBuffer(stream as unknown as NodeJS.ReadableStream);
}

/**
 * Legt den Bericht als Entwurf an (oder aktualisiert ihn) und erzeugt das
 * PDF neu. Eine bereits geschriebene Einschaetzung bleibt erhalten, nur
 * wenn sie leer ist, wird ein Vorschlag eingesetzt.
 */
export async function generateReport(
  client: SeoClient,
  month: SeoMonth,
  opts: { resetAssessment?: boolean } = {},
): Promise<{ assessment: string; storagePath: string }> {
  const existing = await getReport(client.customerId, month);
  let data = await loadPortalData(client, month, true);
  if (data.month !== month || !data.kpis) {
    throw new Error(`Für ${formatMonthDE(month)} liegen keine Zahlen vor. Bitte zuerst die Daten abrufen.`);
  }

  let assessment = existing?.assessment ?? '';
  if (!assessment.trim() || opts.resetAssessment) {
    assessment = suggestAssessment(data);
  }
  await upsertReport(client.customerId, month, { assessment });
  data = { ...data, report: { ...(data.report ?? { month, status: 'draft', releasedAt: null, hasPdf: false }), assessment } };

  const status = existing?.status ?? 'draft';
  const buffer = await renderReportPdf(data, status !== 'released');
  const storagePath = reportStoragePath(client.customerId, month);
  await adminStorage()
    .bucket()
    .file(storagePath)
    .save(buffer, { contentType: 'application/pdf', resumable: false });
  await upsertReport(client.customerId, month, { storagePath, pdfGeneratedAt: Timestamp.now() });
  return { assessment, storagePath };
}

/**
 * Freigabe: PDF ohne Entwurfs-Hinweis neu erzeugen, Status setzen und
 * allen aktiven Portal-Adressen des Kunden eine Mail schicken.
 */
export async function releaseReport(
  client: SeoClient,
  month: SeoMonth,
): Promise<{ sentTo: string[] }> {
  const existing = await getReport(client.customerId, month);
  if (!existing) throw new Error('Bericht existiert noch nicht. Bitte zuerst erzeugen.');
  if (!existing.assessment?.trim()) throw new Error('Bitte vor der Freigabe eine Einschätzung eintragen.');

  await upsertReport(client.customerId, month, { status: 'released', releasedAt: Timestamp.now() });
  try {
    await generateReport(client, month);
  } catch (err) {
    // Freigabe zuruecknehmen, wenn das PDF nicht erzeugt werden konnte
    await upsertReport(client.customerId, month, { status: 'draft', releasedAt: null });
    throw err;
  }

  const recipients = await listActiveAccessEmails(client.customerId);
  // Einzeln senden, damit sich die Empfaenger nicht gegenseitig sehen
  for (const to of recipients) {
    await sendReportReleasedEmail({
      to: [to],
      displayName: client.displayName,
      monthLabel: formatMonthDE(month),
      portalLink: `${portalBaseUrl()}/portal?monat=${month}`,
      assessment: existing.assessment,
    });
  }
  await upsertReport(client.customerId, month, { sentTo: recipients });
  return { sentTo: recipients };
}
