import { NextResponse } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import { Resend } from 'resend';
import { adminDb, adminStorage } from '@/lib/firebase-admin';
import {
  verifyWebhookSignature,
  getPayment,
  getCustomerForPayment,
  centsToEuros,
  type GcEvent,
  type GcCustomer,
  type GcPayment,
} from '@/lib/gocardless';
import { matchCustomer, type MatchResult } from '@/lib/server-customer-matching';
import { generateInvoicePdfBuffer } from '@/lib/server-pdf';
import { saveInvoiceToDrive } from '@/lib/google-drive';
import {
  buildInvoiceNumber,
  formatDateDE,
  defaultVatRateForDate,
  grossToNet,
} from '@/lib/utils';
import type { Invoice, Customer, InvoiceItem } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ADMIN_EMAIL = 'yusuf@kolac-digital.de';
const FROM_EMAIL = 'Kolac Digital <yusuf@kolac-digital.de>';

const DEFAULT_TEMPLATE = `Systempflege {monat_jahr}
inklusive Software-Updates, Wartung und Serverhosting.
DSGVO-konformes Hosting in der EU, automatische Backups, schnelle Reaktionszeiten.`;

/**
 * GoCardless Webhook-Receiver.
 *
 * Verarbeitete Events:
 *   - payments.confirmed  -> Rechnung anlegen, PDF rendern, Mail senden, Drive-Backup
 *   - payments.failed     -> Yusuf per Mail informieren (manuelle Aktion erforderlich)
 *
 * Sicherheits-Schichten:
 *   - HMAC-SHA256-Signaturpruefung mit GOCARDLESS_WEBHOOK_SECRET
 *   - Idempotenz: jede Payment-ID wird nur einmal verarbeitet
 *   - Best-effort: Fehler bei Einzel-Events stoppen das Batch nicht
 */
export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get('webhook-signature');

  if (!verifyWebhookSignature(rawBody, signature)) {
    console.warn('GoCardless webhook: invalid signature');
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 401 });
  }

  let payload: { events: GcEvent[] };
  try {
    payload = JSON.parse(rawBody) as { events: GcEvent[] };
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  const results: Array<{ id: string; action: string; status: string; note?: string }> = [];

  for (const event of payload.events ?? []) {
    let processStatus: 'ok' | 'ignored' | 'error' = 'ignored';
    let processNote: string | undefined;
    let invoiceId: string | undefined;
    let customerId: string | undefined;

    try {
      await logEvent(event);

      if (event.resource_type === 'payments' && event.action === 'confirmed') {
        const res = await handlePaymentConfirmed(event);
        processStatus = 'ok';
        processNote = res.note;
        invoiceId = res.invoiceId;
        customerId = res.customerId;
      } else if (event.resource_type === 'payments' && event.action === 'failed') {
        const res = await handlePaymentFailed(event);
        processStatus = 'ok';
        processNote = res.note;
      } else {
        processNote = `${event.resource_type}.${event.action} wird nicht verarbeitet`;
      }
    } catch (err) {
      console.error('GoCardless event error:', event.id, err);
      processStatus = 'error';
      processNote = (err as Error).message;
    }

    // Verarbeitungsergebnis zum geloggten Event hinzufuegen, damit das
    // UI im Dashboard sieht was passiert ist.
    await adminDb()
      .collection('gocardlessEvents')
      .doc(event.id)
      .set(
        {
          processStatus,
          processNote: processNote ?? null,
          processedAt: Timestamp.now(),
          invoiceId: invoiceId ?? null,
          customerId: customerId ?? null,
        },
        { merge: true },
      );

    results.push({
      id: event.id,
      action: `${event.resource_type}.${event.action}`,
      status: processStatus,
      note: processNote,
    });
  }

  return NextResponse.json({ ok: true, results });
}

// ===================================================================
// Event-Handler
// ===================================================================

interface HandlerResult {
  note: string;
  invoiceId?: string;
  customerId?: string;
}

