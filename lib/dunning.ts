import type {
  DunningEvent,
  DunningStage,
  Invoice,
  InvoiceDunning,
} from './types';
import { effectivePayments, invoiceGrossTotal } from './utils';
import { ACCOUNTING_FROM, ACCOUNTING_REPLY_TO } from './email-layout';

/**
 * Zahlungserinnerungen (Mahnwesen). Reine Logik ohne Firebase, damit
 * Cron (Admin-SDK) und Dashboard (Client-SDK) denselben Zeitplan sehen.
 *
 * Ablauf ab Fälligkeit (Tag 0):
 *   Stufe 1  Tag 0   Zahlungserinnerung, freundlich
 *   Stufe 2  Tag 5   Mahnung mit Frist 7 Tage
 *   Stufe 3  Tag 14  Letzte Mahnung mit Frist 7 Tage, Inkasso angekündigt
 * Nach Ablauf der letzten Frist geht nichts mehr an den Kunden, nur ein
 * Hinweis an den Inhaber. Inkasso wird nie automatisch beauftragt.
 *
 * Alle Tage sind Kalendertage in Europe/Berlin als 'YYYY-MM-DD'. Fällt
 * ein Versandtag aufs Wochenende, rückt er auf den Montag.
 */

export const DUNNING_STAGES: Record<
  DunningStage,
  { label: string; offsetDays: number; deadlineDays: number | null }
> = {
  1: { label: 'Zahlungserinnerung', offsetDays: 0, deadlineDays: null },
  2: { label: 'Mahnung', offsetDays: 5, deadlineDays: 7 },
  3: { label: 'Letzte Mahnung', offsetDays: 14, deadlineDays: 7 },
};

export const DUNNING_FROM = ACCOUNTING_FROM;
export const DUNNING_REPLY_TO = ACCOUNTING_REPLY_TO;

type Ts = { toMillis(): number };

const TZ = 'Europe/Berlin';
const dayFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export function berlinDay(ms: number): string {
  return dayFormat.format(new Date(ms));
}

export function todayBerlin(): string {
  return berlinDay(Date.now());
}

