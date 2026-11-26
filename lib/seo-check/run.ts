import 'server-only';
import { detectPlatform, findAddress, findPhoneInText, parsePage, type ParsedPage } from './html';
import { BlockedUrlError, safeFetch, type SafeResponse } from './safe-fetch';
import { fetchPageSpeed, fetchRankings } from './sources';
import { cityFromKeywords, deriveServicePhrases, detectBrand, fetchLocalKeywords, fold, refineRankings } from './local-keywords';
import type {
  CategoryScores,
  CheckCategory,
  CheckItem,
  CheckStatus,
  Measure,
  RankingData,
  SeoCheckResult,
} from './types';

export class CheckFailedError extends Error {}

export function normalizeInputUrl(raw: string): string | null {
  const trimmed = (raw ?? '').trim();
  if (!trimmed || trimmed.length > 300) return null;
  const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const u = new URL(withProto);
    if (!u.hostname.includes('.')) return null;
    return u.toString();
  } catch {
    return null;
  }
}

export function rootDomain(hostname: string): string {
  return hostname.toLowerCase().replace(/^www\./, '');
}

const LOCAL_SCHEMA =
  /(LocalBusiness|Business|Service|Store|Clinic|Dentist|Physician|Restaurant|Salon|Repair|Dealer|Contractor|Agency|Attorney|Plumber|Electrician|Locksmith|Spa|Gym|Hotel|Bakery|Pharmacy|Optician|Notary|Shop)$/;

interface SamplePage {
  url: string;
  status: number;
  page?: ParsedPage;
}

async function tryFetch(url: string, timeoutMs: number, maxBytes = 800_000): Promise<SafeResponse | null> {
  try {
    return await safeFetch(url, { timeoutMs, maxBytes });
  } catch {
    return null;
  }
}

async function sitemapUrlCount(origin: string, robotsTxt: string | null): Promise<{ found: boolean; count: number }> {
  const candidates = new Set<string>();
  for (const m of (robotsTxt ?? '').matchAll(/^\s*sitemap:\s*(\S+)/gim)) candidates.add(m[1]);
  candidates.add(`${origin}/sitemap.xml`);
  candidates.add(`${origin}/sitemap_index.xml`);
  for (const sm of Array.from(candidates).slice(0, 4)) {
    const res = await tryFetch(sm, 6000, 2_000_000);
    if (!res || res.status !== 200 || !/<(urlset|sitemapindex)\b/i.test(res.body)) continue;
    if (/<sitemapindex\b/i.test(res.body)) {
      const children = Array.from(res.body.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)).map((m) => m[1]).slice(0, 5);
      const counts = await Promise.all(
        children.map(async (c) => {
          const r = await tryFetch(c, 6000, 2_000_000);
          return r && r.status === 200 ? (r.body.match(/<url>/gi) ?? []).length : 0;
        }),
      );
      return { found: true, count: counts.reduce((a, b) => a + b, 0) };
    }
    return { found: true, count: (res.body.match(/<url>/gi) ?? []).length };
  }
  return { found: false, count: 0 };
}

function robotsBlocksAll(robotsTxt: string): boolean {
  const groups = robotsTxt.split(/(?=^\s*user-agent:)/gim);
  return groups.some(
    (g) => /^\s*user-agent:\s*\*\s*$/im.test(g) && /^\s*disallow:\s*\/\s*$/im.test(g),
  );
}

function statusFrom(value: number, okFrom: number, warnFrom: number): CheckStatus {
  if (value >= okFrom) return 'ok';
  if (value >= warnFrom) return 'warn';
  return 'fail';
}

// Bewusst streng: "verbesserbar" zaehlt weniger als die Haelfte.
const POINTS: Record<CheckStatus, number | null> = { ok: 1, warn: 0.4, fail: 0, info: null };

function categoryScore(checks: CheckItem[], cat: CheckCategory): number {
  let sum = 0;
  let max = 0;
  for (const c of checks) {
    if (c.category !== cat) continue;
    const p = POINTS[c.status];
    if (p === null) continue;
    sum += p * c.weight;
    max += c.weight;
  }
  return max ? Math.round((sum / max) * 100) : 0;
}

/**
 * Sichtbarkeit 0 bis 100, kalibriert fuer lokale Betriebe:
 * keine Seite-1-Begriffe ~10, 4 auf Seite 1 ohne Top 3 ~35,
 * 10 auf Seite 1 / 3 Top 3 / 100 Besuche ~55, 30 / 10 / 500 ~75.
 * Top-3-Plaetze zaehlen doppelt, weil sie die meisten Klicks bekommen.
 */
function visibilityScore(r: RankingData): number {
  if (!r.available) return 0;
  const labs = Math.min(100, 9 * Math.log(1 + r.top10 + 2 * r.top3) + 5 * Math.log(1 + r.estTraffic) + 2 * Math.log(1 + r.total));
  const local = r.local ?? [];
  // Wer bei Suche nach dem eigenen Namen vorne steht, hat eine kleine Grundsichtbarkeit.
  const brandBonus = r.brand && r.brand.position <= 3 ? 5 : 0;
  if (local.length === 0) return Math.min(100, Math.round(labs + brandBonus));
  // Die live geprüften Begriffe „Leistung + Ort“ zählen am meisten, gewichtet nach Suchanfragen.
  // Karte unter den ersten drei zählt wie ein Platz unter den ersten drei.
  const points = (k: (typeof local)[number]) =>
    Math.max(
      k.mapPosition ? 100 : 0,
      k.position == null ? 0 : k.position <= 3 ? 100 : k.position <= 10 ? 75 : 40,
    );
  const weight = (k: (typeof local)[number]) => Math.max(10, k.volume ?? 0);
  const total = local.reduce((a, k) => a + weight(k), 0);
  const localScore = local.reduce((a, k) => a + points(k) * weight(k), 0) / total;
  return Math.min(100, Math.round(0.7 * localScore + 0.3 * labs + brandBonus));
}

/** Ort, den Titel oder H1 nennen („Gebäudereinigung in Heilbronn“). */
function placeFromHeadlines(headlines: string[]): string | undefined {
  return headlines
    .map((s) => s.match(/\b(?:in|aus|für)\s+([A-ZÄÖÜ][a-zäöüß]{2,}(?:[ -][A-ZÄÖÜ][a-zäöüß]+)?)/)?.[1])
    .find((p) => p && !/^(Ihr|Ihre|Dein|Deine|Unser|Unsere|Sie|Du|Der|Die|Das|Den|Dem|Ihren)$/.test(p));
}

const plural = (n: number, one: string, many: string) => `${n.toLocaleString('de-DE')} ${n === 1 ? one : many}`;

function mapPackText(entries: { name: string; rating?: number; reviews?: number }[]): string {
  return entries
    .map((e) => `${e.name}${e.reviews != null ? ` (${e.rating != null ? `${e.rating.toLocaleString('de-DE')} Sterne, ` : ''}${plural(e.reviews, 'Bewertung', 'Bewertungen')})` : ''}`)
    .join(', ');
}

const fmt = (n: number) => n.toLocaleString('de-DE');