async function handlePaymentConfirmed(event: GcEvent): Promise<HandlerResult> {
  const paymentId = event.links?.payment;
  if (!paymentId) return { note: 'kein payment-link' };

  // Idempotenz: Rechnung schon vorhanden?
  const existing = await adminDb()
    .collection('invoices')
    .where('gocardlessPaymentId', '==', paymentId)
    .limit(1)
    .get();
  if (!existing.empty) {
    return {
      note: `bereits verarbeitet (${existing.docs[0].id})`,
      invoiceId: existing.docs[0].id,
    };
  }

  const payment = await getPayment(paymentId);
  const { customer: gcCustomer } = await getCustomerForPayment(payment);
  const match = await matchCustomer(gcCustomer);

  if (match.mode !== 'hardlink' && match.mode !== 'domain') {
    await notifyMatchProblem(gcCustomer, payment, match);
    return { note: `kein eindeutiger Kunde (${match.mode})` };
  }

  const customer = await loadCustomer(match.customer!.id);
  if (!customer) {
    await notifyMatchProblem(gcCustomer, payment, match);
    return { note: 'Kunde im Dashboard nicht ladbar' };
  }

  const invoice = await createPaidInvoice(customer, payment);
  const pdfBuffer = await generateInvoicePdfBuffer(invoice, customer);

  const storagePath = `invoices/${invoice.id}.pdf`;
  const pdfUrl = await uploadInvoicePdf(storagePath, pdfBuffer);

  // Drive-Backup (gleicher Mechanismus wie manuell erstellte Rechnungen).
  let driveUrl: string | null = null;
  try {
    driveUrl = await syncToDrive(invoice, customer, pdfBuffer);
  } catch (err) {
    console.error('Drive-Backup Lastschrift-Rechnung fehlgeschlagen:', err);
  }

  await adminDb().collection('invoices').doc(invoice.id).update({
    pdfUrl,
    driveUrl,
    updatedAt: Timestamp.now(),
  });

  // Empfaenger-Reihenfolge:
  //   1. retainerInvoiceEmail (manueller Override im Dashboard)
  //   2. Mail aus dem GoCardless-Kundeneintrag
  //   3. Dashboard-Stammdaten-Mail (Fallback)
  const recipient =
    customer.retainerInvoiceEmail?.trim() ||
    gcCustomer.email?.trim() ||
    customer.email;
  // Persoenliche Ansprache: Vorname > GC-Vorname > Nachname > Firma.
  const greetingName =
    customer.firstName?.trim() ||
    gcCustomer.given_name?.trim() ||
    customer.lastName?.trim() ||
    customer.company ||
    '';
  // Mail zeigt den Brutto-Betrag (was tatsächlich abgebucht wurde),
  // nicht den Netto-Anteil von totalAmount.
  const grossAmount = centsToEuros(payment.amount);
  // GoCardless-Rechnungen werden immer sofort mit Nummer erzeugt
  // (createInvoiceWithNumber weiter unten) — hier ist die Nummer
  // garantiert vorhanden.
  const invNumber = invoice.invoiceNumber ?? 'ENTWURF';
  await sendInvoiceMail({
    to: recipient,
    customerName: greetingName,
    invoiceNumber: invNumber,
    totalAmount: grossAmount,
    chargedAt: new Date(payment.charge_date),
    pdfBuffer,
    pdfFilename: `Rechnung ${invNumber}.pdf`,
  });

  await notifyAdmin({
    subject: `✓ Lastschrift eingezogen: ${customer.company} ${formatEur(grossAmount)}`,
    html: `
      <p>Lastschrift wurde erfolgreich eingezogen, Rechnung automatisch erstellt und an den Kunden verschickt.</p>
      <ul>
        <li>Kunde: <strong>${escapeHtml(customer.company)}</strong></li>
        <li>Rechnungsnummer: <strong>${invoice.invoiceNumber}</strong></li>
        <li>Brutto eingezogen: <strong>${formatEur(grossAmount)}</strong>${invoice.vatRate ? ` (Netto ${formatEur(invoice.totalAmount)} + ${Math.round((invoice.vatRate ?? 0) * 100)} % USt)` : ''}</li>
        <li>Charge-Datum: ${formatDateDE(new Date(payment.charge_date))}</li>
        <li>Match-Modus: ${match.mode}</li>
      </ul>
      ${driveUrl ? `<p>Drive-Backup: <a href="${driveUrl}">öffnen</a></p>` : ''}
    `,
  });

  return {
    note: `Rechnung ${invoice.invoiceNumber} erstellt`,
    invoiceId: invoice.id,
    customerId: customer.id,
  };
}

