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
  /** Geschätzte Besuche pro Monat (nur intern zum Rechnen). */
  etv?: number;
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
  /** Alle Rohdaten aus DataForSEO, nur bis zur Auswertung (wird nicht gespeichert). */
  all?: RankedKeyword[];
  /**
   * Live geprüfte Begriffe „Leistung + Ort“ (z. B. „hausmeisterservice augsburg“),
   * abgeleitet aus Titeln und Überschriften der Website. Fehlt bei älteren Checks.
   */
  local?: LocalKeyword[];
  /** Beste Platzierung bei Suchen nach dem eigenen Firmennamen (zählt nicht als Sichtbarkeit). */
  brand?: RankedKeyword | null;
  /** Wie viele Begriffe als Firmenname oder unpassend aussortiert wurden. */
  filtered?: number;
}

export interface MapPackEntry {
  name: string;
  rating?: number;
  reviews?: number;
  domain?: string;
}

export interface LocalKeyword {
  keyword: string;
  volume: number | null;
  /** Platz in den normalen Ergebnissen (1–20), null = nicht unter den ersten 20. */
  position: number | null;
  url?: string;
  /** Google hat für diese Suche eine Karte mit Firmen gezeigt. */
  hasMapPack: boolean;
  /** Platz in der Karte (1–3), null = nicht in der Karte. */
  mapPosition: number | null;
  /** Die Firmen in der Karte. */
  mapPack: MapPackEntry[];
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
  /** Testmodus (?test=1): Beispielbericht, keine Kosten, keine Mails, nichts an Meta. */
  test?: boolean;
}

export const CATEGORY_LABELS: Record<CheckCategory, string> = {
  technik: 'Technik',
  inhalte: 'Inhalte',
  sichtbarkeit: 'Sichtbarkeit bei Google',
  lokal: 'Lokale Auffindbarkeit',
};
