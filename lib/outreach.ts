/**
 * Instagram-Outreach: Betriebe, die Claude Code findet, prueft und mit
 * einem DM-Entwurf versieht. Yusuf schickt jede Nachricht selbst ueber
 * Instagram ab und pflegt hier den Status. Collection: outreachLeads
 * (Dokument-ID = Lead-ID aus scripts/outreach, z. B. "cid-123").
 */

export type OutreachStatus =
  | 'neu'
  | 'gesendet'
  | 'nachgefasst'
  | 'geantwortet'
  | 'termin'
  | 'kunde'
  | 'kein-interesse'
  | 'ausgeschlossen';

export interface OutreachScan {
  at: string;
  ok: boolean;
  error?: string;
  finalUrl?: string;
  https?: boolean;
  viewport?: boolean;
  platform?: string;
  copyrightYear?: number;
  booking?: string;
  responseMs?: number;
  /** Laienverstaendliche Funde, wichtigster zuerst. */
  findings: string[];
  /** 0 bis 10: wie viel Hebel die Ansprache hat. */
  priority: number;
  seoScore?: number;
  top10?: number;
}

export interface OutreachLead {
  id: string;
  name: string;
  category?: string;
  address?: string;
  city?: string;
  phone?: string;
  website?: string;
  rating?: number;
  reviews?: number;
  mapsUrl?: string;
  /** Suche, ueber die der Betrieb gefunden wurde, z. B. "Kosmetikstudio Bielefeld". */
  query: string;
  foundAt: string;
  /** Bedarf geprueft und Instagram gefunden (scripts/outreach/promote.mts): darf angeschrieben werden, auch ohne fertigen Text. */
  bedarf?: boolean;
  /** Ansprechpartner (Inhaber), falls bekannt, z. B. aus dem alten Leads-Modul. */
  contact?: string;
  /** Instagram-Name ohne @. Leer, wenn Yusuf „Kein Instagram“ gedrückt hat. */
  instagram?: string;
  /** "mail": kein (passendes) Instagram, Ansprache per E-Mail mit Auswertung der Website. */
  channel?: 'mail' | 'instagram';
  /** Instagram-Name, den Yusuf mit „Kein Instagram“ verworfen hat (für „Doch per Instagram“). */
  igRejected?: string;
  /** E-Mail-Adresse aus dem Impressum der Website oder von Yusuf eingetragen. */
  email?: string;
  /** E-Mail an den Betrieb (Betreff, Text, Nachfassen), von Claude geschrieben. */
  mailSubject?: string;
  mailBody?: string;
  mailFollowup?: string;
  /** Oeffentliche Profildaten, von Claude Code ausgelesen. */
  ig?: {
    checkedAt: string;
    handle: string;
    fullName?: string;
    bio?: string;
    link?: string;
    followers?: number;
    posts?: number;
    lastPostAt?: string;
    category?: string;
    private?: boolean;
  };
  scan?: OutreachScan;
  dm?: string;
  followup?: string;
  status: OutreachStatus;
  sentAt?: string;
  followedUpAt?: string;
  repliedAt?: string;
  note?: string;
  /** Antworten des Studios und Yusufs Nachrichten danach, aelteste zuerst. */
  thread?: OutreachMessage[];
  updatedAt?: string;
}

/** Felder, die nur im Dashboard gepflegt werden (auch Kanal und Mail-Texte). Ein Push aus Claude Code ueberschreibt sie nie. */
export const OUTREACH_MANUAL_FIELDS = ['status', 'sentAt', 'followedUpAt', 'repliedAt', 'note', 'thread', 'channel', 'email', 'mailSubject', 'mailBody', 'mailFollowup'] as const;

export const OUTREACH_STATUS_LABELS: Record<OutreachStatus, string> = {
  neu: 'Neu',
  gesendet: 'Gesendet',
  nachgefasst: 'Nachgefasst',
  geantwortet: 'Geantwortet',
  termin: 'Termin',
  kunde: 'Kunde',
  'kein-interesse': 'Kein Interesse',
  ausgeschlossen: 'Ausgeschlossen',
};

export const OUTREACH_STATUS_BADGES: Record<OutreachStatus, string> = {
  neu: 'bg-gray-100 text-gray-600',
  gesendet: 'bg-blue-50 text-blue-700',
  nachgefasst: 'bg-blue-50 text-blue-700',
  geantwortet: 'bg-emerald-50 text-emerald-700',
  termin: 'bg-emerald-100 text-emerald-800',
  kunde: 'bg-emerald-600 text-white',
  'kein-interesse': 'bg-gray-100 text-gray-500',
  ausgeschlossen: 'bg-gray-100 text-gray-500',
};

/** Hoechstens so viele Erst-Nachrichten und Nachfass-Nachrichten pro Tag (Sperr- und Spam-Schutz). */
export const OUTREACH_DAILY_LIMIT = 25;
/** Nachgefasst wird einmal, so viele Tage nach der ersten Nachricht. */
export const OUTREACH_FOLLOWUP_DAYS = 3;

