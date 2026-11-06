import { NextResponse } from 'next/server';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { Resend } from 'resend';
import { emailLayout } from '@/lib/email-layout';
import { adminDb } from '@/lib/firebase-admin';
import {
  addDays,
  DUNNING_STAGES,
  formatDay,
  invoiceOpenAmount,
  nextWorkday,
  todayBerlin,
} from '@/lib/dunning';
import {
  loadSettings,
  sendDunningStage,
  stateFor,
  type SentResult,
} from '@/lib/dunning-server';
import type { Customer, Invoice } from '@/lib/types';
import { formatEUR } from '@/lib/utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const OWNER_TO = 'yusuf@kolac-digital.de';

interface Row {
  invoiceId: string;
  invoiceNumber: string;
  company: string;
  label: string;
  openAmount: number;
}

/**
 * Täglicher Cron (vercel.json, 7 Uhr UTC): verschickt fällige
 * Zahlungserinnerungen aus `buchhaltung@` und schickt dir danach eine
 * Sammel-Mail: was heute rausging, was am nächsten Werktag geplant ist
 * (Zeit zum Pausieren oder Zahlung erfassen), wo die letzte Frist
 * abgelaufen ist und wo eine E-Mail-Adresse fehlt.
 *
 * Schutz: CRON_SECRET als Bearer-Header, wie /api/seo/cron.
 */
