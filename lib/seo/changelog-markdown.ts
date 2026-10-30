import { normalizeText } from './analysis';
import { extractLinks } from './links';
import type { ActivityLink, SeoActivityStatus } from './types';

/**
 * Parser fuer Aenderungsprotokolle im Format, das in den Kundenprojekten
 * gepflegt wird (z. B. clients/Motorenfachmann/CHANGELOG.md):
 *
 *   ## 28.10.2026                      Datum (auch 2026-10-28)
 *   ### Inhalte                        Bereich
 *   | Status | Änderung | Nutzen | Nachweis |   Spalten "Wo"/"Umfang" und
 *   |---|---|---|---|                        "Nachweis"/"Link" sind optional
 *   | ✅ | Text | Text | [Seite ansehen](https://...) |
 *
 *   ## Offene Punkte                   wird zu Status "planned"
 *   - [ ] **Bereich:** Text
 *
 * Wird im Browser (Import-Dialog) und auf dem Server (Claude-Code-
 * Schnittstelle /api/seo/changelog) gleich verwendet. Jeder Eintrag
 * bekommt einen stabilen Schluessel aus Datum, Bereich und Text, damit
 * wiederholtes Senden keine Dubletten erzeugt und ein Statuswechsel
 * (🟡 -> ✅) den vorhandenen Eintrag aktualisiert.
 */

export interface ParsedChangelogEntry {
  key: string;
  /** YYYY-MM-DD */
  date: string;
  area: string;
  change: string;
  benefit?: string;
  scope?: string;
  status: SeoActivityStatus;
  links?: ActivityLink[];
}

export interface ParseResult {
  entries: ParsedChangelogEntry[];
  warnings: string[];
}

const STATUS_BY_EMOJI: Array<[RegExp, SeoActivityStatus]> = [
  [/✅|✔️|☑️|\bdone\b|\blive\b/i, 'done'],
  [/🟡|🚧|vorbereitet/i, 'prepared'],
  [/🔍|geprüft|geprueft/i, 'checked'],
  [/⏳|🔜|📅|geplant|offen/i, 'planned'],
];

function statusFrom(cell: string): SeoActivityStatus {
  for (const [re, status] of STATUS_BY_EMOJI) if (re.test(cell)) return status;
  return 'done';
}