export async function runSeoCheck(inputUrl: string): Promise<SeoCheckResult> {
  // 1. Startseite laden. Ohne sie ist kein Check moeglich.
  let home: SafeResponse;
  try {
    home = await safeFetch(inputUrl, { timeoutMs: 15_000, maxBytes: 2_000_000 });
  } catch (err) {
    if (err instanceof BlockedUrlError) throw new CheckFailedError(err.message);
    throw new CheckFailedError('Die Website hat nicht rechtzeitig geantwortet.');
  }
  if (home.status >= 400) {
    throw new CheckFailedError(`Die Website antwortet mit Fehler ${home.status}.`);
  }
  const contentType = home.headers.get('content-type') ?? '';
  if (contentType && !/html/i.test(contentType)) {
    throw new CheckFailedError('Unter dieser Adresse liegt keine Website.');
  }

  const finalUrl = new URL(home.finalUrl);
  const origin = finalUrl.origin;
  const domain = rootDomain(finalUrl.hostname);
  const page = parsePage(home.body, home.finalUrl);
  const platform = detectPlatform(home.body, page, home.headers);

  // 2. Alles Weitere parallel: Ranking, Ladezeit, robots, Sitemap, Varianten, Unterseiten.
  const altHost = finalUrl.hostname.startsWith('www.') ? finalUrl.hostname.slice(4) : `www.${finalUrl.hostname}`;
  // Platzierungen und Ladezeit dauern am längsten: starten, aber erst nach den Unterseiten abwarten.
  const rankingsP = fetchRankings(domain);
  const pagespeedP = fetchPageSpeed(home.finalUrl);
  const [robotsRes, httpRes, altRes] = await Promise.all([
    tryFetch(`${origin}/robots.txt`, 6000, 200_000),
    tryFetch(`http://${finalUrl.hostname}${finalUrl.pathname}`, 8000, 50_000),
    tryFetch(`${finalUrl.protocol}//${altHost}/`, 8000, 50_000),
  ]);
  const robotsTxt = robotsRes && robotsRes.status === 200 && !/<html/i.test(robotsRes.body) ? robotsRes.body : null;

  const sampleUrls = page.internalLinks
    .filter((u) => u.replace(/\/$/, '') !== home.finalUrl.replace(/\/$/, ''))
    .slice(0, 8);
  // Unterseiten gestaffelt laden (3 gleichzeitig): viele Server bremsen
  // sonst mit 429/503, das waere kein echter Fehler der Website.
  const loadSample = async (u: string): Promise<SamplePage> => {
    const r = await tryFetch(u, 7000);
    if (!r) return { url: u, status: 0 };
    const isHtml = /html/i.test(r.headers.get('content-type') ?? 'text/html');
    return { url: u, status: r.status, page: r.status < 400 && isHtml ? parsePage(r.body, r.finalUrl) : undefined };
  };
  const loadSamples = async (): Promise<SamplePage[]> => {
    const out: SamplePage[] = new Array(sampleUrls.length);
    let next = 0;
    await Promise.all(
      Array.from({ length: Math.min(3, sampleUrls.length) }, async () => {
        while (next < sampleUrls.length) {
          const i = next++;
          out[i] = await loadSample(sampleUrls[i]);
        }
      }),
    );
    return out;
  };
  const [sitemap, samples] = await Promise.all([sitemapUrlCount(origin, robotsTxt), loadSamples()]);

  // „Leistung + Ort“: Ort aus der Adresse (oder dem Ort, den Titel/H1 nennen),
  // Leistungen aus Titeln und Überschriften, dann live bei Google prüfen.
  const sitePages = [page, ...samples.map((s) => s.page).filter((p): p is ParsedPage => !!p)];
  const siteText = sitePages.map((p) => [p.title ?? '', p.description ?? '', ...p.h1, p.text].join(' ')).join(' ');
  const earlyAddress =
    page.schemaAddress ??
    samples.find((s) => s.page?.schemaAddress)?.page?.schemaAddress ??
    findAddress(page.text) ??
    findAddress(siteText);
  const homeHeadlines = [page.title ?? '', ...page.h1];
  const allHeadlines = sitePages.flatMap((p) => [p.title ?? '', ...p.h1]);
  const addrCity = earlyAddress?.city;
  const siteFold = ` ${siteText.split(/\s+/).map(fold).filter(Boolean).join(' ')} `;
  // Zielort: steht er im Titel der Startseite, gilt der. Sonst der Ort, mit dem
  // Google die Seite schon verbindet, dann Orte aus Titeln, zuletzt die Adresse.
  const rawRankings = await rankingsP;
  const brandGuess = detectBrand(sitePages, domain, addrCity);
  const targetCity =
    (addrCity && homeHeadlines.some((h) => h.toLowerCase().includes(addrCity.toLowerCase())) ? addrCity : undefined) ??
    placeFromHeadlines(homeHeadlines) ??
    cityFromKeywords(rawRankings.all, siteFold, brandGuess) ??
    placeFromHeadlines(allHeadlines) ??
    addrCity;
  const brand = detectBrand(sitePages, domain, targetCity);
  const phrases = targetCity ? deriveServicePhrases(sitePages, targetCity, brand) : [];
  const [pagespeed, local] = await Promise.all([
    pagespeedP,
    targetCity
      ? fetchLocalKeywords({ domain, city: targetCity, phrases, brand }).catch((err) => {
          console.error('SEO-Check Leistung+Ort:', err);
          return [];
        })
      : Promise.resolve([]),
  ]);
  const rankings = refineRankings(rawRankings, {
    brand,
    siteFold,
    servicePhraseWords: new Set(phrases.flatMap((p) => p.split(' ').map(fold))),
    local,
  });
  // Erster Eintrag = Hauptleistung aus dem Titel der Startseite.
  const mainLocal = rankings.local?.[0];

  const checks: CheckItem[] = [];
  const add = (c: CheckItem) => checks.push(c);

  // ---------------- Technik ----------------
  const isHttps = finalUrl.protocol === 'https:';
  const httpRedirects = !!httpRes && httpRes.finalUrl.startsWith('https://');
  add({
    id: 'https',
    category: 'technik',
    title: 'Sichere Verbindung (HTTPS)',
    weight: 3,
    status: isHttps && httpRedirects ? 'ok' : isHttps ? 'warn' : 'fail',
    detail: !isHttps
      ? 'Die Seite läuft ohne Verschlüsselung. Browser zeigen „Nicht sicher“ an.'
      : httpRedirects
        ? 'Die Seite ist verschlüsselt und leitet unsichere Aufrufe richtig weiter.'
        : 'Die Seite ist verschlüsselt, aber die Adresse mit http:// leitet nicht sauber auf https:// weiter.',
    fix: 'SSL-Zertifikat aktivieren und alle http-Aufrufe dauerhaft (301) auf https weiterleiten.',
  });

  add({
    id: 'response',
    category: 'technik',
    title: 'Antwortzeit des Servers',
    weight: 2,
    status: home.ms < 800 ? 'ok' : home.ms < 2000 ? 'warn' : 'fail',
    detail: `Der Server hat nach ${(home.ms / 1000).toLocaleString('de-DE', { maximumFractionDigits: 2 })} Sekunden geantwortet.`,
    fix: 'Schnelleres Hosting oder Caching nutzen. Unter 0,8 Sekunden ist gut.',
  });

  if (pagespeed.available && typeof pagespeed.score === 'number') {
    add({
      id: 'pagespeed',
      category: 'technik',
      title: 'Ladezeit auf dem Handy',
      weight: 3,
      status: statusFrom(pagespeed.score, 90, 50),
      detail: `Google bewertet die Ladegeschwindigkeit mobil mit ${pagespeed.score} von 100 Punkten${
        pagespeed.lcpSeconds ? `. Der Hauptinhalt steht nach ${pagespeed.lcpSeconds.toLocaleString('de-DE')} Sekunden` : ''
      }.`,
      fix: 'Bilder verkleinern (WebP), unnötige Skripte und Plugins entfernen, Schriften lokal laden.',
    });
  } else {
    add({
      id: 'pagespeed',
      category: 'technik',
      title: 'Ladezeit auf dem Handy',
      weight: 3,
      status: 'info',
      detail: 'Die Ladezeit konnte gerade nicht gemessen werden.',
    });
  }

  add({
    id: 'viewport',
    category: 'technik',
    title: 'Für Handys optimiert',
    weight: 3,
    status: page.viewport ? 'ok' : 'fail',
    detail: page.viewport
      ? 'Die Seite passt sich an Handybildschirme an.'
      : 'Die Seite ist nicht für Handys eingerichtet. Google bewertet zuerst die Handy-Ansicht.',
    fix: 'Responsives Design mit viewport-Angabe umsetzen.',
  });

  const xRobots = (home.headers.get('x-robots-tag') ?? '').toLowerCase();
  const noindex = /noindex/i.test(page.robots ?? '') || xRobots.includes('noindex');
  add({
    id: 'indexable',
    category: 'technik',
    title: 'Google darf die Seite aufnehmen',
    weight: 3,
    status: noindex ? 'fail' : 'ok',
    detail: noindex
      ? 'Die Startseite ist für Google gesperrt (noindex). Sie kann so nicht gefunden werden.'
      : 'Die Startseite ist für Google freigegeben.',
    fix: 'Die Angabe „noindex“ entfernen.',
  });

  const robotsBlocked = robotsTxt ? robotsBlocksAll(robotsTxt) : false;
  add({
    id: 'robots',
    category: 'technik',
    title: 'robots.txt',
    weight: 2,
    status: robotsBlocked ? 'fail' : robotsTxt ? 'ok' : 'warn',
    detail: robotsBlocked
      ? 'Die robots.txt sperrt die ganze Website für Suchmaschinen.'
      : robotsTxt
        ? 'Eine robots.txt ist vorhanden und sperrt nichts Wichtiges.'
        : 'Es gibt keine robots.txt. Das ist kein Fehler, aber Google findet die Sitemap schlechter.',
    fix: robotsBlocked ? 'Die Zeile „Disallow: /“ entfernen.' : 'Eine robots.txt mit Verweis auf die Sitemap anlegen.',
  });

  add({
    id: 'sitemap',
    category: 'technik',
    title: 'Sitemap für Google',
    weight: 2,
    status: sitemap.found && sitemap.count > 0 ? 'ok' : 'fail',
    detail:
      sitemap.found && sitemap.count > 0
        ? `Eine Sitemap mit ${fmt(sitemap.count)} Seiten ist vorhanden.`
        : 'Es wurde keine Sitemap gefunden. Google muss alle Seiten selbst suchen.',
    fix: 'Eine XML-Sitemap anlegen und in der Google Search Console einreichen.',
  });

  add({
    id: 'canonical',
    category: 'technik',
    title: 'Eindeutige Hauptadresse (Canonical)',
    weight: 1,
    status: page.canonical ? 'ok' : 'warn',
    detail: page.canonical
      ? 'Die Seite nennt Google ihre Hauptadresse.'
      : 'Die Seite nennt keine Hauptadresse. Google kann doppelte Inhalte falsch zuordnen.',
    fix: 'Auf jeder Seite ein Canonical-Tag auf die eigene Adresse setzen.',
  });

  const altConsistent = !altRes || new URL(altRes.finalUrl).hostname === finalUrl.hostname;
  add({
    id: 'www',
    category: 'technik',
    title: 'Mit und ohne www einheitlich',
    weight: 1,
    status: altConsistent ? 'ok' : 'warn',
    detail: altConsistent
      ? 'Die Adresse mit und ohne www führt zur selben Seite.'
      : `Die Seite ist unter ${finalUrl.hostname} und ${altHost} getrennt erreichbar. Google sieht das als zwei Websites.`,
    fix: 'Eine Variante festlegen und die andere dauerhaft dorthin weiterleiten.',
  });

  // Nur eindeutige Fehler zaehlen. Zeitueberschreitung, 403, 429 und 503
  // bedeuten meist Bot-Schutz oder Drosselung, nicht eine kaputte Seite.
  const broken = samples.filter((s) => s.status === 404 || s.status === 410 || (s.status >= 500 && s.status !== 503));
  add({
    id: 'broken',
    category: 'technik',
    title: 'Funktionierende Unterseiten',
    weight: 2,
    status: samples.length === 0 ? 'info' : broken.length === 0 ? 'ok' : broken.length <= 1 ? 'warn' : 'fail',
    detail:
      samples.length === 0
        ? 'Auf der Startseite wurden keine Links zu Unterseiten gefunden.'
        : broken.length === 0
          ? `${samples.length} verlinkte Unterseiten geprüft, alle erreichbar.`
          : `${broken.length} von ${samples.length} geprüften Unterseiten sind nicht erreichbar.`,
    fix: 'Defekte Links korrigieren oder entfernen.',
  });

  add({
    id: 'schema',
    category: 'technik',
    title: 'Strukturierte Daten',
    weight: 1,
    status: page.schemaTypes.length ? 'ok' : 'warn',
    detail: page.schemaTypes.length
      ? `Google bekommt Zusatzinfos: ${page.schemaTypes.slice(0, 4).join(', ')}.`
      : 'Es gibt keine strukturierten Daten. Google muss Firmendaten selbst erraten.',
    fix: 'Firmendaten als JSON-LD (Organization oder LocalBusiness) hinterlegen.',
  });

  add({
    id: 'lang',
    category: 'technik',
    title: 'Sprache angegeben',
    weight: 1,
    status: page.lang ? 'ok' : 'warn',
    detail: page.lang ? `Die Seite ist als „${page.lang}“ ausgezeichnet.` : 'Die Sprache der Seite ist nicht angegeben.',
    fix: 'Im HTML lang="de" setzen.',
  });

  if (platform) {
    add({
      id: 'platform',
      category: 'technik',
      title: 'Erkanntes System',
      weight: 1,
      status: 'info',
      detail: /wix|jimdo|ionos|squarespace/i.test(platform)
        ? `Die Seite läuft mit ${platform}. Baukästen setzen bei Ladezeit und Technik oft Grenzen.`
        : `Die Seite läuft mit ${platform}.`,
    });
  }

  // ---------------- Inhalte ----------------
  const titleLen = page.title?.length ?? 0;
  add({
    id: 'title',
    category: 'inhalte',
    title: 'Seitentitel',
    weight: 3,
    status: !titleLen ? 'fail' : titleLen >= 30 && titleLen <= 60 ? 'ok' : titleLen > 75 || titleLen < 15 ? 'fail' : 'warn',
    detail: !titleLen
      ? 'Die Startseite hat keinen Seitentitel. Das ist die Überschrift in den Google-Ergebnissen.'
      : `„${page.title}“ (${titleLen} Zeichen). ${
          titleLen < 30 ? 'Zu kurz, es fehlen Leistung und Ort.' : titleLen > 60 ? 'Zu lang, Google schneidet am Handy ab.' : 'Die Länge passt.'
        }`,
    fix: 'Titel mit Hauptleistung und Ort, 30 bis 60 Zeichen, z. B. „Gebäudereinigung Bielefeld | Firmenname“.',
  });

  const descLen = page.description?.length ?? 0;
  add({
    id: 'description',
    category: 'inhalte',
    title: 'Beschreibung in Google',
    weight: 2,
    status: !descLen ? 'fail' : descLen >= 70 && descLen <= 160 ? 'ok' : 'warn',
    detail: !descLen
      ? 'Es gibt keine Beschreibung. Google zeigt dann einen zufälligen Textausschnitt.'
      : `${descLen} Zeichen. ${descLen < 70 ? 'Zu kurz, um zu überzeugen.' : descLen > 160 ? 'Zu lang, Google schneidet ab.' : 'Die Länge passt.'}`,
    fix: 'Eine Beschreibung mit Nutzen und Handlungsaufforderung schreiben, 70 bis 160 Zeichen.',
  });

  add({
    id: 'h1',
    category: 'inhalte',
    title: 'Hauptüberschrift (H1)',
    weight: 2,
    status: page.h1.length === 1 ? 'ok' : page.h1.length === 2 ? 'warn' : 'fail',
    detail:
      page.h1.length === 0
        ? 'Die Startseite hat keine Hauptüberschrift.'
        : page.h1.length === 1
          ? `„${page.h1[0].slice(0, 90)}“`
          : `Es gibt ${page.h1.length} Hauptüberschriften. Google weiß nicht, welche zählt.`,
    fix: 'Genau eine H1 pro Seite mit Leistung und Ort.',
  });

  add({
    id: 'h2',
    category: 'inhalte',
    title: 'Gliederung mit Zwischenüberschriften',
    weight: 1,
    status: page.h2Count >= 3 ? 'ok' : page.h2Count >= 1 ? 'warn' : 'fail',
    detail: page.h2Count >= 3 ? `${page.h2Count} Zwischenüberschriften gliedern den Inhalt.` : `Nur ${page.h2Count} Zwischenüberschriften. Der Inhalt ist kaum gegliedert.`,
    fix: 'Jeden Abschnitt mit einer aussagekräftigen H2-Überschrift beginnen, möglichst mit Leistung oder Ort.',
  });

  // Reihenfolge der Ueberschriften: keine uebersprungenen Ebenen (H2 -> H4)
  // und keine H3 vor der ersten H2. Baukaesten setzen Ebenen oft nach Optik.
  const levels = page.headingLevels;
  let skipped = 0;
  for (let i = 1; i < levels.length; i++) if (levels[i] > levels[i - 1] + 1) skipped++;
  const firstH2 = levels.indexOf(2);
  const h3BeforeH2 = levels.some((l, i) => l >= 3 && (firstH2 === -1 || i < firstH2));
  const structureIssues = skipped + (h3BeforeH2 ? 1 : 0) + (levels[0] !== undefined && levels[0] !== 1 ? 1 : 0);
  add({
    id: 'heading-order',
    category: 'inhalte',
    title: 'Saubere Reihenfolge der Überschriften',
    weight: 2,
    status: levels.length === 0 ? 'fail' : structureIssues === 0 ? 'ok' : structureIssues <= 2 ? 'warn' : 'fail',
    detail:
      levels.length === 0
        ? 'Die Seite hat keine Überschriften im HTML. Google erkennt keine Gliederung.'
        : structureIssues === 0
          ? 'Die Überschriften bauen sauber aufeinander auf (H1, dann H2, dann H3).'
          : `Die Überschriften springen ${structureIssues}-mal in der Ebene. Google erkennt dadurch schlechter, was Haupt- und was Unterthema ist.`,
    fix: 'Überschriften nach Bedeutung setzen, nicht nach Optik: eine H1, darunter H2, darunter H3.',
  });

  add({
    id: 'words',
    category: 'inhalte',
    title: 'Textmenge der Startseite',
    weight: 3,
    status: statusFrom(page.words, 500, 300),
    detail: `Rund ${fmt(page.words)} Wörter. ${
      page.words < 300
        ? 'Zu wenig, damit Google versteht, was du anbietest und wo. Gut gefundene Seiten haben meist deutlich über 500 Wörter.'
        : page.words < 500
          ? 'Eher knapp. Mitbewerber auf Seite 1 haben meist mehr Inhalt.'
          : 'Genug Inhalt für Google.'
    }`,
    fix: 'Leistungen, Einsatzgebiet, Ablauf, Preise als Richtwert und häufige Fragen ausführlicher beschreiben.',
  });

  // Hauptthema: das erste Stichwort aus dem Titel (vor | , - :) muss in der
  // H1 und mehrfach im Text vorkommen, sonst ist das Thema der Seite unklar.
  // Firmenname (steckt in der Domain) ist kein Thema, dann das naechste Wort.
  const domainKey = domain.replace(/[^a-zäöüß0-9]/gi, '').toLowerCase();
  const topicWord = (page.title ?? '')
    .split(/[|,:–—·•-]/)
    .flatMap((seg) => seg.split(/\s+/))
    .map((w) => w.replace(/[^a-zäöüß0-9]/gi, ''))
    .find(
      (w) =>
        w.length >= 4 &&
        !domainKey.includes(w.toLowerCase()) &&
        !/^(home|startseite|willkommen|welcome|ihre|deine|ihr|dein|die|der|das|und|aus|für|mit)$/i.test(w),
    );
  if (topicWord) {
    const stem = topicWord.slice(0, Math.max(4, topicWord.length - 2)).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const inH1 = page.h1.some((h) => new RegExp(stem, 'i').test(h));
    const mentions = (page.text.match(new RegExp(stem, 'gi')) ?? []).length;
    add({
      id: 'topic',
      category: 'inhalte',
      title: 'Hauptthema durchgängig',
      weight: 2,
      status: inH1 && mentions >= 3 ? 'ok' : inH1 || mentions >= 3 ? 'warn' : 'fail',
      detail: `„${topicWord}“ aus dem Titel steht ${inH1 ? 'in der Hauptüberschrift' : 'nicht in der Hauptüberschrift'} und ${mentions}-mal im Text.${
        inH1 && mentions >= 3 ? ' Das Thema ist klar.' : ' Google erkennt das Hauptthema dadurch schlechter.'
      }`,
      fix: `Den wichtigsten Suchbegriff („${topicWord}“) in Titel, H1 und mehrfach natürlich im Text verwenden.`,
    });
  }

  add({
    id: 'internal-links',
    category: 'inhalte',
    title: 'Verlinkung zu Unterseiten',
    weight: 1,
    status: statusFrom(page.internalLinks.length, 10, 5),
    detail: `Die Startseite verlinkt auf ${page.internalLinks.length} eigene Unterseiten.`,
    fix: 'Von der Startseite auf jede Leistungs- und Ortsseite verlinken, mit aussagekräftigem Linktext.',
  });

  const altShare = page.images.total ? 1 - page.images.missingAlt / page.images.total : 1;
  add({
    id: 'alt',
    category: 'inhalte',
    title: 'Bildbeschreibungen (Alt-Texte)',
    weight: 1,
    status: altShare >= 0.95 ? 'ok' : altShare >= 0.75 ? 'warn' : 'fail',
    detail: page.images.total
      ? `${page.images.total - page.images.missingAlt} von ${page.images.total} Bildern sind beschrieben.`
      : 'Auf der Startseite wurden keine Bilder gefunden.',
    fix: 'Jedes Bild mit einem kurzen, beschreibenden Alt-Text versehen.',
  });

  const pagesFound = Math.max(sitemap.count, page.internalLinks.length);
  add({
    id: 'pages',
    category: 'inhalte',
    title: 'Eigene Seiten für Leistungen',
    weight: 2,
    status: statusFrom(pagesFound, 8, 4),
    detail: `Rund ${fmt(pagesFound)} Unterseiten gefunden. ${
      pagesFound < 8 ? 'Wer für jede Leistung eine eigene Seite hat, wird für viel mehr Suchbegriffe gefunden.' : ''
    }`.trim(),
    fix: 'Für jede Hauptleistung und jedes wichtige Einsatzgebiet eine eigene Seite anlegen.',
  });

  const sampled = [page, ...samples.map((s) => s.page).filter((p): p is ParsedPage => !!p)];
  const titles = sampled.map((p) => p.title?.trim().toLowerCase()).filter(Boolean) as string[];
  const dupTitles = titles.length - new Set(titles).size;
  const missingDesc = sampled.filter((p) => !p.description).length;
  if (sampled.length > 1) {
    add({
      id: 'dup-titles',
      category: 'inhalte',
      title: 'Unterschiedliche Titel je Seite',
      weight: 2,
      status: dupTitles === 0 ? 'ok' : dupTitles <= 1 ? 'warn' : 'fail',
      detail:
        dupTitles === 0
          ? `Alle ${sampled.length} geprüften Seiten haben eigene Titel.`
          : `${dupTitles + 1} von ${sampled.length} geprüften Seiten teilen sich denselben Titel.`,
      fix: 'Jeder Seite einen eigenen Titel mit ihrem Thema geben.',
    });
    add({
      id: 'missing-desc',
      category: 'inhalte',
      title: 'Beschreibungen auf Unterseiten',
      weight: 1,
      status: missingDesc === 0 ? 'ok' : missingDesc <= 1 ? 'warn' : 'fail',
      detail:
        missingDesc === 0
          ? 'Alle geprüften Seiten haben eine Beschreibung.'
          : `${missingDesc} von ${sampled.length} geprüften Seiten fehlt die Beschreibung.`,
      fix: 'Für jede Seite eine eigene Beschreibung schreiben.',
    });
  }

  add({
    id: 'og',
    category: 'inhalte',
    title: 'Vorschau beim Teilen',
    weight: 1,
    status: page.ogTitle && page.ogImage ? 'ok' : 'warn',
    detail:
      page.ogTitle && page.ogImage
        ? 'Beim Teilen über WhatsApp oder LinkedIn erscheint eine Vorschau mit Bild.'
        : 'Beim Teilen über WhatsApp oder LinkedIn fehlt eine ordentliche Vorschau.',
    fix: 'Open-Graph-Titel und Vorschaubild hinterlegen.',
  });

  // ---------------- Lokal ----------------
  const allText = [page.text, ...samples.map((s) => s.page?.text ?? '')].join(' ');
  // Strukturierte Daten zuerst (Startseite, dann Unterseiten), Text nur als Notloesung.
  const schemaAddress = page.schemaAddress ?? samples.find((s) => s.page?.schemaAddress)?.page?.schemaAddress;
  const textOnHome = findAddress(page.text);
  const textAnywhere = textOnHome ?? findAddress(allText);
  const address = schemaAddress ?? textAnywhere;
  const hasTel = page.telLinks.length > 0;
  const hasPhone = hasTel || findPhoneInText(page.text);
  add({
    id: 'phone',
    category: 'lokal',
    title: 'Telefonnummer zum Antippen',
    weight: 2,
    status: hasTel ? 'ok' : hasPhone ? 'warn' : 'fail',
    detail: hasTel
      ? 'Die Telefonnummer ist auf dem Handy direkt anrufbar.'
      : hasPhone
        ? 'Eine Nummer steht da, ist auf dem Handy aber nicht antippbar.'
        : 'Auf der Startseite ist keine Telefonnummer zu finden.',
    fix: 'Telefonnummer gut sichtbar als anklickbaren Link (tel:) einbauen.',
  });

  add({
    id: 'address',
    category: 'lokal',
    title: 'Adresse sichtbar',
    weight: 2,
    status: textOnHome ? 'ok' : textAnywhere ? 'warn' : 'fail',
    detail: textOnHome
      ? `Die Adresse (${address?.zip} ${address?.city}) steht auf der Startseite.`
      : textAnywhere
        ? 'Die Adresse steht nur auf Unterseiten, nicht auf der Startseite.'
        : address
          ? `Die Adresse (${address.zip} ${address.city}) steht nur in den Firmendaten für Google, nicht sichtbar auf der Seite.`
          : 'Es wurde keine Adresse gefunden. Google kann die Firma keinem Ort zuordnen.',
    fix: 'Adresse mit Postleitzahl im Fußbereich jeder Seite angeben, genau wie im Google-Profil.',
  });

  // Ort in Titel/H1: entweder der Ort aus der Adresse oder ein anderer
  // genannter Ort ("Gebäudereinigung in Heilbronn"), denn viele Betriebe
  // sitzen im Umland und zielen bewusst auf die naechste Stadt.
  const city = address?.city;
  const headlines = [page.title ?? '', ...page.h1];
  const cityInHeadline = !!city && headlines.some((s) => s.toLowerCase().includes(city.toLowerCase()));
  const otherPlace = headlines
    .map((s) => s.match(/\b(?:in|aus|für)\s+([A-ZÄÖÜ][a-zäöüß]{2,}(?:[ -][A-ZÄÖÜ][a-zäöüß]+)?)/)?.[1])
    .find((p) => p && !/^(Ihr|Ihre|Dein|Deine|Unser|Unsere|Sie|Du|Der|Die|Das|Den|Dem|Ihren)$/.test(p));
  const placeOk = cityInHeadline || !!otherPlace;
  add({
    id: 'city-title',
    category: 'lokal',
    title: 'Ort in Titel oder Überschrift',
    weight: 2,
    status: placeOk ? 'ok' : city ? 'fail' : 'warn',
    detail: cityInHeadline
      ? `„${city}“ steht im Titel oder in der Hauptüberschrift.`
      : otherPlace
        ? `Titel oder Überschrift nennen „${otherPlace}“. Gut für Suchen nach Leistung plus Ort.`
        : city
          ? `„${city}“ fehlt im Titel und in der Hauptüberschrift. Für Suchen wie „Leistung ${city}“ ist das wichtig.`
          : 'Kein Ort erkennbar. Google weiß nicht, für welche Region du gefunden werden willst.',
    fix: 'Hauptleistung und Ort in Seitentitel und H1 aufnehmen.',
  });

  const localSchema = page.schemaTypes.some((t) => LOCAL_SCHEMA.test(t));
  add({
    id: 'local-schema',
    category: 'lokal',
    title: 'Firmendaten für Google hinterlegt',
    weight: 2,
    status: localSchema ? 'ok' : 'fail',
    detail: localSchema
      ? 'Name, Adresse und Kontakt sind als strukturierte Firmendaten hinterlegt.'
      : 'Es fehlen strukturierte Firmendaten (LocalBusiness). Sie helfen Google, Website und Google-Profil zu verbinden.',
    fix: 'LocalBusiness-Daten mit Name, Adresse, Telefon, Öffnungszeiten und Einsatzgebiet einbauen.',
  });

  const hasHours = page.schemaHasOpeningHours || /öffnungszeiten|geöffnet|sprechzeiten/i.test(allText);
  add({
    id: 'hours',
    category: 'lokal',
    title: 'Öffnungs- oder Erreichbarkeitszeiten',
    weight: 1,
    status: hasHours ? 'ok' : 'warn',
    detail: hasHours ? 'Öffnungs- oder Sprechzeiten sind angegeben.' : 'Es sind keine Öffnungs- oder Erreichbarkeitszeiten zu finden.',
    fix: 'Zeiten angeben, identisch mit dem Google-Profil.',
  });

  add({
    id: 'map',
    category: 'lokal',
    title: 'Karte oder Anfahrt',
    weight: 1,
    status: page.hasMap || samples.some((s) => s.page?.hasMap) ? 'ok' : 'warn',
    detail:
      page.hasMap || samples.some((s) => s.page?.hasMap)
        ? 'Es gibt eine Karte oder einen Link zu Google Maps.'
        : 'Es gibt keine Karte und keinen Link zu Google Maps.',
    fix: 'Auf der Kontaktseite eine Karte oder einen Link zum Google-Profil einbauen.',
  });

  add({
    id: 'contact',
    category: 'lokal',
    title: 'Einfache Kontaktmöglichkeit',
    weight: 1,
    status: page.hasForm || page.contactLink ? 'ok' : 'warn',
    detail:
      page.hasForm || page.contactLink
        ? 'Besucher finden schnell ein Formular oder eine Kontaktseite.'
        : 'Es gibt kein Formular und keine Kontaktseite auf der Startseite.',
    fix: 'Kurzes Anfrageformular oder klaren Kontakt-Button auf jeder Seite.',
  });

  add({
    id: 'impressum',
    category: 'lokal',
    title: 'Impressum verlinkt',
    weight: 1,
    status: page.impressumLink ? 'ok' : 'fail',
    detail: page.impressumLink ? 'Das Impressum ist verlinkt.' : 'Auf der Startseite ist kein Impressum verlinkt. Das ist auch rechtlich Pflicht.',
    fix: 'Impressum und Datenschutz im Fußbereich verlinken.',
  });

  if (mainLocal?.hasMapPack && (mainLocal.volume ?? 0) > 0) {
    add({
      id: 'map-pack',
      category: 'lokal',
      title: `In der Google-Karte bei „${mainLocal.keyword}“`,
      weight: 3,
      status: mainLocal.mapPosition ? 'ok' : 'fail',
      detail: mainLocal.mapPosition
        ? `Du stehst in der Karte mit den drei Firmen auf Platz ${mainLocal.mapPosition}. Dort landen die meisten Anrufe.`
        : `Du stehst nicht unter den drei Firmen in der Karte. Dort stehen: ${mapPackText(mainLocal.mapPack)}.`,
      fix: 'Google-Profil vervollständigen (Haupt- und Nebenkategorien, Leistungen, Fotos) und regelmäßig Bewertungen sammeln.',
    });
  } else {
    add({
      id: 'gbp',
      category: 'lokal',
      title: 'Google-Unternehmensprofil',
      weight: 1,
      status: 'info',
      detail: 'Das Profil in Google Maps prüfen wir gern persönlich mit dir. Dort entscheidet sich, wer in der Karte oben steht.',
    });
  }

  // ---------------- Sichtbarkeit ----------------
  const localList = rankings.local ?? [];
  if (localList.length > 0) {
    const sorted = localList;
    const line = (k: (typeof sorted)[number]) =>
      `„${k.keyword}“${k.volume ? ` (${fmt(k.volume)} Suchen im Monat)` : ''}: ${
        k.position ? `Platz ${k.position}` : 'nicht unter den ersten 20'
      }${k.hasMapPack ? (k.mapPosition ? `, in der Karte Platz ${k.mapPosition}` : ', nicht in der Karte') : ''}`;
    const good = sorted.filter((k) => (k.position != null && k.position <= 10) || k.mapPosition).length;
    const some = sorted.filter((k) => k.position != null || k.mapPosition).length;
    add({
      id: 'kw-local',
      category: 'sichtbarkeit',
      title: 'Deine wichtigsten Suchbegriffe mit Ort',
      weight: 3,
      status: good >= Math.ceil(sorted.length / 2) ? 'ok' : some > 0 ? 'warn' : 'fail',
      detail: `Live bei Google geprüft. ${sorted.map(line).join('. ')}.`,
      fix: 'Die Seite zur Leistung gezielt auf „Leistung + Ort“ ausrichten und das Google-Profil für die Karte stärken.',
    });
  }
  if (rankings.available) {
    const nameNote = rankings.brand ? ' (ohne Suchen nach deinem Firmennamen)' : '';
    add({
      id: 'kw-top10',
      category: 'sichtbarkeit',
      title: 'Suchbegriffe auf Seite 1',
      weight: 3,
      status: rankings.top10 >= 10 ? 'ok' : rankings.top10 >= 3 ? 'warn' : 'fail',
      detail:
        rankings.top10 === 0
          ? `Für keinen Suchbegriff steht die Website auf Seite 1 bei Google${nameNote}.`
          : `Für ${fmt(rankings.top10)} Suchbegriffe steht die Website auf Seite 1${nameNote}.${
              rankings.top10 < 3 ? ' Neue Kunden, die deinen Namen noch nicht kennen, finden dich so selten.' : ''
            }`,
      fix: 'Seiten gezielt auf die Begriffe ausrichten, nach denen deine Kunden suchen.',
    });
    if (rankings.brand) {
      add({
        id: 'kw-brand',
        category: 'sichtbarkeit',
        title: 'Gefunden bei Suche nach deinem Namen',
        weight: 1,
        status: rankings.brand.position <= 3 ? 'ok' : 'warn',
        detail: `Wer nach „${rankings.brand.keyword}“ sucht, findet dich auf Platz ${rankings.brand.position}.`,
        fix: 'Firmenname in Seitentitel und Google-Profil identisch schreiben.',
      });
    }
    add({
      id: 'kw-top3',
      category: 'sichtbarkeit',
      title: 'Platzierungen unter den ersten drei',
      weight: 3,
      status: rankings.top3 >= 5 ? 'ok' : rankings.top3 >= 1 ? 'warn' : 'fail',
      detail:
        rankings.top3 === 0
          ? 'Für keinen Suchbegriff steht die Website unter den ersten drei. Dort landen über die Hälfte aller Klicks.'
          : `Für ${fmt(rankings.top3)} Suchbegriffe steht die Website unter den ersten drei.`,
      fix: 'Die stärksten Begriffe mit eigener, ausführlicher Seite und Verlinkung nach ganz vorne bringen.',
    });
    add({
      id: 'kw-traffic',
      category: 'sichtbarkeit',
      title: 'Besuche über Google (geschätzt)',
      weight: 2,
      status: rankings.estTraffic >= 300 ? 'ok' : rankings.estTraffic >= 50 ? 'warn' : 'fail',
      detail:
        rankings.estTraffic === 0
          ? `Über die normale Google-Suche kommen geschätzt kaum Besuche${rankings.brand ? ' (ohne Suchen nach deinem Namen)' : ''}.`
          : `Rund ${fmt(rankings.estTraffic)} Besuche pro Monat kommen geschätzt über die normale Google-Suche${rankings.brand ? ' (ohne Suchen nach deinem Namen)' : ''}.${
              rankings.estTraffic < 50 ? ' Das reicht nicht für regelmäßige Anfragen.' : ''
            }`,
      fix: 'Mehr Begriffe mit echtem Suchvolumen auf Seite 1 bringen, vor allem Leistung plus Ort.',
    });
    add({
      id: 'kw-total',
      category: 'sichtbarkeit',
      title: 'Suchbegriffe insgesamt',
      weight: 2,
      status: rankings.total >= 50 ? 'ok' : rankings.total >= 15 ? 'warn' : 'fail',
      detail: `Die Website wird für ${fmt(rankings.total)} Suchbegriffe unter den ersten 100 Ergebnissen angezeigt.`,
      fix: 'Mehr Inhalte zu Leistungen, Orten und Kundenfragen erstellen.',
    });
    add({
      id: 'kw-potential',
      category: 'sichtbarkeit',
      title: 'Begriffe mit dem größten Potenzial',
      weight: 2,
      status: 'info',
      detail: rankings.potentials.length
        ? `${rankings.potentials.length} Suchbegriffe stehen auf Platz 4 bis 20, also unten auf Seite 1 oder auf Seite 2. Hier bringt wenig Arbeit am meisten.`
        : 'Aktuell gibt es keine Begriffe auf Platz 4 bis 20.',
    });
  }

  // ---------------- Punkte ----------------
  const categories: CategoryScores = {
    technik: categoryScore(checks, 'technik'),
    inhalte: categoryScore(checks, 'inhalte'),
    lokal: categoryScore(checks, 'lokal'),
    sichtbarkeit: rankings.available ? visibilityScore(rankings) : null,
  };
  // Sichtbarkeit zaehlt am meisten, und die Gesamtnote darf hoechstens 30
  // Punkte darueber liegen: eine saubere Seite, die bei Google nicht
  // erscheint, ist nicht "gut aufgestellt".
  const weights: [number | null, number][] = [
    [categories.technik, 0.2],
    [categories.inhalte, 0.25],
    [categories.lokal, 0.15],
    [categories.sichtbarkeit, 0.4],
  ];
  const usable = weights.filter((w): w is [number, number] => w[0] !== null);
  const wsum = usable.reduce((a, [, w]) => a + w, 0);
  // Kein Deckel mehr: eine sehr gute Website ohne Sichtbarkeit landet bei rund 60,
  // die Sichtbarkeit zieht über ihr Gewicht von 40 % nach unten. Ehrlich, aber nicht schlechter als die Lage.
  const score = Math.round(usable.reduce((a, [v, w]) => a + v * w, 0) / wsum);

  return {
    url: inputUrl,
    finalUrl: home.finalUrl,
    domain,
    checkedAt: new Date().toISOString(),
    score,
    categories,
    checks,
    measures: buildMeasures(
      checks,
      rankings,
      [
        { url: home.finalUrl, title: page.title ?? '', h1: page.h1 },
        ...samples.filter((x) => x.page).map((x) => ({ url: x.url, title: x.page!.title ?? '', h1: x.page!.h1 })),
      ],
      targetCity,
    ),
    rankings,
    pagespeed,
    platform,
    pagesFound,
  };
}

