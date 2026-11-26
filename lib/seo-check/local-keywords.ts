import 'server-only';
import type { ParsedPage } from './html';
import { dfsAuthHeader, rankingsConfigured } from './sources';
import type { LocalKeyword, MapPackEntry, RankedKeyword, RankingData } from './types';

/**
 * Macht die Sichtbarkeit belastbar:
 * 1. Suchen nach dem eigenen Firmennamen zählen nicht als Sichtbarkeit.
 * 2. Begriffe, deren Wörter nirgends auf der Website vorkommen (z. B. fremde
 *    Firmennamen aus der Datenbank), fliegen raus.
 * 3. „Leistung + Ort“ wird live bei Google geprüft: Platz in den Ergebnissen
 *    und ob die Firma in der Karte mit den drei Firmen steht.
 * Kosten: eine Suchvolumen-Abfrage und höchstens drei Live-Suchen pro Check.
 */

const MAX_LIVE = 3;

/** Kleinschreibung, Umlaute ausgeschrieben, nur Buchstaben und Ziffern. */
export function fold(s: string): string {
  return s
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '');
}

const words = (s: string) => s.toLowerCase().split(/[^a-zäöüß0-9-]+/).filter(Boolean);

/** Wörter, die nie ein Firmenname-Merkmal und nie allein eine Leistung sind. */
const GENERIC = new Set(
  [
    'gmbh', 'ug', 'kg', 'ohg', 'gbr', 'ek', 'mbh', 'co', 'ag', 'und', 'the', 'and', 'der', 'die', 'das', 'dein', 'deine', 'ihr', 'ihre',
    'service', 'services', 'team', 'studio', 'digital', 'group', 'gruppe', 'online', 'shop', 'home', 'startseite', 'willkommen',
    'impressum', 'datenschutz', 'datenschutzerklaerung', 'kontakt', 'agb', 'widerruf', 'barrierefreiheit', 'jobs', 'job', 'karriere',
    'minijob', 'minijobs', 'stellenangebote', 'blog', 'ratgeber', 'news', 'aktuelles', 'ueber', 'uns', 'unternehmen', 'referenzen',
    'leistungen', 'preise', 'galerie', 'bewertungen', 'faq', 'termin', 'anfrage', 'notdienst', 'umgebung', 'region', 'nahe',
    'kfz', 'pkw', 'lkw', 'bau', 'art', 'neu', 'top', 'pro', 'eco', 'bio', 'edv', 'it', 'by', 'mein', 'dr', 'st'
  ].map(fold),
);

/** Füllwörter in Suchanfragen, die nicht auf der Website stehen müssen. */
const QUERY_FILLERS = new Set(
  [
    'in', 'im', 'am', 'an', 'aus', 'bei', 'fuer', 'mit', 'von', 'vom', 'zum', 'zur', 'und', 'oder', 'der', 'die', 'das', 'den', 'ein', 'eine',
    'kosten', 'preis', 'preise', 'guenstig', 'nahe', 'naehe', 'umgebung', 'beste', 'besten', 'test', 'erfahrungen', 'firma', 'firmen',
    'anbieter', 'gmbh', 'near', 'me', 'top', 'empfehlung', 'bewertung', 'bewertungen', 'jobs', 'job', 'stellenangebote', 'was', 'wie',
  ].map(fold),
);

const LEADING = new Set(['wir', 'sind', 'ihr', 'ihre', 'ihren', 'dein', 'deine', 'deinen', 'euer', 'unser', 'unsere', 'ihr partner', 'professionelle', 'professioneller', 'zuverlässige', 'zuverlässiger']);

export interface BrandInfo {
  /** Domain ohne Endung, z. B. "hmsschmidt". */
  label: string;
  /** Wörter des Firmennamens, z. B. ["hms", "schmidt"]. */
  tokens: Set<string>;
  /** Firmenname wie in den Titeln, z. B. "HMS SCHMIDT". */
  name: string;
  /** Kurzes Kürzel am Anfang des Namens (2 bis 3 Zeichen), z. B. "cb" bei „CB Cars“. */
  lead: string;
}