export function addDays(day: string, n: number): string {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Samstag/Sonntag auf den folgenden Montag schieben. */
export function nextWorkday(day: string): string {
  const wd = new Date(`${day}T12:00:00Z`).getUTCDay();
  if (wd === 6) return addDays(day, 2);
  if (wd === 0) return addDays(day, 1);
  return day;
}

/** Mittag des Tages als Date, zum Speichern als Timestamp. */
export function dayToDate(day: string): Date {
  return new Date(`${day}T12:00:00Z`);
}

/** 'YYYY-MM-DD' → 'DD.MM.YYYY' */
export function formatDay(day: string): string {
  const [y, m, d] = day.split('-');
  return `${d}.${m}.${y}`;
}

function maxDay(a: string, b: string | null): string {
  return b && b > a ? b : a;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

type DunningInvoice = Pick<
  Invoice,
  | 'invoiceNumber'
  | 'status'
  | 'dueDate'
  | 'items'
  | 'totalAmount'
  | 'vatRate'
  | 'payments'
  | 'paidAt'
  | 'paidAmount'
  | 'gocardlessPaymentId'
> & { invoiceDate: Ts; dunning?: InvoiceDunning };

/** Offener Betrag brutto, abgeleitet aus der Zahlungshistorie. */
export function invoiceOpenAmount(inv: DunningInvoice): number {
  const paid = effectivePayments(inv).reduce((s, p) => s + p.amount, 0);
  return round2(invoiceGrossTotal(inv) - paid);
}

export type DunningState =
  /** Kein Fall fürs Mahnwesen (Entwurf, bezahlt, Lastschrift). */
  | { kind: 'none'; reason: string }
  /** Vor Start der Automatik gestellt, läuft nur nach „Starten“. */
  | { kind: 'legacy'; dueDay: string }
  | {
      kind: 'paused';
      nextStage: DunningStage;
      until: string | null;
      reason: string;
    }
  /** Nächste Stufe steht an. `day` kann in der Vergangenheit liegen (nachholen). */
  | { kind: 'scheduled'; stage: DunningStage; day: string }
  /** Wie scheduled, aber beim Kunden ist keine E-Mail hinterlegt. */
  | { kind: 'no_email'; stage: DunningStage; day: string }
  /** Alle drei Stufen raus. Ab `expired` ist Inkasso deine Entscheidung. */
  | { kind: 'final'; deadlineDay: string | null; expired: boolean };

export function computeDunningState(
  inv: DunningInvoice,
  opts: {
    customerEmail: string | null | undefined;
    /** settings.dunningStartDate. Fehlt er: heute (Vorschau vor dem Einschalten). */
    startDate?: Ts | null;
    today?: string;
  },
): DunningState {
  const today = opts.today ?? todayBerlin();
  if (!inv.invoiceNumber || inv.status === 'draft') {
    return { kind: 'none', reason: 'Entwurf' };
  }
  if (inv.gocardlessPaymentId) {
    return { kind: 'none', reason: 'Lastschrift' };
  }
  if (inv.status === 'paid' || invoiceOpenAmount(inv) <= 0.01) {
    return { kind: 'none', reason: 'Bezahlt' };
  }

  const d = inv.dunning ?? {};
  const dueDay = berlinDay(inv.dueDate.toMillis());
  const last = d.lastStage ?? 0;

  if (last >= 3) {
    const deadlineDay = d.finalDeadline
      ? berlinDay(d.finalDeadline.toMillis())
      : null;
    return {
      kind: 'final',
      deadlineDay,
      expired: deadlineDay ? today > deadlineDay : false,
    };
  }

  // Nur Rechnungen, die ab dem Einschalten gestellt wurden, laufen von
  // allein mit. Bereits offene bleiben unberührt, bis du sie startest.
  const startDay = opts.startDate ? berlinDay(opts.startDate.toMillis()) : today;
  const invoiceDay = berlinDay(inv.invoiceDate.toMillis());
  if (last === 0 && !d.startedAt && invoiceDay < startDay) {
    return { kind: 'legacy', dueDay };
  }

  const stage = (last + 1) as DunningStage;
  const untilDay = d.pausedUntil ? berlinDay(d.pausedUntil.toMillis()) : null;
  if (d.paused && (untilDay === null || today <= untilDay)) {
    return {
      kind: 'paused',
      nextStage: stage,
      until: untilDay,
      reason: d.pausedReason ?? '',
    };
  }

  const day = plannedDay(d, stage, dueDay, untilDay);
  if (!opts.customerEmail) return { kind: 'no_email', stage, day };
  return { kind: 'scheduled', stage, day };
}

function plannedDay(
  d: InvoiceDunning,
  stage: DunningStage,
  dueDay: string,
  pausedUntilDay: string | null,
): string {
  const anchor = d.startedAt ? berlinDay(d.startedAt.toMillis()) : dueDay;
  let day = addDays(anchor, DUNNING_STAGES[stage].offsetDays);

  // Abstand zur vorigen Mail halten, auch wenn die verspätet rausging.
  if (stage > 1 && d.lastSentAt) {
    const gap =
      DUNNING_STAGES[stage].offsetDays -
      DUNNING_STAGES[(stage - 1) as DunningStage].offsetDays;
    day = maxDay(day, addDays(berlinDay(d.lastSentAt.toMillis()), gap));
  }
  // Nach einer Pause frühestens am Folgetag, damit du noch reagieren kannst.
  if (d.resumedAt) {
    day = maxDay(day, addDays(berlinDay(d.resumedAt.toMillis()), 1));
  }
  if (d.paused && pausedUntilDay) {
    day = maxDay(day, addDays(pausedUntilDay, 1));
  }
  return nextWorkday(day);
}

/** Frist, die in der Mail der Stufe genannt wird. */
export function deadlineForStage(
  stage: DunningStage,
  sentDay: string,
): string | null {
  const days = DUNNING_STAGES[stage].deadlineDays;
  return days === null ? null : nextWorkday(addDays(sentDay, days));
}

/** Nächste Stufe, die ein Klick auf „Jetzt senden“ verschicken würde. */
export function nextManualStage(inv: DunningInvoice): DunningStage | null {
  const last = inv.dunning?.lastStage ?? 0;
  return last >= 3 ? null : ((last + 1) as DunningStage);
}

export function sentEvents(inv: DunningInvoice): DunningEvent[] {
  return (inv.dunning?.events ?? []).filter((e) => e.type === 'sent');
}

/** Versanddatum je Stufe (letzter erfolgreicher Versand). */
export function sentDayByStage(
  inv: DunningInvoice,
): Partial<Record<DunningStage, string>> {
  const out: Partial<Record<DunningStage, string>> = {};
  for (const e of sentEvents(inv)) {
    if (e.stage) out[e.stage] = berlinDay(e.at.toMillis());
  }
  return out;
}