async function handlePaymentFailed(event: GcEvent): Promise<HandlerResult> {
  const paymentId = event.links?.payment;
  if (!paymentId) return { note: 'kein payment-link' };
  const payment = await getPayment(paymentId);
  const { customer: gcCustomer } = await getCustomerForPayment(payment);
  const match = await matchCustomer(gcCustomer);

  const customerLabel =
    match.customer?.company ?? gcCustomer.company_name ?? gcCustomer.email;

  await notifyAdmin({
    subject: `❌ Lastschrift fehlgeschlagen: ${customerLabel}`,
    html: `
      <p>GoCardless meldet eine fehlgeschlagene Lastschrift. Manuelle Pruefung erforderlich.</p>
      <ul>
        <li>Kunde: <strong>${escapeHtml(customerLabel)}</strong></li>
        <li>Betrag: ${formatEur(centsToEuros(payment.amount))}</li>
        <li>Charge-Datum: ${formatDateDE(new Date(payment.charge_date))}</li>
        <li>Grund: ${escapeHtml(event.details?.description ?? event.details?.reason_code ?? 'unbekannt')}</li>
      </ul>
    `,
  });
  return { note: 'Yusuf per Mail informiert', customerId: match.customer?.id };
}

// ===================================================================
// Helpers
// ===================================================================

async function logEvent(event: GcEvent) {
  await adminDb()
    .collection('gocardlessEvents')
    .doc(event.id)
    .set({
      ...event,
      receivedAt: Timestamp.now(),
    });
}

async function notifyMatchProblem(
  gcCustomer: GcCustomer,
  payment: GcPayment,
  match: MatchResult,
) {
  const candidates = match.candidates
    ?.map((c) => `${c.company} (${c.email})`)
    .join(', ');
  await notifyAdmin({
    subject: `⚠️ Lastschrift eingezogen, Kunde unklar: ${gcCustomer.company_name ?? gcCustomer.email}`,
    html: `
      <p>GoCardless hat eine Lastschrift eingezogen, aber der zugehoerige Dashboard-Kunde konnte nicht eindeutig zugeordnet werden.</p>
      <ul>
        <li>GoCardless-Kunde: <strong>${escapeHtml(gcCustomer.company_name ?? '')} (${escapeHtml(gcCustomer.email)})</strong></li>
        <li>GoCardless-Customer-ID: <code>${gcCustomer.id}</code></li>
        <li>Betrag: ${formatEur(centsToEuros(payment.amount))}</li>
        <li>Match-Status: <strong>${match.mode}</strong></li>
        ${candidates ? `<li>Kandidaten: ${escapeHtml(candidates)}</li>` : ''}
      </ul>
      <p><strong>Aktion noetig:</strong> trage im Dashboard auf dem richtigen Kunden die GoCardless-Customer-ID <code>${gcCustomer.id}</code> ein. Beim naechsten Webhook-Replay wird die Rechnung automatisch angelegt.</p>
    `,
  });
}

async function loadCustomer(customerId: string): Promise<Customer | null> {
  const snap = await adminDb().collection('customers').doc(customerId).get();
  if (!snap.exists) return null;
  const data = snap.data() as Omit<Customer, 'id'>;
  return { id: snap.id, ...data };
}