/** 53-Bit-Hash (cyrb53), laeuft ohne crypto in Browser und Node. */
export function stableHash(input: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

export function entryKey(e: Pick<ParsedChangelogEntry, 'date' | 'area' | 'change' | 'status'>): string {
  // Geplante Punkte haben kein echtes Datum, ihr Schluessel haengt nur am Text.
  const datePart = e.status === 'planned' ? 'planned' : e.date;
  return stableHash(`${datePart}|${normalizeText(e.area)}|${normalizeText(e.change)}`);
}

function parseDateHeading(text: string): string | null {
  const de = text.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (de) {
    return `${de[3]}-${de[2].padStart(2, '0')}-${de[1].padStart(2, '0')}`;
  }
  const iso = text.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  return null;
}

/** Tabellenzeile in Zellen zerlegen, escapte Pipes (\|) bleiben erhalten. */
function splitRow(line: string): string[] {
  const inner = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  return inner
    .split(/(?<!\\)\|/)
    .map((c) => c.replace(/\\\|/g, '|').trim());
}

const isSeparator = (line: string) => /^\|?\s*:?-{2,}/.test(line.trim());

type ColumnRole = 'status' | 'change' | 'benefit' | 'scope' | 'links' | 'ignore';

function roleOf(header: string, index: number): ColumnRole {
  const h = normalizeText(header);
  if (/status/.test(h)) return 'status';
  if (/nachweis|link|ansehen|beleg|quelle|pruefen/.test(h)) return 'links';
  if (/aenderung|massnahme|pruefung|was|aufgabe|change/.test(h)) return 'change';
  if (/nutzen|ergebnis|wirkung|warum|vorteil|benefit/.test(h)) return 'benefit';
  if (/^wo$|umfang|ort|seiten|wo /.test(h)) return 'scope';
  return index === 0 ? 'status' : index === 1 ? 'change' : 'benefit';
}

export function parseChangelogMarkdown(
  markdown: string,
  opts: { fallbackDate: string },
): ParseResult {
  const entries: ParsedChangelogEntry[] = [];
  const warnings: string[] = [];
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');

  let date: string | null = null;
  let lastDate: string | null = null;
  let openSection = false;
  let area = 'Allgemein';
  let roles: ColumnRole[] | null = null;

  const push = (e: Omit<ParsedChangelogEntry, 'key'>) => {
    if (!e.change.trim()) return;
    entries.push({ ...e, key: entryKey(e) });
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    const h2 = trimmed.match(/^##\s+(.+)$/);
    if (h2 && !trimmed.startsWith('###')) {
      roles = null;
      area = 'Allgemein';
      const d = parseDateHeading(h2[1]);
      if (d) {
        date = d;
        lastDate = d;
        openSection = false;
      } else {
        date = null;
        openSection = /offen|geplant|naechst|nächst|todo|ausblick/i.test(h2[1]);
      }
      continue;
    }

    const h3 = trimmed.match(/^###\s+(.+)$/);
    if (h3) {
      area = h3[1].replace(/[*_`]/g, '').trim();
      roles = null;
      continue;
    }

    // Tabellen nur innerhalb eines Datums-Abschnitts
    if (trimmed.startsWith('|') && date) {
      const next = lines[i + 1]?.trim() ?? '';
      if (!roles && isSeparator(next)) {
        roles = splitRow(trimmed).map(roleOf);
        i++; // Trennzeile ueberspringen
        continue;
      }
      if (!roles) continue;
      const cells = splitRow(trimmed);
      const pick = (role: ColumnRole) => {
        const idx = roles!.indexOf(role);
        return idx >= 0 ? (cells[idx] ?? '').trim() : '';
      };
      const statusCell = pick('status');
      const links = extractLinks(pick('links'));
      push({
        date,
        area,
        change: pick('change'),
        benefit: pick('benefit') || undefined,
        scope: pick('scope') || undefined,
        status: statusFrom(statusCell),
        ...(links.length ? { links } : {}),
      });
      continue;
    }
    if (!trimmed.startsWith('|')) roles = null;

    // Aufzaehlungen: offene Punkte oder einfache Eintraege unter einem Datum
    const bullet = trimmed.match(/^[-*]\s+(\[( |x|X)\]\s+)?(.+)$/);
    if (bullet && (openSection || date)) {
      const checked = bullet[2]?.toLowerCase() === 'x';
      let text = bullet[3].trim();
      let itemArea = area;
      const prefix = text.match(/^\*\*([^*]+?):?\*\*:?\s*(.+)$/);
      if (prefix) {
        itemArea = prefix[1].replace(/:$/, '').trim();
        text = prefix[2].trim();
      }
      const isTask = bullet[1] !== undefined;
      const status: SeoActivityStatus = openSection
        ? checked
          ? 'done'
          : 'planned'
        : isTask && !checked
          ? 'planned'
          : statusFrom(text);
      push({
        date: date ?? lastDate ?? opts.fallbackDate,
        area: itemArea,
        change: text.replace(/^(✅|🟡|🔍|⏳)\s*/u, ''),
        status,
      });
    }
  }

  if (entries.length === 0) {
    warnings.push(
      'Keine Einträge erkannt. Erwartet werden Überschriften mit Datum (## 28.10.2026) und darunter Tabellen oder Aufzählungen.',
    );
  }

  // Doppelte Schluessel innerhalb einer Datei zusammenfassen (letzter gewinnt)
  const byKey = new Map<string, ParsedChangelogEntry>();
  for (const e of entries) byKey.set(e.key, e);
  return { entries: [...byKey.values()], warnings };
}

/** Markdown-Hervorhebungen fuer reine Textausgabe (PDF, Mail) entfernen. */
export function stripInlineMarkdown(s: string): string {
  return s
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
}