const TITLE_SPLIT = /\s*[|–—·•:]\s*|\s+-\s+/;

function titleSegments(pages: ParsedPage[]): string[][] {
  return pages.map((p) => [p.title ?? '', ...p.h1].flatMap((t) => t.split(TITLE_SPLIT)).map((s) => s.trim()).filter(Boolean));
}

/** Firmenname: das Titelstück, das auf mehreren Seiten wiederkehrt, sonst der Domainname. */
export function detectBrand(pages: ParsedPage[], domain: string, city: string | undefined): BrandInfo {
  const label = fold(domain.split('.')[0] ?? '');
  const counts = new Map<string, { n: number; raw: string }>();
  for (const segs of titleSegments(pages.map((p) => ({ ...p, h1: [] })))) {
    for (const seg of new Set(segs)) {
      const cleaned = city ? seg.replace(new RegExp(`\\b${escapeRe(city)}\\b`, 'ig'), '').trim() : seg;
      const key = fold(cleaned);
      if (key.length < 3) continue;
      const c = counts.get(key) ?? { n: 0, raw: cleaned };
      c.n++;
      counts.set(key, c);
    }
  }
  const repeated = [...counts.entries()].filter(([, v]) => v.n >= 2).sort((a, b) => b[1].n - a[1].n);
  // Bevorzugt das Stück, das dem Domainnamen ähnelt.
  const best =
    repeated.find(([k]) => label && (label.includes(k) || k.includes(label))) ??
    repeated.find(([k]) => k.length <= 30) ??
    null;
  const name = best?.[1].raw ?? '';
  const tokens = new Set(
    words(name)
      .map(fold)
      .filter((w) => w.length >= 3 && !GENERIC.has(w) && (!city || w !== fold(city))),
  );
  const first = fold(words(name)[0] ?? '');
  const lead = first.length >= 2 && first.length <= 3 && !GENERIC.has(first) ? first : '';
  return { label, tokens, name, lead };
}

/** Suche nach genau dieser Firma (Domainname oder Wort aus dem Firmennamen). */
export function isOwnBrandKeyword(keyword: string, brand: BrandInfo, servicePhraseWords: Set<string>): boolean {
  const k = fold(keyword);
  if (brand.label.length >= 4 && (k.includes(brand.label) || (k.length >= 4 && brand.label.includes(k)))) return true;
  return words(keyword)
    .map(fold)
    .some((w) => w.length >= 3 && brand.tokens.has(w) && !servicePhraseWords.has(w));
}

/** Eigener Name oder ein ähnlich benannter Betrieb: zählt beides nicht als Sichtbarkeit. */
export function isBrandKeyword(keyword: string, brand: BrandInfo, servicePhraseWords: Set<string>): boolean {
  const k = fold(keyword);
  // „cb auto“ bei „CB Cars“: Suche nach einem ähnlich benannten Betrieb, nicht nach der Leistung.
  if (brand.lead && fold(words(keyword)[0] ?? '') === brand.lead) return true;
  if (brand.label.length >= 4 && (k.includes(brand.label) || (k.length >= 4 && brand.label.includes(k)))) return true;
  return words(keyword)
    .map(fold)
    .some((w) => w.length >= 3 && brand.tokens.has(w) && !servicePhraseWords.has(w));
}

/** Alle Suchwörter (ohne Füllwörter) kommen irgendwo auf der Website vor. */
export function isRelevantKeyword(keyword: string, siteFold: string): boolean {
  const sig = words(keyword)
    .map(fold)
    .filter((w) => w.length >= 3 && !QUERY_FILLERS.has(w));
  if (sig.length === 0) return false;
  return sig.every((w) => siteFold.includes(w) || (w.endsWith('s') && siteFold.includes(w.slice(0, -1))));
}