async function createPaidInvoice(
  customer: Customer,
  payment: GcPayment,
): Promise<Invoice> {
  const db = adminDb();
  const settingsRef = db.collection('settings').doc('config');
  const newRef = db.collection('invoices').doc();
  const chargedAt = new Date(payment.charge_date);
  // GoCardless zieht den Brutto-Betrag ein. Je nach Charge-Datum
  // entweder mit 0% (Kleinunternehmer bis 30.06.26) oder 19% USt.
  const vatRate = defaultVatRateForDate(chargedAt);
  const gross = centsToEuros(payment.amount);
  const split = grossToNet(gross, vatRate);
  // totalAmount auf Rechnungen ist immer NETTO (Item-Sum); Brutto wird
  // beim Anzeigen aus totalAmount * (1 + vatRate) berechnet.
  const totalAmount = split.net;

  // Atomare Nummernvergabe — gleicher Counter wie manuelle Rechnungen.
  const invoiceNumber = await db.runTransaction(async (tx) => {
    const settingsSnap = await tx.get(settingsRef);
    const current = settingsSnap.exists
      ? ((settingsSnap.data()?.nextInvoiceNumber as number | undefined) ?? 1218)
      : 1218;
    const number = buildInvoiceNumber(current, chargedAt);
    tx.set(settingsRef, { nextInvoiceNumber: current + 1 }, { merge: true });
    return number;
  });

  const template =
    customer.retainerInvoiceTemplate?.trim() || DEFAULT_TEMPLATE;
  const description = renderTemplate(template, {
    monat: monthNameDE(chargedAt),
    jahr: String(chargedAt.getFullYear()),
    monat_jahr: `${monthNameDE(chargedAt)} ${chargedAt.getFullYear()}`,
    kunde_firma: customer.company || '',
    betrag: formatEur(totalAmount),
  });

  const items: InvoiceItem[] = [
    {
      position: 1,
      description,
      quantity: 1,
      unitPrice: totalAmount,
      totalPrice: totalAmount,
    },
  ];

  // Lastschrift-Hinweis kommt aus dem PDF-Template selbst (mit Datum).
  // Hier nur die Gruss-Formel.
  const closingText = 'Vielen Dank und liebe Grüße\nYusuf Kolac';

  // Ist-Versteuerung: Zahlungseingang ist der GoCardless-Charge-Tag.
  // paidAmount (brutto) + payments-Array werden konsistent gepflegt.
  const bruttoAmount =
    Math.round(totalAmount * (1 + vatRate) * 100) / 100;
  const invoiceDoc = {
    customerId: customer.id,
    invoiceNumber,
    invoiceDate: Timestamp.fromDate(chargedAt),
    dueDate: Timestamp.fromDate(chargedAt),
    status: 'paid' as const,
    paidAmount: bruttoAmount,
    totalAmount,
    vatRate,
    closingText,
    pdfUrl: null,
    driveUrl: null,
    sentAt: Timestamp.now(),
    paidAt: Timestamp.fromDate(chargedAt),
    payments: [
      {
        paidAt: Timestamp.fromDate(chargedAt),
        amount: bruttoAmount,
        note: 'GoCardless-Lastschrift',
      },
    ],
    items,
    gocardlessPaymentId: payment.id,
    gocardlessChargedAt: Timestamp.fromDate(chargedAt),
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };
  await newRef.set(invoiceDoc);
  return { id: newRef.id, ...invoiceDoc } as unknown as Invoice;
}

async function uploadInvoicePdf(
  path: string,
  pdfBuffer: Buffer,
): Promise<string> {
  const bucket = adminStorage().bucket();
  const file = bucket.file(path);
  await file.save(pdfBuffer, {
    contentType: 'application/pdf',
    resumable: false,
    metadata: { cacheControl: 'private, max-age=0, no-store' },
  });
  const token = randomToken();
  await file.setMetadata({
    metadata: { firebaseStorageDownloadTokens: token },
  });
  const bucketName = bucket.name;
  return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;
}

async function syncToDrive(
  invoice: Invoice,
  customer: Customer,
  pdfBuffer: Buffer,
): Promise<string | null> {
  const authSnap = await adminDb()
    .collection('settings')
    .doc('google_auth')
    .get();
  if (!authSnap.exists) return null;
  const refreshToken = authSnap.data()?.refreshToken as string | undefined;
  if (!refreshToken) return null;

  const filename = `Rechnung ${invoice.invoiceNumber} ${cleanForFilename(customer.company || customer.lastName || 'Kunde')}.pdf`;
  const pdfBase64 = pdfBuffer.toString('base64');

  // Wie manuell erstellte Rechnungen: in den Einnahmen-Drive-Ordner +
  // Eintrag in die Buchhaltungs-Tabelle (chronologisch).
  const leistung =
    invoice.items?.map((i) => i.description.split('\n')[0]).join('; ') ||
    'Lastschrift-Retainer';

  const { webViewLink } = await saveInvoiceToDrive({
    refreshToken,
    pdfBase64,
    filename,
    date: formatDateDE(invoice.invoiceDate.toDate()),
    customerName: customer.company || customer.lastName || '—',
    invoiceNumber: invoice.invoiceNumber ?? 'ENTWURF',
    leistung,
    amount: invoice.totalAmount,
  });
  return webViewLink;
}

