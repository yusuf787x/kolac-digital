import 'server-only';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { Resend } from 'resend';
import { adminDb } from './firebase-admin';
import {
  berlinDay,
  computeDunningState,
  dayToDate,
  deadlineForStage,
  invoiceOpenAmount,
  nextManualStage,
  sentDayByStage,
  todayBerlin,
  type DunningState,
} from './dunning';
import { buildDunningEmail } from './dunning-emails';
import { generateInvoicePdfBuffer } from './server-pdf';
import type {
  Customer,
  DunningEvent,
  DunningStage,
  Invoice,
  Settings,
} from './types';
import { invoiceGrossTotal } from './utils';

/** Ein laufender Versand blockiert weitere für diese Dauer. */
const SENDING_LOCK_MS = 10 * 60 * 1000;

export async function loadSettings(): Promise<Partial<Settings>> {
  const snap = await adminDb().collection('settings').doc('config').get();
  return (snap.data() ?? {}) as Partial<Settings>;
}

export async function loadCustomer(id: string): Promise<Customer | null> {
  const snap = await adminDb().collection('customers').doc(id).get();
  if (!snap.exists) return null;
  return { id: snap.id, ...(snap.data() as Omit<Customer, 'id'>) };
}

export function stateFor(
  invoice: Invoice,
  customer: Customer | null,
  settings: Partial<Settings>,
  today = todayBerlin(),
): DunningState {
  return computeDunningState(invoice, {
    customerEmail: customer?.email,
    startDate: settings.dunningStartDate ?? null,
    today,
  });
}

export interface SentResult {
  stage: DunningStage;
  to: string;
  subject: string;
  invoiceNumber: string;
  company: string;
}

/**
 * Verschickt die nächste Stufe für eine Rechnung.
 *
 * 'auto' (Cron): nur wenn die Automatik an ist und die Stufe laut Plan
 * heute oder früher dran ist. 'manual' (Knopf): sofort, auch bei Pause,
 * aber nur genau die erwartete Stufe (Doppelklick verschickt nicht 2 und 3).
 *
 * Zahlungsstand, Pause und Sperre werden in einer Transaktion direkt vor
 * dem Versand frisch gelesen. Wer kurz vorher eine Zahlung erfasst, stoppt
 * damit auch eine Mail, die der Cron schon eingeplant hatte.
 */
export async function sendDunningStage(
  invoiceId: string,
  opts: { trigger: 'auto' | 'manual'; expectedStage?: DunningStage },
): Promise<SentResult> {
  const db = adminDb();
  const ref = db.collection('invoices').doc(invoiceId);
  const settings = await loadSettings();
  const today = todayBerlin();

  const { invoice, customer, stage } = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new Error('Rechnung nicht gefunden.');
    const invoice = { id: snap.id, ...snap.data() } as Invoice;
    const custSnap = await tx.get(db.collection('customers').doc(invoice.customerId));
    const customer = custSnap.exists
      ? ({ id: custSnap.id, ...custSnap.data() } as Customer)
      : null;
    const state = stateFor(invoice, customer, settings, today);

    if (state.kind === 'none') {
      throw new Error(`Keine Erinnerung nötig (${state.reason}).`);
    }
    if (!customer?.email) {
      throw new Error('Beim Kunden ist keine E-Mail-Adresse hinterlegt.');
    }

    let stage: DunningStage | null;
    if (opts.trigger === 'auto') {
      if (!settings.dunningEnabled) throw new Error('Automatik ist aus.');
      if (state.kind !== 'scheduled' || state.day > today) {
        throw new Error('Stufe ist heute nicht dran.');
      }
      stage = state.stage;
    } else {
      stage = nextManualStage(invoice);
      if (!stage) throw new Error('Alle drei Stufen wurden bereits verschickt.');
    }
    if (opts.expectedStage && opts.expectedStage !== stage) {
      throw new Error(
        `Inzwischen ist Stufe ${stage} dran, nicht ${opts.expectedStage}. Bitte Seite neu laden.`,
      );
    }

    const lock = invoice.dunning?.sendingSince?.toMillis() ?? 0;
    if (lock && Date.now() - lock < SENDING_LOCK_MS) {
      throw new Error('Für diese Rechnung läuft gerade schon ein Versand.');
    }
    tx.update(ref, { 'dunning.sendingSince': Timestamp.now() });
    return { invoice, customer, stage };
  });

  try {
    const deadlineDay = deadlineForStage(stage, today);
    let attachment: { filename: string; content: Buffer } | null = null;
    try {
      const pdf = await generateInvoicePdfBuffer(invoice, customer);
      attachment = { filename: `Rechnung ${invoice.invoiceNumber}.pdf`, content: pdf };
    } catch (err) {
      // Lieber ohne Anhang als gar nicht. Die Mail enthält alle Zahlungsdaten.
      console.error('Mahnwesen: PDF konnte nicht erzeugt werden', invoiceId, err);
    }

    const mail = buildDunningEmail({
      stage,
      salutation: customer.salutation,
      lastName: customer.lastName,
      invoiceNumber: invoice.invoiceNumber!,
      invoiceDay: berlinDay(invoice.invoiceDate.toMillis()),
      dueDay: berlinDay(invoice.dueDate.toMillis()),
      sendDay: today,
      deadlineDay,
      grossTotal: invoiceGrossTotal(invoice),
      openAmount: invoiceOpenAmount(invoice),
      previousSent: sentDayByStage(invoice),
      hasAttachment: !!attachment,
    });

    if (!process.env.RESEND_API_KEY) throw new Error('RESEND_API_KEY nicht gesetzt.');
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { data, error } = await resend.emails.send({
      from: mail.from,
      to: customer.email,
      replyTo: mail.replyTo,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
      ...(attachment ? { attachments: [attachment] } : {}),
    });
    if (error) throw new Error(error.message ?? 'Resend-Fehler');

    const now = Timestamp.now();
    // Admin-Timestamps statt Client-Typ, deshalb ohne DunningEvent-Annotation.
    const event = {
      at: now,
      type: 'sent' satisfies DunningEvent['type'],
      stage,
      trigger: opts.trigger,
      to: customer.email,
      subject: mail.subject,
      openAmount: invoiceOpenAmount(invoice),
      ...(deadlineDay
        ? { deadline: Timestamp.fromDate(dayToDate(deadlineDay)) }
        : {}),
      ...(data?.id ? { resendId: data.id } : {}),
    };
    await ref.update({
      'dunning.lastStage': stage,
      'dunning.lastSentAt': now,
      'dunning.sendingSince': null,
      'dunning.events': FieldValue.arrayUnion(event),
      ...(stage === 3 && deadlineDay
        ? { 'dunning.finalDeadline': Timestamp.fromDate(dayToDate(deadlineDay)) }
        : {}),
    });

    return {
      stage,
      to: customer.email,
      subject: mail.subject,
      invoiceNumber: invoice.invoiceNumber!,
      company: customer.company,
    };
  } catch (err) {
    const failed = {
      at: Timestamp.now(),
      type: 'failed' satisfies DunningEvent['type'],
      stage,
      trigger: opts.trigger,
      note: (err as Error).message,
    };
    await ref
      .update({
        'dunning.sendingSince': null,
        'dunning.events': FieldValue.arrayUnion(failed),
      })
      .catch(() => {});
    throw err;
  }
}
