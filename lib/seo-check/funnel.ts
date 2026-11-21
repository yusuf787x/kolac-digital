/**
 * Werbe-Funnel rund um den SEO-Check: Branchen-Varianten der Seite,
 * Auswahlfelder im Freischalt-Formular, Herkunft aus Anzeigen und das
 * Verkaufsvideo auf der Ergebnis-Seite. Von Server und Client genutzt.
 */

export type Branche = 'autohaus' | 'werkstatt' | 'aufbereitung' | 'makler' | 'andere';
export type WebsiteAlter = 'unter-1' | '1-3' | 'laenger';

export const BRANCHEN: { value: Branche; label: string }[] = [
  { value: 'autohaus', label: 'Autohaus' },
  { value: 'werkstatt', label: 'Werkstatt' },
  { value: 'aufbereitung', label: 'Fahrzeugaufbereitung' },
  { value: 'makler', label: 'Immobilienmakler' },
  { value: 'andere', label: 'Andere Branche' },
];

export const WEBSITE_ALTER: { value: WebsiteAlter; label: string }[] = [
  { value: 'unter-1', label: 'Unter 1 Jahr' },
  { value: '1-3', label: '1 bis 3 Jahre' },
  { value: 'laenger', label: 'Länger' },
];

export function brancheLabel(v?: string): string {
  return BRANCHEN.find((b) => b.value === v)?.label ?? 'nicht angegeben';
}

export function websiteAlterLabel(v?: string): string {
  return WEBSITE_ALTER.find((b) => b.value === v)?.label ?? 'nicht angegeben';
}

/**
 * Verkaufsvideo (VSL) unter dem freigeschalteten Ergebnis. Nur eine selbst
 * gehostete Videodatei (mp4 oder webm), damit keine fremden Cookies laden.
 * Leer = der Video-Block wird nicht angezeigt.
 */
export const VSL_VIDEO_URL = '';

/** Herkunft eines Besuchers aus einer Anzeige (aus der URL, kein Cookie). */
export interface LeadSource {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  fbclid?: string;
  /** Seite, auf der der Check gestartet wurde, z. B. /seo-check/werkstatt. */
  landing?: string;
}

const SOURCE_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'fbclid', 'landing'] as const;

/** Nimmt nur bekannte Felder als kurze Texte an. Leer = undefined. */
export function cleanSource(raw: unknown): LeadSource | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const out: LeadSource = {};
  for (const k of SOURCE_KEYS) {
    const v = (raw as Record<string, unknown>)[k];
    if (typeof v === 'string' && v.trim()) out[k] = v.trim().slice(0, 200);
  }
  return Object.keys(out).length ? out : undefined;
}

export interface FunnelVariant {
  slug: string;
  /** Kleine Zeile über der Überschrift. */
  eyebrow: string;
  title: string;
  subline: string;
  defaultBranche: Branche;
  metaTitle: string;
  metaDescription: string;
  closingTitle: string;
  closingText: string;
}

const SUBLINE =
  'Gib deine Adresse ein. In rund 30 Sekunden siehst du, für welche Suchbegriffe Google deine Website zeigt und was du als Erstes verbessern solltest.';
const CLOSING_TEXT =
  'Von der Website bis zur Sichtbarkeit bei Google: Wir gehen dein Ergebnis gemeinsam durch und prüfen, ob wir dir helfen können. Kostenlos und unverbindlich.';

export const FUNNEL_VARIANTS: Record<string, FunnelVariant> = {
  werkstatt: {
    slug: 'werkstatt',
    eyebrow: 'Kostenloser Website-Check für Kfz-Betriebe',
    title: 'Werkstätten in OWL: Findet Google deine Website?',
    subline: SUBLINE,
    defaultBranche: 'werkstatt',
    metaTitle: 'Kostenloser Website-Check für Werkstätten in OWL | Kolac Digital',
    metaDescription: 'Findet Google deine Werkstatt? Kostenloser Website-Check in rund 30 Sekunden.',
    closingTitle: 'Soll ich mir das mit dir ansehen?',
    closingText: CLOSING_TEXT,
  },
  makler: {
    slug: 'makler',
    eyebrow: 'Kostenloser Website-Check für Immobilienmakler',
    title: 'Makler in OWL: Findet ein Eigentümer dich bei Google?',
    subline: SUBLINE,
    defaultBranche: 'makler',
    metaTitle: 'Kostenloser Website-Check für Makler in OWL | Kolac Digital',
    metaDescription: 'Findet ein Eigentümer dich bei Google? Kostenloser Website-Check in rund 30 Sekunden.',
    closingTitle: 'Soll ich mir das mit dir ansehen?',
    closingText: CLOSING_TEXT,
  },
};