async function sendInvoiceMail(opts: {
  to: string;
  customerName: string;
  invoiceNumber: string;
  totalAmount: number;
  chargedAt: Date;
  pdfBuffer: Buffer;
  pdfFilename: string;
}) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY ist nicht gesetzt.');
  }
  const resend = new Resend(process.env.RESEND_API_KEY);
  const html = `
    <div style="font-family:-apple-system,sans-serif;color:#0a0a0a;line-height:1.6;font-size:15px;">
      <p>Hallo ${escapeHtml(opts.customerName)},</p>
      <p>danke für die laufende Zusammenarbeit. Im Anhang findest du die Rechnung
      <strong>${opts.invoiceNumber}</strong> über <strong>${formatEur(opts.totalAmount)}</strong>.</p>
      <p>Der Betrag wurde am <strong>${formatDateDE(opts.chargedAt)}</strong> per
      SEPA-Lastschrift von deinem hinterlegten Konto eingezogen — du musst nichts
      weiter tun.</p>
      <p>Bei Rückfragen einfach kurz Bescheid geben.</p>
      <p>Liebe Grüße<br/>Yusuf Kolac<br/>Kolac Digital</p>
    </div>
  `;
  const text = [
    `Hallo ${opts.customerName},`,
    '',
    `danke für die laufende Zusammenarbeit. Im Anhang findest du die Rechnung ${opts.invoiceNumber} über ${formatEur(opts.totalAmount)}.`,
    '',
    `Der Betrag wurde am ${formatDateDE(opts.chargedAt)} per SEPA-Lastschrift eingezogen — du musst nichts weiter tun.`,
    '',
    'Bei Rückfragen einfach kurz Bescheid geben.',
    '',
    'Liebe Grüße',
    'Yusuf Kolac',
    'Kolac Digital',
  ].join('\n');

  const result = await resend.emails.send({
    from: FROM_EMAIL,
    to: opts.to,
    replyTo: 'yusuf@kolac-digital.de',
    subject: `Rechnung ${opts.invoiceNumber} – Lastschrift eingezogen`,
    html,
    text,
    attachments: [
      {
        filename: opts.pdfFilename,
        content: opts.pdfBuffer,
      },
    ],
  });

  // Resend wirft NICHT bei API-Fehlern (z.B. unverifizierte Domain,
  // Domain-Selbstversand etc.) — der Fehler steht im result.error.
  // Sichtbar machen, damit das nicht im Verborgenen verloren geht.
  if (result.error) {
    throw new Error(
      `Resend Mail an ${opts.to} fehlgeschlagen: ${result.error.message ?? JSON.stringify(result.error)}`,
    );
  }
}

async function notifyAdmin(opts: { subject: string; html: string }) {
  if (!process.env.RESEND_API_KEY) return;
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: FROM_EMAIL,
      to: ADMIN_EMAIL,
      subject: opts.subject,
      html: `<div style="font-family:-apple-system,sans-serif;color:#0a0a0a;line-height:1.6;font-size:15px;">${opts.html}</div>`,
    });
  } catch (err) {
    console.error('Admin-Notification fehlgeschlagen:', err);
  }
}

function renderTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? `{${key}}`);
}

function monthNameDE(d: Date): string {
  return d.toLocaleString('de-DE', { month: 'long' });
}

function formatEur(amount: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function cleanForFilename(s: string): string {
  return (s || '').replace(/[^a-zA-Z0-9äöüÄÖÜß\-_ ]/g, '').trim();
}

function randomToken(): string {
  const bytes = new Uint8Array(16);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function escapeHtml(s: string): string {
  return (s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
