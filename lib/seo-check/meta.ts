/**
 * Meta-Werbemessung auf den SEO-Check-Seiten. Gemeinsame Werte für Browser
 * (Pixel nach Einwilligung) und Server (Conversions API nach Häkchen).
 *
 * Einwilligung liegt im selben localStorage-Eintrag wie die übrige Auswahl
 * der Website (public/js/cookie-consent.js), im Feld „marketing“.
 */

/**
 * Pixel-ID (Datensatz-ID) aus dem Meta Events Manager. Öffentlich, steht ohnehin
 * im Seitenquelltext. Die Umgebungsvariable NEXT_PUBLIC_META_PIXEL_ID hat Vorrang.
 */
export const META_PIXEL_ID_DEFAULT = '29565092019789364';

export function metaPixelId(): string {
  return (process.env.NEXT_PUBLIC_META_PIXEL_ID || META_PIXEL_ID_DEFAULT).trim();
}

/** Gleicher Schlüssel wie public/js/cookie-consent.js. */
export const CONSENT_KEY = 'kolac_cookie_consent';

/** Browser-Ereignis, das das Einwilligungs-Banner erneut öffnet. */
export const OPEN_CONSENT_EVENT = 'kolac:open-consent';

/**
 * Gemeinsame Ereignis-ID für Pixel und Conversions API, damit Meta den Lead
 * nur einmal zählt. Ein Bericht wird höchstens einmal freigeschaltet, darum
 * reicht die Check-ID.
 */
export function leadEventId(checkId: string): string {
  return `lead-${checkId}`;
}

export type MarketingConsent = 'granted' | 'denied' | null;

export function readMarketingConsent(): MarketingConsent {
  try {
    const raw = window.localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    const m = JSON.parse(raw).marketing;
    return m === true ? 'granted' : m === false ? 'denied' : null;
  } catch {
    return null;
  }
}

export function saveMarketingConsent(granted: boolean): void {
  try {
    const raw = window.localStorage.getItem(CONSENT_KEY);
    const consent = raw ? JSON.parse(raw) : {};
    window.localStorage.setItem(
      CONSENT_KEY,
      JSON.stringify({ ...consent, essential: true, marketing: granted, timestamp: new Date().toISOString() }),
    );
  } catch {
    // Ohne localStorage gilt die Auswahl nur für diesen Seitenaufruf.
  }
}
