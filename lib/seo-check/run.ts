import 'server-only';
import { detectPlatform, findAddress, findPhoneInText, parsePage, type ParsedPage } from './html';
import { BlockedUrlError, safeFetch, type SafeResponse } from './safe-fetch';
import { fetchPageSpeed, fetchRankings } from './sources';
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

const POINTS: Record<CheckStatus, number | null> = { ok: 1, warn: 0.5, fail: 0, info: null };

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

function visibilityScore(r: RankingData): number {
  if (!r.available) return 0;
  return Math.min(100, Math.round(18 * Math.log(1 + r.top10) + 8 * Math.log(1 + r.total)));
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
  const [rankings, pagespeed, robotsRes, httpRes, altRes] = await Promise.all([
    fetchRankings(domain),
    fetchPageSpeed(home.finalUrl),
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
    status: !titleLen ? 'fail' : titleLen >= 30 && titleLen <= 65 ? 'ok' : 'warn',
    detail: !titleLen
      ? 'Die Startseite hat keinen Seitentitel. Das ist die Überschrift in den Google-Ergebnissen.'
      : `„${page.title}“ (${titleLen} Zeichen). ${
          titleLen < 30 ? 'Zu kurz, es fehlen Leistung und Ort.' : titleLen > 65 ? 'Zu lang, Google schneidet ab.' : 'Die Länge passt.'
        }`,
    fix: 'Titel mit Hauptleistung und Ort, 30 bis 65 Zeichen, z. B. „Gebäudereinigung Bielefeld | Firmenname“.',
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
    status: page.h1.length === 1 ? 'ok' : page.h1.length === 0 ? 'fail' : 'warn',
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
    status: page.h2Count >= 2 ? 'ok' : 'warn',
    detail: page.h2Count >= 2 ? `${page.h2Count} Zwischenüberschriften gliedern den Inhalt.` : 'Der Inhalt ist kaum gegliedert.',
    fix: 'Abschnitte mit aussagekräftigen H2-Überschriften gliedern.',
  });

  add({
    id: 'words',
    category: 'inhalte',
    title: 'Textmenge der Startseite',
    weight: 2,
    status: statusFrom(page.words, 300, 150),
    detail: `Rund ${fmt(page.words)} Wörter. ${
      page.words < 150 ? 'Zu wenig, damit Google versteht, was du anbietest.' : page.words < 300 ? 'Eher knapp.' : 'Genug Inhalt für Google.'
    }`,
    fix: 'Leistungen, Einsatzgebiet und häufige Fragen ausführlicher beschreiben.',
  });

  const altShare = page.images.total ? 1 - page.images.missingAlt / page.images.total : 1;
  add({
    id: 'alt',
    category: 'inhalte',
    title: 'Bildbeschreibungen (Alt-Texte)',
    weight: 1,
    status: altShare >= 0.9 ? 'ok' : altShare >= 0.6 ? 'warn' : 'fail',
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
  const address = findAddress(page.text) ?? findAddress(allText);
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
    status: findAddress(page.text) ? 'ok' : address ? 'warn' : 'fail',
    detail: findAddress(page.text)
      ? `Die Adresse (${address?.zip} ${address?.city}) steht auf der Startseite.`
      : address
        ? 'Die Adresse steht nur auf Unterseiten, nicht auf der Startseite.'
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

  add({
    id: 'gbp',
    category: 'lokal',
    title: 'Google-Unternehmensprofil',
    weight: 1,
    status: 'info',
    detail: 'Das Profil in Google Maps prüfen wir gern persönlich mit dir. Dort entscheidet sich, wer in der Karte oben steht.',
  });

  // ---------------- Sichtbarkeit ----------------
  if (rankings.available) {
    add({
      id: 'kw-top10',
      category: 'sichtbarkeit',
      title: 'Suchbegriffe auf Seite 1',
      weight: 3,
      status: rankings.top10 >= 10 ? 'ok' : rankings.top10 >= 1 ? 'warn' : 'fail',
      detail:
        rankings.top10 === 0
          ? 'Für keinen Suchbegriff steht die Website auf Seite 1 bei Google.'
          : `Für ${fmt(rankings.top10)} Suchbegriffe steht die Website auf Seite 1, davon ${fmt(rankings.top3)} unter den ersten drei.`,
      fix: 'Seiten gezielt auf die Begriffe ausrichten, nach denen deine Kunden suchen.',
    });
    add({
      id: 'kw-total',
      category: 'sichtbarkeit',
      title: 'Suchbegriffe insgesamt',
      weight: 2,
      status: rankings.total >= 50 ? 'ok' : rankings.total >= 10 ? 'warn' : 'fail',
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
  // Sichtbarkeit zaehlt am meisten: eine technisch saubere Seite, die bei
  // Google nicht erscheint, soll keine Spitzennote bekommen.
  const weights: [number | null, number][] = [
    [categories.technik, 0.25],
    [categories.inhalte, 0.25],
    [categories.lokal, 0.15],
    [categories.sichtbarkeit, 0.35],
  ];
  const usable = weights.filter((w): w is [number, number] => w[0] !== null);
  const wsum = usable.reduce((a, [, w]) => a + w, 0);
  const score = Math.round(usable.reduce((a, [v, w]) => a + v * w, 0) / wsum);

  return {
    url: inputUrl,
    finalUrl: home.finalUrl,
    domain,
    checkedAt: new Date().toISOString(),
    score,
    categories,
    checks,
    measures: buildMeasures(checks, rankings),
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
};

function buildMeasures(checks: CheckItem[], rankings: RankingData): Measure[] {
  const measures: Measure[] = [];
  if (rankings.available && rankings.potentials.length) {
    const names = rankings.potentials.slice(0, 3).map((k) => `„${k.keyword}“ (Platz ${k.position})`).join(', ');
    measures.push({
      category: 'sichtbarkeit',
      title: 'Begriffe auf Platz 4 bis 20 nach vorne holen',
      why: 'Diese Begriffe werden schon gesucht und du stehst knapp hinter den Plätzen, die die meisten Klicks bekommen. Hier bringt wenig Arbeit am meisten.',
      how: `Die passenden Seiten gezielt auf diese Begriffe ausbauen: ${names}.`,
    });
  }
  const ranked = checks
    .filter((c) => (c.status === 'fail' || c.status === 'warn') && c.fix)
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
  // Ist die Website technisch sauber, bleiben die Hebel ausserhalb der
  // Seite. Die gelten fuer jeden lokalen Betrieb und fuellen auf fuenf auf.
  for (const m of EVERGREEN_MEASURES) {
    if (measures.length >= 5) break;
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
export function redactResult(result: SeoCheckResult): SeoCheckResult {
  return {
    ...result,
    checks: result.checks.map(({ fix: _fix, ...rest }) => rest),
    measures: result.measures.map((m) => ({ ...m, how: '' })),
    rankings: {
      ...result.rankings,
      error: undefined,
      top: [],
      potentials: [],
    },
  };
}
