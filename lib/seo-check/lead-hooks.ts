import 'server-only';
import type { StoredLead } from './store';

/**
 * Serverseitige Stelle nach dem ersten Freischalten eines Berichts. Hier
 * kann später ein Lead-Ereignis an Werbeplattformen gehen (z. B. Meta
 * Conversions API), sobald Einwilligung und Rechtslage geklärt sind.
 * Läuft in after(), darf also nie die Antwort an den Besucher aufhalten.
 */
export async function onLeadCaptured(_checkId: string, _lead: StoredLead): Promise<void> {
  // Absichtlich leer.
}
