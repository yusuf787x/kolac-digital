import 'server-only';
import { promises as dns } from 'node:dns';

/**
 * Kann die Domain einer E-Mail-Adresse überhaupt Mails empfangen?
 * true nur, wenn die Domain sicher nicht existiert oder weder MX- noch
 * A-Eintrag hat. Bei Zeitüberschreitung oder anderen DNS-Fehlern false,
 * damit nie eine echte Adresse abgewiesen wird.
 */
export async function emailDomainIsDead(email: string): Promise<boolean> {
  const domain = email.split('@')[1]?.trim().toLowerCase();
  if (!domain) return false;
  const timeout = <T,>(p: Promise<T>) =>
    Promise.race([p, new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 2500))]);
  const code = (e: unknown) => (e as { code?: string })?.code;

  try {
    const mx = await timeout(dns.resolveMx(domain));
    if (mx.length > 0) return false;
  } catch (e) {
    if (code(e) === 'ENOTFOUND') return true;
    if (code(e) !== 'ENODATA') return false;
  }
  try {
    const a = await timeout(dns.resolve4(domain));
    return a.length === 0;
  } catch (e) {
    return code(e) === 'ENOTFOUND' || code(e) === 'ENODATA';
  }
}