/**
 * Leistungen aus Titeln und Hauptüberschriften, die den Ort enthalten,
 * z. B. „Gebäudereinigung in Augsburg“ → „gebäudereinigung“.
 */
export function deriveServicePhrases(pages: ParsedPage[], city: string, brand: BrandInfo): string[] {
  const cityRe = new RegExp(`\\b${escapeRe(city)}\\b`, 'i');
  const seen = new Map<string, string>();
  for (const segs of titleSegments(pages)) {
    for (const seg of segs) {
      if (!cityRe.test(seg)) continue;
      let p = seg.split(cityRe)[0];
      p = p.split(/\s+(?:für|fuer|und|&|mit|vom|von)\s+|,|\(/i)[0];
      p = p.replace(/\s+(?:in|aus|bei|im|rund um|nahe|um)\s*$/i, '');
      p = p.replace(/[^\p{L}\s-]/gu, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
      const ws = p.split(' ').filter(Boolean);
      // Führende Füllwörter weg: „wir sind ihr hausmeisterservice“ → „hausmeisterservice“.
      while (ws.length && (LEADING.has(ws[0]) || GENERIC.has(fold(ws[0])) || QUERY_FILLERS.has(fold(ws[0])))) ws.shift();
      p = ws.join(' ');
      if (ws.length === 0 || ws.length > 3) continue;
      if (ws.some((w) => w.endsWith('-') || w.length < 3)) continue;
      if (ws.every((w) => GENERIC.has(fold(w)))) continue;
      if (isBrandKeyword(p, brand, new Set())) continue;
      const key = fold(p);
      if (key.length < 4 || seen.has(key)) continue;
      seen.set(key, p);
    }
  }
  if (seen.size === 0) {
    // Kein Ort in den Titeln: Leistung direkt aus Titel und H1 der Startseite,
    // z. B. „Gebäudereinigung und Hygienebedarf aus einer Hand“ → „gebäudereinigung“.
    const home = pages[0];
    for (const t of [home?.title ?? '', ...(home?.h1 ?? [])]) {
      for (const seg of t.split(/\s*[|–—·•:.]\s*|\s+-\s+/)) {
        for (const part of seg.split(/\s+(?:und|&|mit|aus|für|fuer|von)\s+|,/i)) {
          const ws = part.replace(/[^\p{L}\s-]/gu, ' ').replace(/\s+/g, ' ').trim().toLowerCase().split(' ').filter(Boolean);
          while (ws.length && (LEADING.has(ws[0]) || GENERIC.has(fold(ws[0])) || QUERY_FILLERS.has(fold(ws[0])))) ws.shift();
          if (ws.length === 0 || ws.length > 2 || ws.some((w) => w.length < 4 || w.endsWith('-'))) continue;
          const p = ws.join(' ');
          if (ws.every((w) => GENERIC.has(fold(w))) || isBrandKeyword(p, brand, new Set())) continue;
          const key = fold(p);
          if (!seen.has(key)) seen.set(key, p);
        }
      }
    }
  }
  return [...seen.values()].slice(0, 6);
}

/**
 * Ort, mit dem Google die Seite schon verbindet: das häufigste letzte Wort der
 * passenden Datenbank-Begriffe, z. B. „fensterreinigung heilbronn“ → „Heilbronn“.
 * Nur Wörter, die auch auf der Website stehen.
 */
export function cityFromKeywords(items: RankedKeyword[] | undefined, siteFold: string, brand: BrandInfo): string | undefined {
  const score = new Map<string, { n: number; v: number; raw: string }>();
  for (const k of items ?? []) {
    if (isBrandKeyword(k.keyword, brand, new Set())) continue;
    const ws = words(k.keyword);
    if (ws.length < 2) continue;
    const last = ws[ws.length - 1];
    const f = fold(last);
    if (f.length < 4 || GENERIC.has(f) || QUERY_FILLERS.has(f) || !siteFold.includes(` ${f} `)) continue;
    const e = score.get(f) ?? { n: 0, v: 0, raw: last };
    e.n++;
    e.v += k.volume ?? 0;
    score.set(f, e);
  }
  const best = [...score.values()].filter((e) => e.n >= 2).sort((a, b) => b.n - a.n || b.v - a.v)[0];
  return best ? best.raw.charAt(0).toUpperCase() + best.raw.slice(1) : undefined;
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// -------------------------------------------------------------------
// Live-Abfragen
// -------------------------------------------------------------------

async function dfsPost<T>(path: string, body: unknown, timeoutMs: number): Promise<T | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`https://api.dataforseo.com/v3/${path}`, {
      method: 'POST',
      signal: controller.signal,
      headers: { Authorization: dfsAuthHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
    });
    const json = (await res.json().catch(() => null)) as { status_code?: number; tasks?: { status_code?: number; status_message?: string; result?: unknown[] }[] } | null;
    const task = json?.tasks?.[0];
    if (!res.ok || json?.status_code !== 20000 || task?.status_code !== 20000) {
      console.error(`DataForSEO ${path}:`, res.status, task?.status_code, task?.status_message);
      return null;
    }
    return (task.result?.[0] ?? null) as T | null;
  } catch (err) {
    console.error(`DataForSEO ${path}:`, err instanceof Error ? err.message : err);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchVolumes(keywords: string[]): Promise<Map<string, number | null>> {
  const out = new Map<string, number | null>(keywords.map((k) => [k, null]));
  const r = await dfsPost<{ items?: { keyword?: string; keyword_info?: { search_volume?: number | null } }[] }>(
    'dataforseo_labs/google/keyword_overview/live',
    [{ keywords, location_code: 2276, language_code: 'de' }],
    12_000,
  );
  for (const it of r?.items ?? []) {
    if (it.keyword) out.set(it.keyword.toLowerCase(), it.keyword_info?.search_volume ?? null);
  }
  return out;
}

interface SerpItem {
  type?: string;
  rank_group?: number;
  domain?: string;
  url?: string;
  title?: string;
  rating?: { value?: number; votes_count?: number } | null;
}

async function fetchSerp(keyword: string, domain: string, brand: BrandInfo, volume: number | null): Promise<LocalKeyword | null> {
  const r = await dfsPost<{ items?: SerpItem[] }>(
    'serp/google/organic/live/advanced',
    [{ keyword, location_code: 2276, language_code: 'de', device: 'desktop', depth: 20 }],
    28_000,
  );
  if (!r) return null;
  const items = r.items ?? [];
  const own = (d?: string) => !!d && (d === domain || d.endsWith(`.${domain}`));
  const organic = items.find((i) => i.type === 'organic' && own(i.domain));
  const pack = items.filter((i) => i.type === 'local_pack');
  const brandFold = fold(brand.name);
  const mapIdx = pack.findIndex((i) => own(i.domain) || (brandFold.length >= 4 && fold(i.title ?? '').includes(brandFold)));
  const mapPack: MapPackEntry[] = pack.slice(0, 3).map((i) => ({
    name: i.title ?? '',
    rating: i.rating?.value ?? undefined,
    reviews: i.rating?.votes_count ?? undefined,
    domain: i.domain && !/google\./.test(i.domain) ? i.domain : undefined,
  }));
  return {
    keyword,
    volume,
    position: organic?.rank_group && organic.rank_group <= 20 ? organic.rank_group : null,
    url: organic?.url,
    hasMapPack: pack.length > 0,
    mapPosition: mapIdx >= 0 ? (pack[mapIdx].rank_group ?? mapIdx + 1) : null,
    mapPack,
  };
}

/** Wählt die meistgesuchten „Leistung + Ort“-Begriffe und prüft sie live. */
export async function fetchLocalKeywords(opts: {
  domain: string;
  city: string;
  phrases: string[];
  brand: BrandInfo;
}): Promise<LocalKeyword[]> {
  if (!rankingsConfigured() || opts.phrases.length === 0) return [];
  const city = opts.city.toLowerCase();
  const candidates = [...new Set(opts.phrases.map((p) => `${p} ${city}`.replace(/\s+/g, ' ').trim()))].slice(0, 6);
  const volumes = await fetchVolumes(candidates);
  const ranked = candidates
    .map((k) => ({ k, v: volumes.get(k) ?? null }))
    .sort((a, b) => (b.v ?? -1) - (a.v ?? -1));
  const withDemand = ranked.filter((x) => (x.v ?? 0) > 0);
  // Hauptleistung (aus dem Titel der Startseite) immer dabei, auch wenn weniger gesucht.
  const primary = candidates[0];
  const pool = withDemand.length ? withDemand : ranked;
  const chosen = [
    ...ranked.filter((x) => x.k === primary),
    ...pool.filter((x) => x.k !== primary),
  ].slice(0, withDemand.length ? MAX_LIVE : 2);
  const results = await Promise.all(chosen.map((x) => fetchSerp(x.k, opts.domain, opts.brand, x.v)));
  // Reihenfolge: Hauptleistung zuerst, dann nach Suchanfragen.
  return results.filter((x): x is LocalKeyword => !!x);
}

// -------------------------------------------------------------------
// Datenbank-Begriffe bereinigen
// -------------------------------------------------------------------

export function refineRankings(
  raw: RankingData,
  ctx: { brand: BrandInfo; siteFold: string; servicePhraseWords: Set<string>; local: LocalKeyword[] },
): RankingData {
  const { all, ...rest } = raw;
  if (!raw.available) return { ...rest, local: ctx.local };
  const items = all ?? [...raw.top];
  const isBrand = (k: RankedKeyword) => isBrandKeyword(k.keyword, ctx.brand, ctx.servicePhraseWords);
  const brandItems = items.filter(isBrand);
  const nonBrand = items.filter((k) => !isBrand(k));
  const relevant = nonBrand.filter((k) => isRelevantKeyword(k.keyword, ctx.siteFold));

  const complete = items.length >= raw.total;
  const count = (list: RankedKeyword[], max: number, min = 1) => list.filter((k) => k.position >= min && k.position <= max).length;
  const etv = (list: RankedKeyword[]) => list.reduce((a, k) => a + (k.etv ?? 0), 0);

  const top3 = complete ? count(relevant, 3) : Math.max(0, raw.top3 - count(brandItems, 3));
  const top10 = complete ? count(relevant, 10) : Math.max(0, raw.top10 - count(brandItems, 10));
  const top20 = complete ? count(relevant, 20) : Math.max(0, raw.top20 - count(brandItems, 20));
  const estTraffic = Math.max(0, Math.round(complete ? etv(relevant) : raw.estTraffic - etv(brandItems)));
  const strip = ({ etv: _e, ...k }: RankedKeyword): RankedKeyword => k;

  const brand = brandItems
    .filter((k) => isOwnBrandKeyword(k.keyword, ctx.brand, ctx.servicePhraseWords))
    .sort((a, b) => a.position - b.position || (b.volume ?? 0) - (a.volume ?? 0))[0];
  return {
    ...rest,
    total: Math.max(0, raw.total - brandItems.length - (complete ? nonBrand.length - relevant.length : 0)),
    top3,
    top10,
    top20,
    estTraffic,
    top: [...relevant].sort((a, b) => a.position - b.position || (b.volume ?? 0) - (a.volume ?? 0)).slice(0, 10).map(strip),
    potentials: relevant
      .filter((k) => k.position >= 4 && k.position <= 20 && (k.volume ?? 0) > 0)
      .sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0))
      .slice(0, 10)
      .map(strip),
    local: ctx.local,
    brand: brand ? strip(brand) : null,
    filtered: items.length - relevant.length,
  };
}
