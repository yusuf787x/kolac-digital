import 'server-only';
import { createHash, randomBytes } from 'crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { Resend } from 'resend';
import { adminDb } from './firebase-admin';
import { emailLayout, esc } from './email-layout';

/**
 * Newsletter-Einwilligung mit Double-Opt-in (§ 7 UWG, Art. 6 Abs. 1 lit. a DSGVO).
 * Collection `newsletterSubscribers`, Dokument-ID = Hash der Mail-Adresse.
 * Status: pending (Mail verschickt) → confirmed (Link geklickt) → unsubscribed.
 * Es gibt noch keinen Versand von Newslettern, nur die Liste mit Nachweis.
 */

export const NEWSLETTER_CONSENT_TEXT =
  'Ja, ich möchte gelegentlich Neuigkeiten und Tipps von Kolac Digital per E-Mail bekommen. Abmelden geht jederzeit.';

const COL = 'newsletterSubscribers';
const BASE = 'https://www.kolac-digital.de';
const idOf = (email: string) => createHash('sha256').update(email.trim().toLowerCase()).digest('hex').slice(0, 40);

export async function startNewsletterOptIn(opts: {
  email: string;
  name?: string;
  source: string;
  sourceId?: string;
  ip?: string;
}): Promise<void> {
  const email = opts.email.trim().toLowerCase();
  if (!email.includes('@')) return;
  const ref = adminDb().collection(COL).doc(idOf(email));
  const existing = (await ref.get()).data();
  if (existing?.status === 'confirmed') return;
  const token = randomBytes(24).toString('hex');
  await ref.set(
    {
      email,
      name: opts.name ?? '',
      status: 'pending',
      token,
      source: opts.source,
      ...(opts.sourceId ? { sourceId: opts.sourceId } : {}),
      consentText: NEWSLETTER_CONSENT_TEXT,
      consentAt: FieldValue.serverTimestamp(),
      // IP nur gekürzt als Nachweis der Einwilligung
      ...(opts.ip ? { consentIp: opts.ip } : {}),
      updatedAt: FieldValue.serverTimestamp(),
      ...(existing ? {} : { createdAt: FieldValue.serverTimestamp() }),
    },
    { merge: true },
  );

  if (!process.env.RESEND_API_KEY) {
    console.error('Newsletter: RESEND_API_KEY fehlt, keine Bestätigungsmail.');
    return;
  }
  const first = (opts.name ?? '').trim().split(/\s+/)[0];
  const html = emailLayout({
    preheader: 'Ein Klick, dann ist deine Anmeldung bestätigt.',
    bodyHtml: `<p>Hallo${first ? ` ${esc(first)}` : ''},</p>
<p>du hast beim SEO-Check angegeben, dass du gelegentlich Neuigkeiten und Tipps von Kolac Digital per E-Mail bekommen möchtest. Bitte bestätige das mit einem Klick.</p>
<p>Kam das nicht von dir? Dann ignorier diese Mail einfach, es passiert nichts.</p>`,
    button: { label: 'Anmeldung bestätigen', href: `${BASE}/api/newsletter/bestaetigen?t=${token}` },
    footnote: `Abmelden geht jederzeit über den Link in jeder Mail oder <a href="${BASE}/api/newsletter/abmelden?t=${token}" style="color:inherit;">hier</a>.`,
    closing: 'Viele Grüße',
  });
  const { error } = await new Resend(process.env.RESEND_API_KEY).emails.send({
    from: 'Kolac Digital <yusuf@kolac-digital.de>',
    replyTo: 'yusuf@kolac-digital.de',
    to: email,
    subject: 'Bitte bestätige deine Anmeldung',
    html,
    text: `Hallo${first ? ` ${first}` : ''},\n\ndu hast beim SEO-Check angegeben, dass du gelegentlich Neuigkeiten und Tipps von Kolac Digital per E-Mail bekommen möchtest. Bitte bestätige das hier:\n${BASE}/api/newsletter/bestaetigen?t=${token}\n\nKam das nicht von dir? Dann ignorier diese Mail einfach.\n\nViele Grüße\nYusuf Kolac`,
  });
  if (error) console.error('Newsletter-Bestätigungsmail:', error);
}

export async function setNewsletterStatus(token: string, status: 'confirmed' | 'unsubscribed'): Promise<boolean> {
  if (!/^[a-f0-9]{48}$/.test(token)) return false;
  const snap = await adminDb().collection(COL).where('token', '==', token).limit(1).get();
  if (snap.empty) return false;
  await snap.docs[0].ref.update({
    status,
    ...(status === 'confirmed' ? { confirmedAt: FieldValue.serverTimestamp() } : { unsubscribedAt: FieldValue.serverTimestamp() }),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return true;
}

/** Schlichte Antwortseite im Kolac-Stil für die Links aus der Mail. */
export function newsletterPage(title: string, text: string): Response {
  const html = `<!DOCTYPE html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>${esc(title)} | Kolac Digital</title></head>
<body style="margin:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0a0a0a;">
<main style="max-width:520px;margin:12vh auto;padding:32px 24px;background:#fff;border:1px solid #e5e7eb;border-radius:20px;">
<h1 style="font-size:22px;margin:0 0 12px;">${esc(title)}</h1>
<p style="font-size:16px;line-height:1.6;color:#4b5563;margin:0 0 24px;">${esc(text)}</p>
<a href="${BASE}/" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 20px;border-radius:12px;font-weight:600;">Zur Website</a>
</main></body></html>`;
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
