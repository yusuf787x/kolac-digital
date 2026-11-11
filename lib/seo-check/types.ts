/**
 * Datenmodell des oeffentlichen SEO-Checks (/seo-check).
 * Wird von Server (Ausfuehrung, Speicherung) und Client (Anzeige) genutzt.
 */

export type CheckCategory = 'technik' | 'inhalte' | 'sichtbarkeit' | 'lokal';
export type CheckStatus = 'ok' | 'warn' | 'fail' | 'info';

export interface CheckItem {
  id: string;
  category: CheckCategory;
  title: string;
  status: CheckStatus;
  /** Was wir gefunden haben, in einfacher Sprache. */
  detail: string;
  /** Was zu tun ist. Wird in der oeffentlichen Ansicht vor dem Freischalten entfernt. */
  fix?: string;
  /** Wie stark der Punkt bei Google zaehlt, 1 bis 3. */
  weight: 1 | 2 | 3;
}

export interface Measure {
  title: string;
  why: string;
  how: string;
  category: CheckCategory;
}

export interface RankedKeyword {
  keyword: string;
  position: number;
  volume: number | null;
  url?: string;
}

export interface RankingData {
  available: boolean;
  /** Grund, wenn keine Daten abrufbar waren (nur intern, nicht fuer Besucher). */
  error?: string;
  total: number;
  top3: number;
  top10: number;
  top20: number;
  /** Geschaetzte Besuche pro Monat ueber Google (DataForSEO etv). */
  estTraffic: number;
  top: RankedKeyword[];
  potentials: RankedKeyword[];
}

export interface PageSpeedData {
  available: boolean;
  score?: number;
  lcpSeconds?: number;
  cls?: number;
  tbtMs?: number;
}

export interface CategoryScores {
  technik: number;
  inhalte: number;
  sichtbarkeit: number | null;
  lokal: number;
}

export interface SeoCheckResult {
  url: string;
  finalUrl: string;
  domain: string;
  checkedAt: string;
  score: number;
  categories: CategoryScores;
  checks: CheckItem[];
  measures: Measure[];
  rankings: RankingData;
  pagespeed: PageSpeedData;
  /** Erkanntes System, z. B. "Wix" oder "WordPress". */
  platform?: string;
  pagesFound: number;
}

/** Was die API an den Browser gibt. */
export interface SeoCheckResponse {
  id: string;
  unlocked: boolean;
  owner: boolean;
  result: SeoCheckResult;
}

export const CATEGORY_LABELS: Record<CheckCategory, string> = {
  technik: 'Technik',
  inhalte: 'Inhalte',
  sichtbarkeit: 'Sichtbarkeit bei Google',
  lokal: 'Lokale Auffindbarkeit',
};
