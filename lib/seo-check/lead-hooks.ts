import 'server-only';
import type { StoredLead } from './store';
import { sendMetaLead, type LeadContext } from './meta-server';

/**
 * Serverseitige Stelle nach dem ersten Freischalten eines Berichts.
 * Meldet den Lead an die Meta Conversions API, wenn der Besucher das
 * Häkchen „Erfolgsmessung an Meta“ gesetzt hat und Pixel-ID und Schlüssel
 * gesetzt sind. Läuft in after(), darf also nie die Antwort an den
 * Besucher aufhalten. Fehler werden nur protokolliert.
 */
export async function onLeadCaptured(checkId: string, lead: StoredLead, ctx: LeadContext = {}): Promise<void> {
  try {
    await sendMetaLead(checkId, lead, ctx);
  } catch (err) {
    console.error('Meta Conversions API:', err instanceof Error ? err.message : err);
  }
}
