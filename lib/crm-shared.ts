/** Reine Hilfen fürs CRM, auch auf dem Server nutzbar (kein Firestore-Client). */

/** "https://www.Beispiel.de/kontakt" → "beispiel.de". Leer bei Unsinn. */
export function normalizeDomain(input: string | undefined | null): string {
  if (!input) return '';
  let s = input.trim().toLowerCase();
  if (!s) return '';
  if (s.includes('@')) s = s.split('@').pop() ?? '';
  s = s.replace(/^[a-z]+:\/\//, '').replace(/^www\./, '');
  s = s.split(/[/?#]/)[0];
  return /^[a-z0-9.-]+\.[a-z]{2,}$/.test(s) ? s : '';
}

export const FREEMAIL = new Set([
  'gmail.com',
  'googlemail.com',
  'web.de',
  'gmx.de',
  'gmx.net',
  'gmx.at',
  't-online.de',
  'outlook.com',
  'outlook.de',
  'hotmail.com',
  'hotmail.de',
  'live.de',
  'live.com',
  'icloud.com',
  'me.com',
  'yahoo.com',
  'yahoo.de',
  'aol.com',
  'freenet.de',
  'posteo.de',
  'mail.de',
  'online.de',
  'arcor.de',
]);

/** Firmen-Domain aus einer Mail-Adresse, leer bei Freemailern. */
export function companyDomainFromEmail(email: string | undefined | null): string {
  const d = normalizeDomain(email ?? '');
  return d && !FREEMAIL.has(d) ? d : '';
}


/** Gmail nur lesen: Mails in der Kundenakte (app/api/crm/mails). */
export const GMAIL_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly';