const CATEGORY_PRIORITY: Record<CheckCategory, number> = { sichtbarkeit: 1.3, lokal: 1.2, inhalte: 1.1, technik: 1 };

const MEASURE_WHY: Record<string, string> = {
  https: 'Ohne HTTPS warnt der Browser, Besucher springen ab und Google stuft die Seite herab.',
  response: 'Ein langsamer Server kostet Besucher, bevor die Seite überhaupt erscheint.',
  pagespeed: 'Die meisten Kunden suchen am Handy. Lädt die Seite langsam, sind sie weg.',
  viewport: 'Google bewertet zuerst die Handy-Ansicht deiner Seite.',
  indexable: 'Solange die Seite gesperrt ist, kann sie bei Google gar nicht erscheinen.',
  robots: 'Eine falsche robots.txt kann deine ganze Seite unsichtbar machen.',
  sitemap: 'Mit Sitemap findet Google alle deine Seiten schneller.',
  canonical: 'Verhindert, dass Google doppelte Seiten gegeneinander antreten lässt.',
  www: 'Zwei Varianten teilen deine Stärke bei Google auf.',
  broken: 'Defekte Links verärgern Besucher und verschwenden Googles Aufmerksamkeit.',
  schema: 'Strukturierte Daten helfen Google, deine Firma richtig einzuordnen.',
  lang: 'Google ordnet die Seite sicher den deutschen Suchen zu.',
  title: 'Der Titel ist die Überschrift in den Google-Ergebnissen und der stärkste Einzelfaktor auf der Seite.',
  description: 'Eine gute Beschreibung entscheidet, ob jemand in Google auf dich klickt.',
  h1: 'Die Hauptüberschrift sagt Google, worum es auf der Seite geht.',
  h2: 'Gliederung hilft Google und Lesern, Inhalte schnell zu erfassen.',
  'heading-order': 'Springende Überschriften verwischen für Google, was Haupt- und was Unterthema ist.',
  topic: 'Nur wenn Titel, Überschrift und Text dasselbe Thema tragen, ordnet Google die Seite diesem Suchbegriff zu.',
  'internal-links': 'Interne Links zeigen Google, welche Seiten wichtig sind, und verteilen die Stärke der Startseite.',
  words: 'Ohne genug Text versteht Google nicht, wofür du gefunden werden sollst.',
  alt: 'Beschriebene Bilder bringen Zusatztreffer in der Bildersuche und sind barrierefrei.',
  pages: 'Jede Leistung mit eigener Seite ist eine zusätzliche Chance, gefunden zu werden.',
  'dup-titles': 'Gleiche Titel lassen deine eigenen Seiten gegeneinander antreten.',
  'missing-desc': 'Ohne Beschreibung zeigt Google zufällige Textstücke.',
  og: 'Geteilte Links mit Bild werden deutlich öfter angeklickt.',
  phone: 'Die meisten lokalen Kunden rufen direkt vom Handy aus an.',
  address: 'Google braucht deine Adresse, um dich bei Suchen in deiner Region zu zeigen.',
  'city-title': 'Kunden suchen „Leistung plus Ort“. Steht der Ort nicht im Titel, rutschst du nach hinten.',
  'local-schema': 'Verbindet Website und Google-Profil und stärkt dich in Google Maps.',
  hours: 'Einheitliche Zeiten auf Website und Google-Profil schaffen Vertrauen.',
  map: 'Eine Karte macht den Weg zu dir leicht und stärkt den Ortsbezug.',
  contact: 'Je weniger Hürden, desto mehr Anfragen.',
  impressum: 'Pflichtangabe und Vertrauenssignal für Besucher und Google.',
  'kw-top10': 'Über 90 Prozent der Klicks gehen an Ergebnisse auf Seite 1.',
  'kw-total': 'Jeder zusätzliche Suchbegriff bringt neue Besucher.',
  'map-pack': 'Die drei Firmen in der Google-Karte bekommen bei Suchen mit Ort die meisten Anrufe.',
};

