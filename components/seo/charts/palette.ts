import type { PositionBuckets } from '@/lib/seo/analysis';

/**
 * Farben der SEO-Diagramme, geteilt von Portal (SVG) und PDF.
 *
 * Positionsbereiche sind geordnet, deshalb eine einfarbige Blau-Rampe
 * von dunkel (Platz 1 bis 3, am wertvollsten) bis hell. Mit dem
 * Dataviz-Validator geprueft (--ordinal, Oberflaeche #ffffff): alle Checks
 * bestanden, hellste Stufe 2,11:1 gegen Weiss.
 */
export const BUCKET_COLORS: Record<keyof PositionBuckets, string> = {
  top3: '#104281',
  top10: '#256abf',
  top20: '#5598e7',
  rest: '#86b6ef',
};

export const BUCKET_ORDER: Array<keyof PositionBuckets> = ['top3', 'top10', 'top20', 'rest'];

/** Einzelne Datenreihe (Klicks, Impressionen): Markenblau. */
export const SERIES_COLOR = '#2563eb';
export const SERIES_WASH = 'rgba(37, 99, 235, 0.10)';

/** Ampel, nie ohne Text verwendet. */
export const STATUS_COLORS = {
  good: '#0ca30c',
  'needs-improvement': '#fab219',
  poor: '#d03b3b',
  unknown: '#9ca3af',
} as const;

export const GRID_COLOR = '#e5e7eb';
export const AXIS_TEXT = '#6b7280';
