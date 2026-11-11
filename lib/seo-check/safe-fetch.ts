import 'server-only';
import { lookup } from 'node:dns/promises';
import net from 'node:net';

/**
 * fetch fuer fremde, vom Besucher eingegebene Adressen. Schuetzt vor
 * Anfragen an interne Netze (SSRF): jede Weiterleitung wird einzeln
 * geprueft, private und reservierte IP-Bereiche sind gesperrt, nur
 * http/https auf Standard-Ports, Antwortgroesse begrenzt.
 */

const USER_AGENT =
  'Mozilla/5.0 (compatible; KolacDigitalSeoCheck/1.0; +https://www.kolac-digital.de/seo-check)';

export class BlockedUrlError extends Error {}

function ipv4ToInt(ip: string): number {
  return ip.split('.').reduce((acc, part) => (acc << 8) + Number(part), 0) >>> 0;
}

function inV4Range(ip: string, base: string, bits: number): boolean {
  const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
  return (ipv4ToInt(ip) & mask) === (ipv4ToInt(base) & mask);
}

export function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    return [
      ['0.0.0.0', 8],
      ['10.0.0.0', 8],
      ['100.64.0.0', 10],
      ['127.0.0.0', 8],
      ['169.254.0.0', 16],
      ['172.16.0.0', 12],
      ['192.0.0.0', 24],
      ['192.168.0.0', 16],
      ['198.18.0.0', 15],
      ['224.0.0.0', 3],
    ].some(([base, bits]) => inV4Range(ip, base as string, bits as number));
  }
  if (net.isIPv6(ip)) {
    const lower = ip.toLowerCase();
    const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateIp(mapped[1]);
    return (
      lower === '::' ||
      lower === '::1' ||
      lower.startsWith('fc') ||
      lower.startsWith('fd') ||
      lower.startsWith('fe8') ||
      lower.startsWith('fe9') ||
      lower.startsWith('fea') ||
      lower.startsWith('feb') ||
      lower.startsWith('ff')
    );
  }
  return true;
}

async function assertPublicUrl(raw: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new BlockedUrlError('Ungültige Adresse.');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new BlockedUrlError('Nur http und https sind erlaubt.');
  }
  if (url.port && url.port !== '80' && url.port !== '443') {
    throw new BlockedUrlError('Nur Standard-Ports sind erlaubt.');
  }
  if (url.username || url.password) {
    throw new BlockedUrlError('Adressen mit Zugangsdaten sind nicht erlaubt.');
  }
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) {
    throw new BlockedUrlError('Diese Adresse ist nicht erreichbar.');
  }
  const addresses = net.isIP(host)
    ? [{ address: host }]
    : await lookup(host, { all: true }).catch(() => {
        throw new BlockedUrlError('Die Domain wurde nicht gefunden.');
      });
  if (!addresses.length || addresses.some((a) => isPrivateIp(a.address))) {
    throw new BlockedUrlError('Diese Adresse ist nicht erreichbar.');
  }
  return url;
}

export interface SafeResponse {
  status: number;
  finalUrl: string;
  headers: Headers;
  body: string;
  /** Zeit bis zur ersten Antwort der letzten Anfrage in ms. */
  ms: number;
  bytes: number;
  redirects: string[];
}

async function readCapped(res: Response, maxBytes: number): Promise<{ text: string; bytes: number }> {
  if (!res.body) return { text: '', bytes: 0 };
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (bytes < maxBytes) {
      const slice = value.subarray(0, Math.max(0, maxBytes - bytes));
      chunks.push(slice);
      bytes += slice.byteLength;
    }
    if (total > maxBytes * 4) {
      await reader.cancel().catch(() => {});
      break;
    }
  }
  const merged = new Uint8Array(bytes);
  let offset = 0;
  for (const c of chunks) {
    merged.set(c, offset);
    offset += c.byteLength;
  }
  return { text: new TextDecoder('utf-8', { fatal: false }).decode(merged), bytes: total };
}

export async function safeFetch(
  rawUrl: string,
  opts: { timeoutMs?: number; maxBytes?: number; method?: 'GET' | 'HEAD'; accept?: string } = {},
): Promise<SafeResponse> {
  const { timeoutMs = 10_000, maxBytes = 1_500_000, method = 'GET' } = opts;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const redirects: string[] = [];
  let current = rawUrl;
  try {
    for (let hop = 0; hop <= 5; hop++) {
      const url = await assertPublicUrl(current);
      const started = Date.now();
      const res = await fetch(url, {
        method,
        redirect: 'manual',
        signal: controller.signal,
        headers: {
          'User-Agent': USER_AGENT,
          Accept: opts.accept ?? 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'de-DE,de;q=0.9',
        },
        cache: 'no-store',
      });
      const ms = Date.now() - started;
      const location = res.headers.get('location');
      if (res.status >= 300 && res.status < 400 && location) {
        await res.body?.cancel().catch(() => {});
        current = new URL(location, url).toString();
        redirects.push(current);
        continue;
      }
      const { text, bytes } = method === 'HEAD' ? { text: '', bytes: 0 } : await readCapped(res, maxBytes);
      return { status: res.status, finalUrl: url.toString(), headers: res.headers, body: text, ms, bytes, redirects };
    }
    throw new BlockedUrlError('Zu viele Weiterleitungen.');
  } finally {
    clearTimeout(timer);
  }
}