export async function GET(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (expected) {
    if ((req.headers.get('authorization') ?? '') !== `Bearer ${expected}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  } else if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'CRON_SECRET nicht gesetzt.' }, { status: 500 });
  }

  const settings = await loadSettings();
  if (!settings.dunningEnabled) {
    return NextResponse.json({ ok: true, skipped: 'Automatik ist aus.' });
  }

  const db = adminDb();
  const today = todayBerlin();
  const nextDay = nextWorkday(addDays(today, 1));

  const snap = await db
    .collection('invoices')
    .where('status', 'in', ['sent', 'partially_paid', 'overdue'])
    .get();
  const invoices = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Invoice);

  const customerIds = [...new Set(invoices.map((i) => i.customerId))];
  const customers = new Map<string, Customer>();
  if (customerIds.length) {
    const refs = customerIds.map((id) => db.collection('customers').doc(id));
    for (const c of await db.getAll(...refs)) {
      if (c.exists) customers.set(c.id, { id: c.id, ...c.data() } as Customer);
    }
  }

  const sent: SentResult[] = [];
  const errors: Array<{ invoiceNumber: string; message: string }> = [];
  const upcoming: Row[] = [];
  const expired: Row[] = [];
  const missingEmail: Row[] = [];

  for (const inv of invoices) {
    const customer = customers.get(inv.customerId) ?? null;
    const state = stateFor(inv, customer, settings, today);
    const row = (label: string): Row => ({
      invoiceId: inv.id,
      invoiceNumber: inv.invoiceNumber ?? '',
      company: customer?.company ?? '',
      label,
      openAmount: invoiceOpenAmount(inv),
    });

    if (state.kind === 'scheduled' && state.day <= today) {
      try {
        sent.push(await sendDunningStage(inv.id, { trigger: 'auto' }));
      } catch (err) {
        errors.push({
          invoiceNumber: inv.invoiceNumber ?? inv.id,
          message: (err as Error).message,
        });
      }
    } else if (state.kind === 'scheduled' && state.day <= nextDay) {
      upcoming.push(row(DUNNING_STAGES[state.stage].label));
    } else if (state.kind === 'no_email' && state.day === today) {
      missingEmail.push(row(DUNNING_STAGES[state.stage].label));
    } else if (
      state.kind === 'final' &&
      state.expired &&
      !inv.dunning?.deadlineNotifiedAt
    ) {
      expired.push(
        row(`Frist ${state.deadlineDay ? formatDay(state.deadlineDay) : ''} abgelaufen`),
      );
      await db
        .collection('invoices')
        .doc(inv.id)
        .update({
          'dunning.deadlineNotifiedAt': Timestamp.now(),
          'dunning.events': FieldValue.arrayUnion({
            at: Timestamp.now(),
            type: 'deadline_expired',
          }),
        });
    }
  }

  const hasNews =
    sent.length + errors.length + upcoming.length + expired.length + missingEmail.length > 0;
  if (hasNews) {
    try {
      await sendDigest({ today, nextDay, sent, errors, upcoming, expired, missingEmail });
    } catch (err) {
      console.error('Mahnwesen: Sammel-Mail fehlgeschlagen', err);
    }
  }

  return NextResponse.json({
    ok: true,
    checked: invoices.length,
    sent: sent.length,
    upcoming: upcoming.length,
    expired: expired.length,
    errors,
  });
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function baseUrl(): string {
  if (process.env.APP_BASE_URL) return process.env.APP_BASE_URL;
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  return '';
}

async function sendDigest(d: {
  today: string;
  nextDay: string;
  sent: SentResult[];
  errors: Array<{ invoiceNumber: string; message: string }>;
  upcoming: Row[];
  expired: Row[];
  missingEmail: Row[];
}) {
  if (!process.env.RESEND_API_KEY) return;
  const base = baseUrl();
  const link = (r: Row) =>
    base
      ? `<a href="${base}/dashboard/rechnungen/${r.invoiceId}" style="color:#2563eb;">${esc(r.invoiceNumber)}</a>`
      : esc(r.invoiceNumber);

  const section = (title: string, lines: string[], hint?: string) =>
    lines.length
      ? `<h3 style="margin:20px 0 6px;font-size:15px;">${title}</h3>${hint ? `<p style="margin:0 0 6px;color:#6b7280;font-size:13px;">${hint}</p>` : ''}<ul style="margin:0;padding-left:18px;">${lines.map((l) => `<li>${l}</li>`).join('')}</ul>`
      : '';

  const rowLine = (r: Row) =>
    `${link(r)} · ${esc(r.company)} · ${esc(r.label)} · offen ${formatEUR(r.openAmount)}`;

  const html = emailLayout({
    sender: 'none',
    title: 'Zahlungserinnerungen heute',
    bodyHtml: `
    ${section(
      'Heute verschickt',
      d.sent.map(
        (s) =>
          `${esc(s.invoiceNumber)} · ${esc(s.company)} · ${esc(DUNNING_STAGES[s.stage].label)} an ${esc(s.to)}`,
      ),
    )}
    ${section(
      `Geplant für ${formatDay(d.nextDay)}`,
      d.upcoming.map(rowLine),
      'Schon bezahlt oder gibt es einen Grund? Zahlung erfassen oder die Erinnerungen pausieren, dann geht nichts raus.',
    )}
    ${section(
      'Letzte Frist abgelaufen',
      d.expired.map(rowLine),
      'Hier geht automatisch nichts mehr raus. Inkasso beauftragen oder anders klären entscheidest du.',
    )}
    ${section(
      'Keine E-Mail-Adresse beim Kunden',
      d.missingEmail.map(rowLine),
      'Diese Erinnerung konnte nicht raus. E-Mail im Kundenprofil eintragen.',
    )}
    ${section(
      'Fehler beim Versand',
      d.errors.map((e) => `${esc(e.invoiceNumber)}: ${esc(e.message)}`),
    )}`,
    button: base ? { label: 'Zahlungserinnerungen öffnen', href: `${base}/dashboard/rechnungen/mahnwesen` } : undefined,
  });

  const text = [
    d.sent.length ? `Heute verschickt: ${d.sent.length}` : '',
    d.upcoming.length ? `Geplant für ${formatDay(d.nextDay)}: ${d.upcoming.length}` : '',
    d.expired.length ? `Letzte Frist abgelaufen: ${d.expired.length}` : '',
    d.missingEmail.length ? `Ohne E-Mail-Adresse: ${d.missingEmail.length}` : '',
    d.errors.length ? `Fehler: ${d.errors.length}` : '',
    base ? `${base}/dashboard/rechnungen/mahnwesen` : '',
  ]
    .filter(Boolean)
    .join('\n');

  const parts = [
    d.sent.length ? `${d.sent.length} verschickt` : '',
    d.upcoming.length ? `${d.upcoming.length} geplant` : '',
    d.expired.length ? `${d.expired.length} Frist abgelaufen` : '',
    d.errors.length ? `${d.errors.length} Fehler` : '',
  ].filter(Boolean);

  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.emails.send({
    from: 'Kolac Digital <yusuf@kolac-digital.de>',
    to: OWNER_TO,
    subject: `Zahlungserinnerungen: ${parts.join(', ') || 'Hinweise'}`,
    html,
    text,
  });
}
