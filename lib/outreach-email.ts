import 'server-only';
import { safeFetch } from './seo-check/safe-fetch';

/**
 * E-Mail-Adresse eines Betriebs von seiner Website holen: Startseite, dann
 * Impressum und Kontakt (Pflichtangabe nach § 5 DDG, steht fast immer dort).
 * Hoechstens 4 Seiten, gleiche Domain, ueber safeFetch (kein Zugriff auf interne Netze).
 */

const FOUND = /[a-z0-9._%+-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}/gi;
const IGNORE = /(noreply|no-reply|donotreply|example\.|sentry|wixpress|godaddy|domain\.|ihre-?domain|beispiel|jimdo|ionos|strato|webador|wordpress|@2x|\.(png|jpe?g|gif|webp|svg)$)/i;
/** Buchungs- und Linkportale: deren Adresse gehoert dem Portal, nicht dem Betrieb. */
const PLATFORM = /(^|\.)(beautinda|treatwell|planity|studiobookr|shore|booksy|fresha|etermin|doctolib|linktr|linktree|instagram|facebook|wa|whatsapp|google|business\.site|jimdosite|wixsite|my-salon|salonkee|timify|calendly|meinsalon|termin(land|o))\./i;
const SUBPAGE = /href=["']([^"'#]*(impressum|imprint|kontakt|contact)[^"'#]*)["']/gi;

function decode(html: string): string {
  return html
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/\s*(\[at\]|\(at\)|\{at\})\s*/gi, '@')
    .replace(/\s*(\[punkt\]|\(punkt\)|\[dot\]|\(dot\))\s*/gi, '.')
    .replace(/%40/g, '@');
}

function emailsIn(html: string): string[] {
  return [...new Set((decode(html).match(FOUND) ?? []).map((e) => e.toLowerCase().replace(/^mailto:/, '')))].filter(
    (e) => !IGNORE.test(e) && !PLATFORM.test(`${e.split('@')[1]}.`),
  );
}

const hostOf = (u: string) => {
  try {
    return new URL(u).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
};

/** Bevorzugt: Adresse auf der eigenen Domain, dann persoenliche vor info@, dann irgendeine. */
function pick(emails: string[], host: string): string | null {
  if (!emails.length) return null;
  const own = emails.filter((e) => host && e.endsWith(`@${host}`));
  const pool = own.length ? own : emails;
  const generic = /^(info|kontakt|mail|office|hallo|hello|post|service|team|termin)@/;
  return pool.find((e) => generic.test(e)) ?? pool[0];
}

export async function findEmail(website: string): Promise<string | null> {
  const start = /^https?:\/\//i.test(website) ? website : `https://${website}`;
  let home;
  try {
    home = await safeFetch(start, { timeoutMs: 8000, maxBytes: 800_000 });
  } catch {
    return null;
  }
  const host = hostOf(home.finalUrl);
  if (PLATFORM.test(`${host}.`) || PLATFORM.test(`${hostOf(start)}.`)) return null;
  const found = emailsIn(home.body);

  // Impressum und Kontakt der gleichen Domain, Impressum zuerst
  const links = [...home.body.matchAll(SUBPAGE)]
    .map((m) => {
      try {
        return new URL(m[1], home.finalUrl).toString();
      } catch {
        return '';
      }
    })
    .filter((u) => u && hostOf(u) === host)
    .sort((a, b) => Number(/kontakt|contact/i.test(a)) - Number(/kontakt|contact/i.test(b)));
  for (const url of [...new Set(links)].slice(0, 3)) {
    if (pick(found, host)?.endsWith(`@${host}`)) break;
    try {
      const page = await safeFetch(url, { timeoutMs: 8000, maxBytes: 800_000 });
      found.push(...emailsIn(page.body));
    } catch {
      // Unterseite nicht erreichbar: mit dem weitermachen, was da ist
    }
  }
  return pick([...new Set(found)], host);
}
