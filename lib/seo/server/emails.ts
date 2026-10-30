import 'server-only';
import { Resend } from 'resend';
import { OWNER_EMAIL } from '@/lib/owner';
import { isProduction, portalBaseUrl } from './config';

/**
 * Mails des Kundenportals. Eigenes, schlichtes Layout statt der
 * Standard-Firebase-Mail. Sie-Form, keine Gedankenstriche.
 *
 * Lokal ohne RESEND_API_KEY wird der Inhalt (inkl. Login-Link) nur in
 * die Server-Konsole geschrieben, damit sich der Ablauf testen laesst.
 */

const FROM = 'Kolac Digital <yusuf@kolac-digital.de>';
const REPLY_TO = OWNER_EMAIL;

const esc = (s: string) =>
  (s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

function layout(opts: { preheader: string; title: string; bodyHtml: string; button?: { label: string; href: string }; footnote?: string }): string {
  const base = portalBaseUrl();
  const logo = `${base}/email/logo.png`;
  const button = opts.button
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 8px;"><tr><td style="border-radius:10px;background:#2563eb;">
        <a href="${esc(opts.button.href)}" style="display:inline-block;padding:14px 22px;font-size:16px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px;">${esc(opts.button.label)}</a>
      </td></tr></table>`
    : '';
  return `<!DOCTYPE html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(opts.title)}</title></head>
<body style="margin:0;padding:0;background:#f3f4f6;">
<span style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(opts.preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f3f4f6;padding:32px 12px;">
<tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#ffffff;border-radius:16px;border:1px solid #e5e7eb;">
    <tr><td style="padding:28px 32px 0;"><img src="${logo}" alt="Kolac Digital" width="120" style="display:block;border:0;width:120px;height:auto;"></td></tr>
    <tr><td style="padding:20px 32px 32px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0a0a0a;font-size:16px;line-height:1.6;">
      <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;font-weight:700;">${esc(opts.title)}</h1>
      ${opts.bodyHtml}
      ${button}
      ${opts.footnote ? `<p style="margin:24px 0 0;font-size:13px;color:#6b7280;">${opts.footnote}</p>` : ''}
    </td></tr>
  </table>
  <p style="margin:16px 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:12px;color:#9ca3af;">Kolac Digital · Beckhausstraße 108 · 33611 Bielefeld</p>
</td></tr></table></body></html>`;
}

async function send(opts: { to: string | string[]; subject: string; html: string; text: string }): Promise<void> {
  if (!isProduction) {
    console.log(`\n[Portal-Mail] An: ${[opts.to].flat().join(', ')}\nBetreff: ${opts.subject}\n${opts.text}\n`);
  }
  if (!process.env.RESEND_API_KEY) {
    if (isProduction) throw new Error('RESEND_API_KEY nicht gesetzt.');
    return;
  }
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: FROM,
    to: opts.to,
    replyTo: REPLY_TO,
    subject: opts.subject,
    html: opts.html,
    text: opts.text,
  });
  if (error) throw new Error(`Mailversand fehlgeschlagen: ${error.message}`);
}

export async function sendLoginLinkEmail(opts: {
  to: string;
  link: string;
  displayName: string;
  invite: boolean;
}): Promise<void> {
  const title = opts.invite ? 'Ihr Zugang zum Kundenbereich' : 'Ihr Anmelde-Link';
  const intro = opts.invite
    ? `<p style="margin:0 0 12px;">Guten Tag,</p><p style="margin:0 0 12px;">für <strong>${esc(opts.displayName)}</strong> gibt es ab sofort einen eigenen Kundenbereich bei Kolac Digital. Dort sehen Sie jeden Monat, wie Ihre Website bei Google gefunden wird, und was wir dafür getan haben.</p><p style="margin:0;">Ein Passwort brauchen Sie nicht. Klicken Sie einfach auf den Knopf:</p>`
    : `<p style="margin:0 0 12px;">Guten Tag,</p><p style="margin:0;">mit diesem Knopf melden Sie sich im Kundenbereich von <strong>${esc(opts.displayName)}</strong> an:</p>`;
  const footnote =
    'Der Link ist eine Stunde gültig und funktioniert nur einmal. Wenn Sie diese Anmeldung nicht angefordert haben, können Sie die Mail einfach ignorieren.';
  await send({
    to: opts.to,
    subject: opts.invite ? `Ihr Kundenbereich bei Kolac Digital` : 'Ihr Anmelde-Link für den Kundenbereich',
    html: layout({
      preheader: 'Ein Klick und Sie sind angemeldet.',
      title,
      bodyHtml: intro,
      button: { label: 'Jetzt anmelden', href: opts.link },
      footnote: esc(footnote),
    }),
    text: [
      'Guten Tag,',
      '',
      opts.invite
        ? `für ${opts.displayName} gibt es ab sofort einen eigenen Kundenbereich bei Kolac Digital.`
        : `mit diesem Link melden Sie sich im Kundenbereich von ${opts.displayName} an:`,
      '',
      opts.link,
      '',
      footnote,
    ].join('\n'),
  });
}

export async function sendReportReleasedEmail(opts: {
  to: string[];
  displayName: string;
  monthLabel: string;
  portalLink: string;
  assessment: string;
}): Promise<void> {
  // Erster Absatz der Einschaetzung als Vorgeschmack
  const teaser = opts.assessment.split(/\n\s*\n/)[0]?.trim() ?? '';
  const bodyHtml = `<p style="margin:0 0 12px;">Guten Tag,</p>
<p style="margin:0 0 12px;">Ihr SEO-Bericht für <strong>${esc(opts.monthLabel)}</strong> ist fertig.</p>
${teaser ? `<p style="margin:0 0 12px;padding:14px 16px;background:#f9fafb;border-radius:10px;border:1px solid #e5e7eb;">${esc(teaser)}</p>` : ''}
<p style="margin:0;">Im Kundenbereich finden Sie alle Zahlen, die Entwicklung der letzten Monate, alles was wir für Sie getan haben, und den Bericht als PDF.</p>`;
  await send({
    to: opts.to,
    subject: `Ihr SEO-Bericht ${opts.monthLabel} ist da`,
    html: layout({
      preheader: teaser.slice(0, 120) || `Ihr Bericht für ${opts.monthLabel}`,
      title: `Ihr Bericht für ${opts.monthLabel}`,
      bodyHtml,
      button: { label: 'Bericht ansehen', href: opts.portalLink },
      footnote: 'Fragen zum Bericht? Antworten Sie einfach auf diese Mail.',
    }),
    text: [
      'Guten Tag,',
      '',
      `Ihr SEO-Bericht für ${opts.monthLabel} ist fertig.`,
      '',
      teaser,
      '',
      `Bericht ansehen: ${opts.portalLink}`,
      '',
      'Fragen zum Bericht? Antworten Sie einfach auf diese Mail.',
    ].join('\n'),
  });
}

export async function sendReportsReadyEmail(opts: {
  items: Array<{ displayName: string; monthLabel: string; adminLink: string }>;
  errors: Array<{ displayName: string; message: string }>;
}): Promise<void> {
  const list = opts.items
    .map(
      (i) =>
        `<li style="margin:0 0 8px;"><a href="${esc(i.adminLink)}" style="color:#2563eb;font-weight:600;">${esc(i.displayName)}</a>, ${esc(i.monthLabel)}</li>`,
    )
    .join('');
  const errs = opts.errors.length
    ? `<p style="margin:16px 0 8px;font-weight:600;color:#b91c1c;">Probleme beim Abruf:</p><ul style="margin:0;padding-left:20px;">${opts.errors
        .map((e) => `<li>${esc(e.displayName)}: ${esc(e.message)}</li>`)
        .join('')}</ul>`
    : '';
  const count = opts.items.length;
  await send({
    to: OWNER_EMAIL,
    subject: count
      ? `${count} SEO-${count === 1 ? 'Bericht wartet' : 'Berichte warten'} auf deine Freigabe`
      : 'SEO-Abruf mit Problemen',
    html: layout({
      preheader: 'Prüfen, Einschätzung ergänzen, freigeben.',
      title: count ? 'Neue Berichte zur Freigabe' : 'SEO-Abruf',
      bodyHtml: `${count ? `<p style="margin:0 0 12px;">Die Zahlen sind abgerufen und die Berichte als Entwurf erstellt. Bitte prüfen, Einschätzung ergänzen und freigeben:</p><ul style="margin:0;padding-left:20px;">${list}</ul>` : ''}${errs}`,
      button: { label: 'Zur SEO-Übersicht', href: `${portalBaseUrl()}/dashboard/seo` },
      footnote: 'Die Kunden bekommen erst eine Mail, wenn du auf „Bericht freigeben und senden“ klickst.',
    }),
    text: [
      ...opts.items.map((i) => `${i.displayName}, ${i.monthLabel}: ${i.adminLink}`),
      ...opts.errors.map((e) => `FEHLER ${e.displayName}: ${e.message}`),
    ].join('\n'),
  });
}