interface MeasurePage {
  url: string;
  title: string;
  h1: string[];
}

function buildMeasures(checks: CheckItem[], rankings: RankingData, pages: MeasurePage[], city?: string): Measure[] {
  const measures: Measure[] = [];
  const local = rankings.local ?? [];
  const pathOf = (u?: string) => {
    try {
      return u ? decodeURI(new URL(u).pathname) : '';
    } catch {
      return '';
    }
  };
  const serviceOf = (keyword: string) =>
    city ? keyword.replace(new RegExp(`\\s*${city.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'i'), '').trim() : keyword;
  const pageFor = (service: string) => {
    const f = fold(service);
    if (f.length < 4) return undefined;
    return pages.find((p) => fold(pathOf(p.url)).includes(f) || fold([p.title, ...p.h1].join(' ')).includes(f));
  };

  // 1. „Leistung + Ort“ knapp hinter den ersten drei: hier bringt Arbeit am schnellsten etwas.
  const near = local.find((k) => k.position != null && k.position >= 4);
  if (near) {
    const path = pathOf(near.url);
    measures.push({
      category: 'sichtbarkeit',
      title: `„${near.keyword}“ von Platz ${near.position} nach vorne holen`,
      why: `${near.volume ? `${fmt(near.volume)} Menschen suchen das jeden Monat. ` : ''}Die ersten drei Plätze bekommen die meisten Klicks, auf Platz ${near.position} kommt davon wenig an.`,
      how: `${path && path !== '/' ? `Die Seite ${path}` : path === '/' ? 'Die Startseite' : 'Die Seite zu dieser Leistung'} gezielt auf „${near.keyword}“ ausrichten und von anderen Seiten darauf verlinken.`,
    });
  }

  // 2. Die Seite zielt auf Begriffe, die kaum jemand sucht.
  if (local.length > 0 && local.every((k) => !k.volume)) {
    measures.push({
      category: 'sichtbarkeit',
      title: 'Auf Begriffe setzen, die wirklich gesucht werden',
      why: `${local.map((k) => `„${k.keyword}“`).join(' und ')} ${local.length === 1 ? 'wird' : 'werden'} bei Google kaum gesucht. Deine Seite ist aber auf diese Wörter ausgerichtet.`,
      how: 'Herausfinden, welche Begriffe deine Kunden wirklich eintippen, und Titel und Überschriften darauf umstellen.',
    });
  }

  // 3. Nicht in der Karte, obwohl Google dort Firmen zeigt (nur bei Begriffen, die gesucht werden).
  const main = local[0];
  const notInMap = !!main && main.hasMapPack && !main.mapPosition && (main.volume ?? 0) > 0;
  if (notInMap) {
    measures.push({
      category: 'lokal',
      title: `In die Google-Karte bei „${main.keyword}“ kommen`,
      why: `Bei dieser Suche zeigt Google zuerst eine Karte mit drei Firmen, die bekommen die meisten Anrufe. Dort stehen gerade: ${mapPackText(main.mapPack)}.`,
      how: 'Google-Profil vervollständigen (Kategorien, Leistungen, Fotos, Beiträge) und nach jedem Auftrag um eine Bewertung bitten.',
    });
  }

  // 4. Gesucht, aber nicht unter den ersten 20 (höchstens zwei Begriffe).
  const missing = local.filter((k) => k !== near && k.position == null && !k.mapPosition && (k.volume ?? 0) > 0).slice(0, 2);
  for (const k of missing) {
    const page = pageFor(serviceOf(k.keyword));
    const pagePath = page ? pathOf(page.url) : '';
    measures.push({
      category: 'sichtbarkeit',
      title: `Bei „${k.keyword}“ gefunden werden`,
      why: `${fmt(k.volume ?? 0)} Suchen im Monat, und deine Website steht nicht unter den ersten 20 Ergebnissen.`,
      how: page
        ? `${pagePath && pagePath !== '/' ? `Die Seite ${pagePath}` : 'Die Startseite'} auf genau diesen Begriff ausrichten und mehr eigenen Text dazu schreiben.`
        : 'Eine eigene Seite für diese Leistung vor Ort anlegen und von der Startseite verlinken.',
    });
  }

  // 4. Ohne Live-Daten: bereinigte Begriffe auf Platz 4 bis 20 aus der Datenbank.
  if (!near && rankings.available && rankings.potentials.length) {
    const names = rankings.potentials.slice(0, 3).map((k) => `„${k.keyword}“ (Platz ${k.position})`).join(', ');
    measures.push({
      category: 'sichtbarkeit',
      title: 'Begriffe auf Platz 4 bis 20 nach vorne holen',
      why: 'Diese Begriffe werden schon gesucht und du stehst knapp hinter den Plätzen, die die meisten Klicks bekommen.',
      how: `Die passenden Seiten gezielt auf diese Begriffe ausbauen: ${names}.`,
    });
  }

  // 5. Offene Prüfpunkte der Website. kw-* und Karte sind Ergebnisse, die oben schon Maßnahmen haben.
  const ranked = checks
    .filter((c) => (c.status === 'fail' || c.status === 'warn') && c.fix && !c.id.startsWith('kw-') && c.id !== 'map-pack')
    .map((c) => ({
      c,
      prio: (c.status === 'fail' ? 2 : 1) * c.weight * CATEGORY_PRIORITY[c.category],
    }))
    .sort((a, b) => b.prio - a.prio);
  for (const { c } of ranked) {
    if (measures.length >= 5) break;
    measures.push({
      category: c.category,
      title: c.title,
      why: MEASURE_WHY[c.id] ?? c.detail,
      how: c.fix!,
    });
  }

  // 6. Hebel außerhalb der Website, mit echten Zahlen, wo es sie gibt.
  const leaders = (main?.mapPack ?? []).filter((e) => e.reviews != null);
  for (const m of EVERGREEN_MEASURES) {
    if (measures.length >= 5) break;
    if (notInMap && (m.title.startsWith('Google-Unternehmensprofil') || m.title.startsWith('Regelmäßig neue Google-Bewertungen'))) continue;
    if (main?.mapPosition && m.title.startsWith('Google-Unternehmensprofil')) continue;
    if (m.title.startsWith('Regelmäßig neue Google-Bewertungen') && leaders.length) {
      measures.push({
        ...m,
        why: `${m.why} Die Firmen in der Karte bei „${main!.keyword}“ haben ${leaders.map((e) => e.reviews!.toLocaleString('de-DE')).join(', ')} Bewertungen.`,
      });
      continue;
    }
    measures.push(m);
  }
  return measures;
}

const EVERGREEN_MEASURES: Measure[] = [
  {
    category: 'lokal',
    title: 'Google-Unternehmensprofil vollständig pflegen',
    why: 'Bei Suchen mit Ortsbezug zeigt Google zuerst die Karte mit drei Firmen. Wer dort steht, bekommt die meisten Anrufe.',
    how: 'Passende Haupt- und Nebenkategorien, alle Leistungen, Einsatzgebiet, echte Fotos und regelmäßige Beiträge eintragen.',
  },
  {
    category: 'lokal',
    title: 'Regelmäßig neue Google-Bewertungen sammeln',
    why: 'Anzahl und Aktualität der Bewertungen entscheiden mit, wer in Google Maps oben steht und angeklickt wird.',
    how: 'Nach jedem Auftrag per Link oder QR-Code um eine Bewertung bitten und jede Bewertung beantworten.',
  },
  {
    category: 'sichtbarkeit',
    title: 'Eigene Seiten für Orte im Einzugsgebiet',
    why: 'Kunden suchen „Leistung plus Ort“. Für jeden wichtigen Ort eine eigene, echte Seite bringt zusätzliche Treffer.',
    how: 'Für die drei bis fünf wichtigsten Orte je eine Seite mit Leistungen, Referenzen und Anfahrt anlegen.',
  },
  {
    category: 'lokal',
    title: 'Einträge in Branchenverzeichnissen',
    why: 'Einheitliche Firmendaten in vielen Verzeichnissen bestätigen Google, dass es deine Firma an diesem Ort wirklich gibt.',
    how: 'Name, Adresse und Telefon überall exakt gleich eintragen, angefangen bei den großen Verzeichnissen.',
  },
];

/** Entfernt die Loesungen, solange der Bericht nicht freigeschaltet ist. */
const STATUS_RANK: Record<string, number> = { fail: 0, warn: 1 };

/**
 * Der wichtigste Befund: zuerst Probleme, dann Verbesserbares, jeweils
 * nach Gewicht. Null, wenn nichts zu verbessern ist.
 */
export function topFindingId(result: SeoCheckResult): string | null {
  const open = result.checks
    .map((c, i) => ({ c, i }))
    .filter(({ c }) => c.status === 'fail' || c.status === 'warn')
    .sort((x, y) => STATUS_RANK[x.c.status] - STATUS_RANK[y.c.status] || y.c.weight - x.c.weight || x.i - y.i);
  return open[0]?.c.id ?? null;
}

/**
 * Öffentliche Ansicht vor dem Freischalten. Sichtbar: Gesamtnote, Noten der
 * Bereiche und der wichtigste Befund als Satz (ohne Lösung). Gesperrt und
 * hier serverseitig entfernt: alle anderen Prüfpunkte, alle Maßnahmen und
 * Lösungen, Suchbegriffe, Platzierungen, Kennzahlen und Ladezeit-Wertung.
 * Gesperrte Prüfpunkte bleiben als leere Hüllen mit Status erhalten, damit
 * die Seite „12 weitere Befunde, davon 5 dringend“ zählen kann.
 */
export function redactResult(result: SeoCheckResult): SeoCheckResult {
  const top = topFindingId(result);
  return {
    ...result,
    checks: result.checks.map(({ fix: _fix, ...rest }) =>
      rest.id === top ? rest : { ...rest, title: '', detail: '' },
    ),
    measures: result.measures.map((m) => ({ ...m, title: '', why: '', how: '' })),
    rankings: {
      available: result.rankings.available,
      total: 0,
      top3: 0,
      top10: 0,
      top20: 0,
      estTraffic: 0,
      top: [],
      potentials: [],
    },
    pagespeed: { available: result.pagespeed.available },
  };
}
