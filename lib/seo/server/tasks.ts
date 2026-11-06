import 'server-only';
import { adminDb } from '@/lib/firebase-admin';
import { todayIso } from '../months';
import type { SeoActivity } from '../types';
import { portalBaseUrl } from './config';
import type { TaskReminderItem } from './emails';
import { COL, listSeoClients } from './store';

/**
 * Aufgaben fuer Yusuf: alle geplanten Punkte mit Termin, ueber alle
 * SEO-Kunden. Grundlage fuer die taegliche Erinnerungs-Mail.
 */

const DAY_MS = 86_400_000;

export function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((Date.parse(`${toIso}T12:00:00Z`) - Date.parse(`${fromIso}T12:00:00Z`)) / DAY_MS);
}

/**
 * Soll heute erinnert werden? 7 Tage vorher, am Vortag, am Tag selbst und
 * danach jeden Montag, bis der Punkt erledigt ist. So kommt keine Mail
 * jeden Tag, aber nichts geraet in Vergessenheit.
 */
export function shouldRemind(daysLeft: number, weekday: number): boolean {
  if (daysLeft === 7 || daysLeft === 1 || daysLeft === 0) return true;
  return daysLeft < 0 && weekday === 1;
}

export async function listOpenTasks(today = todayIso()): Promise<TaskReminderItem[]> {
  const [snap, clients] = await Promise.all([
    adminDb().collection(COL.activities).where('status', '==', 'planned').get(),
    listSeoClients(),
  ]);
  const byId = new Map(clients.map((c) => [c.customerId, c]));
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as SeoActivity)
    .filter((a) => a.dueDate && byId.get(a.customerId)?.enabled && !byId.get(a.customerId)?.demo)
    .map((a) => ({
      displayName: byId.get(a.customerId)!.displayName,
      area: a.area,
      change: a.change.replace(/\*\*(.+?)\*\*/g, '$1'),
      dueDate: a.dueDate!,
      daysLeft: daysBetween(today, a.dueDate!),
      published: a.published,
      adminLink: `${portalBaseUrl()}/dashboard/seo/${a.customerId}?tab=massnahmen`,
    }))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

/**
 * Was heute in die Mail gehoert: Gibt es mindestens einen Anlass (siehe
 * shouldRemind), gehen alle ueberfaelligen und alle in 7 Tagen faelligen
 * Punkte mit, damit die Mail den ganzen Stand zeigt.
 */
export function pickReminders(tasks: TaskReminderItem[], weekday: number): TaskReminderItem[] {
  if (!tasks.some((t) => shouldRemind(t.daysLeft, weekday))) return [];
  return tasks.filter((t) => t.daysLeft <= 7);
}