export function normalizeInstagram(raw: string): string {
  return raw
    .trim()
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, '')
    .replace(/^@/, '')
    .replace(/[/?#].*$/, '');
}

export const isMailLead = (l: Pick<OutreachLead, 'channel'>) => l.channel === 'mail';

export const EMAIL_RE = /^[^\s@<>()]+@[^\s@<>()]+\.[a-z]{2,}$/i;

/** Öffnet das Mailprogramm mit Empfänger, Betreff und Text. */
export const mailtoUrl = (to: string, subject: string, body: string) =>
  `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

export const instagramUrl = (handle: string) => `https://www.instagram.com/${encodeURIComponent(handle)}/`;
export const instagramSearchUrl = (l: Pick<OutreachLead, 'name' | 'city'>) =>
  `https://www.google.com/search?q=${encodeURIComponent(`site:instagram.com "${l.name}" ${l.city ?? ''}`.trim())}`;

// --- Gespraechsverlauf ---

export interface OutreachMessage {
  from: 'studio' | 'yusuf';
  text: string;
  at: string;
}

// --- Pruefung vor dem Versand ---

const BANNED: [RegExp, string][] = [
  [/ich hoffe,? (es geht|du hast|ihr habt|sie haben)/i, 'Floskel „Ich hoffe, es geht …“'],
  [/kurze frage/i, 'Floskel „kurze Frage“'],
  [/sehr geehrte/i, '„Sehr geehrte“ wirkt wie ein Werbebrief'],
  [/garantiert|100\s?%/i, 'Versprechen wie „garantiert“ oder „100 %“'],
  [/!!|\?\?/, 'doppelte Satzzeichen'],
  [/\{\{|\}\}|\[name\]|\[studio\]|lorem/i, 'Platzhalter nicht ersetzt'],
];

/**
 * Hinweise zu einer DM, bevor sie rausgeht. Nur Hinweise, nichts wird
 * blockiert: Yusuf entscheidet.
 */
/**
 * first: Erstnachricht oder Nachfassen, bevor das Studio geantwortet hat. Dann gar kein Link.
 * max: Zeichengrenze (Instagram 750, E-Mail mehr, weil die Auswertung drinsteht).
 */
export function lintMessage(text: string, opts: { first?: boolean; max?: number } = {}): string[] {
  const t = text.trim();
  const out: string[] = [];
  if (!t) return out;
  const max = opts.max ?? 750;
  if (t.length > max) out.push(`Mit ${t.length} Zeichen recht lang (Ziel unter ${max})`);
  // Erste Nachricht ohne Link (wirkt wie Werbung). In Antworten ist die eigene Case Study erlaubt, fremde Links nie.
  const links = t.match(/(https?:\/\/)?(www\.)?[a-z0-9-]+(\.[a-z0-9-]+)*\.(de|com|net|io|ee|app|co)(\/[^\s]*)?/gi) ?? [];
  if (opts.first && links.length) out.push('Erste Nachricht mit Link (den Link erst schicken, wenn sie antworten)');
  else if (links.some((l) => !/kolac-digital\.de/i.test(l))) out.push('Enthält einen fremden Link');
  if (!opts.first && links.length > 1) out.push('Mehr als ein Link');
  // Nur echte Betraege: Zitate wie "nach dem Preis ist Funkstille" sind erlaubt
  if (/\d[\d.,]*\s?(€|euro)(?![a-zäöü])|\bab \d+\s?(€|euro)/i.test(t)) out.push('Nennt einen Preis');
  for (const [re, label] of BANNED) if (re.test(t)) out.push(label);
  const du = (t.match(/\b(du|dir|dich|dein|deine|deinen|deinem|deiner|deins)\b/g) ?? []).length;
  const ihr = (t.match(/\b(ihr|euch|euer|eure|euren|eurem|eurer)\b/g) ?? []).length;
  const sie = (t.match(/(?<![.!?]\s)(?<!^)\b(Sie|Ihnen|Ihre|Ihren|Ihrem|Ihrer)\b/g) ?? []).length;
  const forms = [du && 'du', ihr && 'ihr', sie && 'Sie'].filter(Boolean);
  if (forms.length > 1) out.push(`Mischt ${forms.join(' und ')}`);
  if (!t.includes('?')) out.push('Enthält keine Frage, auf die man antworten kann');
  return out;
}

// --- Absagen erkennen ---

const OPT_OUT =
  /\b(kein(e|en)?\s+(interesse|bedarf)|nicht\s+interessiert|nein,?\s+danke|danke,?\s+nein|brauche?n?\s+(ich|wir)\s+(das\s+)?nicht|(ich|wir)\s+brauche?n?\s+(das\s+)?(nicht|keine)|bitte\s+nicht\s+mehr|nicht\s+mehr\s+(schreiben|anschreiben|kontaktieren)|(lass|lasst)\s+(mich|uns)\s+(bitte\s+)?in\s+ruhe|hör(t)?\s+auf|stop+|abmelden|spam)\b/i;

/** Klare Absage? Dann wird der Betrieb sofort und dauerhaft auf „Kein Interesse“ gesetzt. */
export function isOptOut(reply: string): boolean {
  return OPT_OUT.test(reply);
}
