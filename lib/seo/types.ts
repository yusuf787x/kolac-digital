/**
 * Datenmodell des SEO-Kundenbereichs. Bewusst ohne Firebase-Imports,
 * damit die Typen im Browser (Admin), auf dem Server (Portal, Cron) und
 * in reinen Tests gleich genutzt werden koennen.
 *
 * Collections (alle nur per Admin SDK bzw. vom Inhaber erreichbar):
 *   seoClients/{customerId}                 Konfiguration pro SEO-Kunde
 *   seoMonthly/{customerId}_{YYYY-MM}       Monatssummen aus der Search Console
 *   seoMonthly/{...}/rows/{queries-n|pages-n}  Zeilen in Bloecken
 *   seoPagespeed/{customerId}_{YYYY-MM}     PageSpeed-Messung
 *   seoActivities/{auto}                    Massnahmen / Changelog
 *   seoReports/{customerId}_{YYYY-MM}       Bericht: Einschaetzung, PDF, Freigabe
 *   portalAccess/{email}                    freigeschaltete Portal-Adressen
 *   portalLoginEvents/{auto}                Login-Protokoll (TTL 90 Tage)
 *   portalLoginLinks/{sha256(code)}         Magic Links (TTL)
 *   portalRateLimits/{sha256(key)}          Zaehler (TTL)
 */

/** Firestore-Timestamp aus Client- oder Admin-SDK. */
export interface TsLike {
  toMillis(): number;
  toDate(): Date;
}

/** Monat im Format YYYY-MM. */
export type SeoMonth = string;

export interface KeywordGroup {
  id: string;
  name: string;
  /** Regulaere Ausdruecke, ohne Gross/Klein-Unterscheidung. Ein Treffer reicht. */
  patterns: string[];
}

export interface SeoClient {
  /** Gleich der customerId. */
  id: string;
  customerId: string;
  /** Name, den der Kunde im Portal und im Bericht sieht. */
  displayName: string;
  domain: string;
  enabled: boolean;
  /** Testkunde mit erzeugten Zahlen, ruft keine Google-API auf. */
  demo?: boolean;
  /** z. B. "sc-domain:motorenfachmann.de" oder "https://www.beispiel.de/". */
  gscProperty: string;
  brandTerms: string[];
  keywordGroups: KeywordGroup[];
  /** 3 bis 5 wichtige Seiten fuer die Ladezeit-Messung. */
  pagespeedUrls: string[];
  /** SHA-256 des Changelog-Schluessels fuer Claude Code. */
  changelogTokenHash?: string;
  /** Letzte vier Zeichen, damit man den Schluessel wiedererkennt. */
  changelogTokenHint?: string;
  lastFetchAt?: TsLike;
  lastFetchMonth?: SeoMonth;
  lastFetchError?: string | null;
  createdAt?: TsLike;
  updatedAt?: TsLike;
}

export interface SeoMetrics {
  clicks: number;
  impressions: number;
  /** 0..1 */
  ctr: number;
  position: number;
}

/** Eine Zeile aus der Search Console (Suchanfrage oder Seite). */
export interface SeoRow extends SeoMetrics {
  key: string;
}

/** Kompakte Speicherform einer Zeile: [key, clicks, impressions, ctr, position]. */
export type SeoRowTuple = [string, number, number, number, number];

export interface SeoMonthlyDoc {
  customerId: string;
  month: SeoMonth;
  /** Summen ohne Dimension, enthalten auch anonymisierte Suchanfragen. */
  totals: SeoMetrics;
  queryCount: number;
  pageCount: number;
  chunks: { queries: number; pages: number };
  source: 'gsc' | 'demo';
  fetchedAt?: TsLike;
}

export type PageSpeedStrategy = 'mobile' | 'desktop';

export interface PageSpeedResult {
  url: string;
  strategy: PageSpeedStrategy;
  /** 0..100, null wenn die Messung fehlschlug. */
  score: number | null;
  lcpMs: number | null;
  inpMs: number | null;
  cls: number | null;
  /** field = echte Nutzerdaten (CrUX), lab = Labortest. */
  source: 'field' | 'lab' | 'mixed';
  error?: string;
}

export interface SeoPagespeedDoc {
  customerId: string;
  month: SeoMonth;
  results: PageSpeedResult[];
  measuredAt?: TsLike;
}

/**
 * done     = live umgesetzt
 * prepared = vorbereitet, noch nicht live
 * checked  = geprueft, keine Aenderung noetig
 * planned  = als Naechstes geplant / offener Punkt
 */
export type SeoActivityStatus = 'done' | 'prepared' | 'checked' | 'planned';

export interface SeoActivity {
  id: string;
  customerId: string;
  /** YYYY-MM-DD */
  date: string;
  month: SeoMonth;
  area: string;
  change: string;
  /** Nutzen bzw. Ergebnis fuer den Kunden. */
  benefit?: string;
  /** Wo / Umfang, z. B. "alle 34 Seiten". */
  scope?: string;
  status: SeoActivityStatus;
  /** Nur veroeffentlichte Eintraege sieht der Kunde. */
  published: boolean;
  source: 'manual' | 'import' | 'claude-code' | 'demo';
  /** Stabiler Schluessel fuer Importe, verhindert Dubletten. */
  externalKey?: string;
  createdAt?: TsLike;
  updatedAt?: TsLike;
}

export type SeoReportStatus = 'draft' | 'released';

export interface SeoReport {
  id: string;
  customerId: string;
  month: SeoMonth;
  status: SeoReportStatus;
  /** Einschaetzung von Yusuf, steht im Portal und auf Seite 1 des PDFs. */
  assessment: string;
  storagePath?: string | null;
  pdfGeneratedAt?: TsLike | null;
  releasedAt?: TsLike | null;
  sentTo?: string[];
  createdAt?: TsLike;
  updatedAt?: TsLike;
}

export interface PortalAccess {
  /** Doc-ID, kleingeschrieben. */
  email: string;
  customerId: string;
  active: boolean;
  uid?: string | null;
  invitedAt?: TsLike;
  revokedAt?: TsLike | null;
  lastLoginAt?: TsLike | null;
  loginCount?: number;
}

export interface PortalLoginEvent {
  id: string;
  email: string;
  customerId: string;
  at: TsLike;
  /** Gekuerzt, letzter Block genullt. */
  ip?: string;
  userAgent?: string;
}

export const ACTIVITY_STATUS_LABELS: Record<SeoActivityStatus, string> = {
  done: 'Umgesetzt',
  prepared: 'Vorbereitet',
  checked: 'Geprüft',
  planned: 'Geplant',
};

export const ACTIVITY_STATUS_BADGES: Record<SeoActivityStatus, string> = {
  done: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  prepared: 'bg-amber-50 text-amber-700 border-amber-200',
  checked: 'bg-sky-50 text-sky-700 border-sky-200',
  planned: 'bg-gray-50 text-gray-600 border-gray-200',
};
