import { Timestamp } from 'firebase/firestore';
import type { Lead } from './types';

/**
 * Aus der API-Antwort (`/api/leads/check-website`) ein Firestore-sicheres
 * websiteCheck-Objekt bauen. Firestore lehnt undefined ab, deshalb nur
 * gesetzte Felder ins Payload aufnehmen.
 */
export function buildWebsiteCheckPayload(data: {
  lastCopyrightYear?: number;
  generator?: string;
  hasViewportMeta?: boolean;
  hasHttps?: boolean;
  reachable: boolean;
  notes?: string;
}): NonNullable<Lead['websiteCheck']> {
  const out: NonNullable<Lead['websiteCheck']> = {
    reachable: data.reachable,
    checkedAt: Timestamp.fromDate(new Date()),
  };
  if (data.lastCopyrightYear !== undefined)
    out.lastCopyrightYear = data.lastCopyrightYear;
  if (data.generator !== undefined) out.generator = data.generator;
  if (data.hasViewportMeta !== undefined)
    out.hasViewportMeta = data.hasViewportMeta;
  if (data.hasHttps !== undefined) out.hasHttps = data.hasHttps;
  if (data.notes) out.notes = data.notes;
  return out;
}

/**
 * Berechnet einen Priorisierungs-Score fuer einen Lead. Hoeher = wichtiger.
 * Kern-Idee: heisse Leads (kaltes „hat keine Website / veraltete Website"
 * + gute Bewertung + noch nicht kontaktiert) sollen oben in der Anruf-
 * Queue landen.
 *
 * Range: grob 0 bis ~250. Kein-Interesse ist harter Sinker (-999) und
 * fliegt aus der Queue.
 */
export function calcLeadScore(l: Lead): number {
  let score = 0;

  // Website-Signal (starkes Kauf-Signal)
  if (l.websiteAge === 'keine') score += 100;
  else if (l.websiteAge === 'veraltet') score += 60;
  else if (l.websiteAge === 'modern') score -= 20;

  // Qualitaet des Betriebs
  if (typeof l.rating === 'number') score += l.rating * 10;
  if (typeof l.reviewCount === 'number') {
    // Reviews sind ein Proxy fuer wirtschaftliche Groesse. Cappen bei
    // 20 Punkten (100 Reviews) — mehr sagt nichts Neues.
    score += Math.min(l.reviewCount / 5, 20);
  }

  // Kontaktbarkeit
  if (l.phone) score += 20;
  if (l.email) score += 5;

  // Status-Priorisierung
  switch (l.status) {
    case 'kalt':
      score += 30;
      break;
    case 'nicht_erreicht':
      score += 25;
      break;
    case 'interessiert':
      score += 15;
      break;
    case 'kontaktiert':
      score += 5;
      break;
    case 'termin_vereinbart':
      // Termin steht — nicht wichtig fuer Cold-Call-Queue
      score -= 50;
      break;
    case 'kein_interesse':
    case 'verloren':
    case 'gewonnen':
      score -= 999;
      break;
  }

  // Frisch versucht → runter (nicht heute nochmal anrufen)
  if (l.lastCallAttemptAt) {
    const hoursAgo =
      (Date.now() - l.lastCallAttemptAt.toMillis()) / (1000 * 60 * 60);
    if (hoursAgo < 24) score -= 40;
    else if (hoursAgo < 72) score -= 15;
  }

  return Math.round(score);
}

/**
 * Baut die priorisierte Salespilot-Queue aus einer Lead-Liste.
 * Filtert nur Leads mit Telefonnummer (sonst kein Cold-Call moeglich)
 * und mit "call-ready" Status (kalt/nicht_erreicht/kontaktiert/
 * interessiert). Sortiert nach Score absteigend.
 */
export function buildSalesQueue(leads: Lead[]): Lead[] {
  return leads
    .filter((l) => l.phone && l.phone.length >= 5)
    .filter((l) =>
      ['kalt', 'nicht_erreicht', 'kontaktiert', 'interessiert'].includes(
        l.status,
      ),
    )
    .map((l) => ({ l, score: calcLeadScore(l) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.l);
}

/**
 * Zaehlt wie viele Calls heute schon gemacht wurden (basierend auf
 * lastCallAttemptAt). Der Salespilot zeigt das gegen das 50/Tag-Ziel.
 */
export function countCallsToday(leads: Lead[]): number {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return leads.filter(
    (l) =>
      l.lastCallAttemptAt &&
      l.lastCallAttemptAt.toMillis() >= start.getTime(),
  ).length;
}

/**
 * Zaehlt Leads pro Status heute (fuer den "heute erreicht/kein
 * interesse/..."-Progress im Salespilot).
 */
export function countLeadsByStatusToday(
  leads: Lead[],
  statuses: Lead['status'][],
): number {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return leads.filter((l) => {
    if (!statuses.includes(l.status)) return false;
    if (!l.lastCallAttemptAt) return false;
    return l.lastCallAttemptAt.toMillis() >= start.getTime();
  }).length;
}
