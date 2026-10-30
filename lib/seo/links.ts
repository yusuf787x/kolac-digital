import type { ActivityLink } from './types';

/** Links zum Nachverfolgen: nur http(s), dedupliziert, hoechstens 8. */

/** Nur http(s)-Adressen, sonst null. Verhindert javascript:-Links im Portal. */
export function safeUrl(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  try {
    const u = new URL(raw.trim());
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.toString() : null;
  } catch {
    return null;
  }
}

/** Links aus Markdown ([Text](url)) und nackten URLs in einem Text. */
export function extractLinks(text: string): ActivityLink[] {
  const out: ActivityLink[] = [];
  const md = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g;
  const rest = text.replace(md, (_all, label: string, url: string) => {
    const u = safeUrl(url);
    if (u) out.push({ label: label.trim(), url: u });
    return ' ';
  });
  for (const bare of rest.match(/https?:\/\/[^\s)|]+/g) ?? []) {
    const u = safeUrl(bare);
    if (u) out.push({ label: 'Ansehen', url: u });
  }
  return dedupeLinks(out);
}

export function dedupeLinks(links: ActivityLink[]): ActivityLink[] {
  const seen = new Set<string>();
  return links.filter((l) => (seen.has(l.url) ? false : (seen.add(l.url), true))).slice(0, 8);
}

export function normalizeLinks(raw: unknown): ActivityLink[] {
  if (!Array.isArray(raw)) return [];
  const out: ActivityLink[] = [];
  for (const r of raw) {
    if (typeof r === 'string') {
      const u = safeUrl(r);
      if (u) out.push({ label: 'Ansehen', url: u });
      continue;
    }
    if (!r || typeof r !== 'object') continue;
    const o = r as Record<string, unknown>;
    const u = safeUrl(o.url);
    if (u) out.push({ label: String(o.label ?? 'Ansehen').slice(0, 80) || 'Ansehen', url: u });
  }
  return dedupeLinks(out);
}
