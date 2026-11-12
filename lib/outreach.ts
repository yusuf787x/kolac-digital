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
  /** Instagram-Name ohne @. */
  instagram?: string;
  scan?: OutreachScan;
  dm?: string;
  followup?: string;
  status: OutreachStatus;
  sentAt?: string;
  followedUpAt?: string;
  repliedAt?: string;
  note?: string;
  updatedAt?: string;
}

/** Felder, die nur im Dashboard gepflegt werden. Ein Push aus Claude Code ueberschreibt sie nie. */
export const OUTREACH_MANUAL_FIELDS = ['status', 'sentAt', 'followedUpAt', 'repliedAt', 'note'] as const;

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

export const instagramUrl = (handle: string) => `https://www.instagram.com/${encodeURIComponent(handle)}/`;
export const instagramSearchUrl = (l: Pick<OutreachLead, 'name' | 'city'>) =>
  `https://www.google.com/search?q=${encodeURIComponent(`site:instagram.com "${l.name}" ${l.city ?? ''}`.trim())}`;
