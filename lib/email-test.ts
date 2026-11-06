import 'server-only';
import { OWNER_EMAIL } from '@/lib/owner';

/**
 * Testversand: dieselbe Mail wie für den Kunden, aber nur an Yusuf und
 * mit "[Test]" im Betreff. So lässt sich vor dem echten Versand prüfen,
 * wie die Mail im eigenen Postfach (Outlook, Gmail, Handy) aussieht.
 */
export const TEST_RECIPIENT = OWNER_EMAIL;

export function asTestMail<T extends { subject: string }>(mail: T): T {
  return { ...mail, subject: `[Test] ${mail.subject}` };
}
