/**
 * Zaehlung im Ratgeber.
 *
 * Bewusst ohne Cookies, ohne IP-Speicherung und ohne Kennung pro
 * Besucher. Gezaehlt werden nur Summen: Aufrufe, gelesene Artikel,
 * Daumen hoch/runter, Klicks auf die Handlungsaufforderung, Herkunft
 * als grobe Gruppe und Suchbegriffe. Damit laesst sich auswerten,
 * welche Beitraege funktionieren, ohne einzelne Menschen zu verfolgen.
 *
 * Wer selbst nicht mitgezaehlt werden will (Yusuf beim Korrekturlesen),
 * setzt im Dashboard unter Blog > Statistik den Schalter fuer diesen
 * Browser. Der setzt nur einen localStorage-Eintrag.
 */

export const NO_TRACK_KEY = 'kd-blog-no-track';

/** Grobe Herkunft eines Aufrufs. Nie die volle Adresse. */
export type BlogReferrer =
  | 'google'
  | 'ki'
  | 'suche'
  | 'social'
  | 'intern'
  | 'direkt'
  | 'andere';

export const REFERRER_LABELS: Record<BlogReferrer, string> = {
  google: 'Google',
  ki: 'KI-Assistenten',
  suche: 'Andere Suchmaschinen',
  social: 'Social Media',
  intern: 'Eigene Seite',
  direkt: 'Direkt / Lesezeichen',
  andere: 'Andere Seiten',
};

export type BlogTrackEvent =
  | { type: 'index_view'; ref: BlogReferrer }
  | { type: 'view'; postId: string; ref: BlogReferrer }
  | { type: 'read'; postId: string }
  | { type: 'helpful'; postId: string; value: 'yes' | 'no' }
  | { type: 'cta'; postId: string }
  | { type: 'search'; term: string; results: number }
  | { type: 'category'; category: string };

/** Ordnet den Referrer einer groben Gruppe zu. */
export function classifyReferrer(referrer: string, ownHost: string): BlogReferrer {
  if (!referrer) return 'direkt';
  let host = '';
  try {
    host = new URL(referrer).hostname.replace(/^www\./, '');
  } catch {
    return 'andere';
  }
  if (host === ownHost.replace(/^www\./, '')) return 'intern';
  if (/(^|\.)google\./.test(host)) return 'google';
  if (
    /(chatgpt\.com|openai\.com|perplexity\.ai|copilot\.microsoft\.com|gemini\.google\.com|claude\.ai|you\.com|phind\.com)$/.test(
      host,
    )
  ) {
    return 'ki';
  }
  if (/(bing\.com|duckduckgo\.com|ecosia\.org|yahoo\.|startpage\.com|qwant\.com)/.test(host)) {
    return 'suche';
  }
  if (
    /(facebook\.com|instagram\.com|linkedin\.com|lnkd\.in|t\.co|x\.com|twitter\.com|whatsapp\.com|xing\.com|tiktok\.com|youtube\.com)$/.test(
      host,
    )
  ) {
    return 'social';
  }
  return 'andere';
}

/**
 * Normalisiert Text fuer die Suche und als Schluessel fuer
 * Suchbegriffe: klein, Umlaute ausgeschrieben, nur Buchstaben,
 * Ziffern und einfache Leerzeichen. "Gebäude" findet so auch
 * "gebaeude" und umgekehrt.
 */
export function normalizeSearch(s: string): string {
  return s
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Noch groeber fuer den Vergleich: "Gebäude", "Gebaeude" und
 * "Gebaude" werden alle zu "gebaude". Nur zum Abgleichen, nicht zum
 * Anzeigen oder Speichern.
 */
export function foldSearch(s: string): string {
  return normalizeSearch(s)
    .replace(/ae/g, 'a')
    .replace(/oe/g, 'o')
    .replace(/ue/g, 'u');
}

/** Schickt ein Ereignis ab. Fehler werden still geschluckt. */
export function trackBlog(event: BlogTrackEvent): void {
  if (typeof window === 'undefined') return;
  try {
    if (window.localStorage.getItem(NO_TRACK_KEY) === '1') return;
  } catch {
    // Kein Zugriff auf localStorage: ganz normal weiterzaehlen.
  }
  const body = JSON.stringify(event);
  try {
    // sendBeacon ueberlebt auch das Verlassen der Seite, z.B. beim
    // Klick auf den Termin-Link. text/plain vermeidet eine CORS-Vorabfrage.
    if (navigator.sendBeacon?.('/api/blog/track', new Blob([body], { type: 'text/plain' }))) {
      return;
    }
  } catch {
    // Faellt auf fetch zurueck.
  }
  fetch('/api/blog/track', {
    method: 'POST',
    body,
    keepalive: true,
    headers: { 'Content-Type': 'text/plain' },
  }).catch(() => {});
}
