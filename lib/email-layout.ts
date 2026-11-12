/**
 * Gemeinsames Mail-Layout für alle Mails aus dem System (Rechnungen,
 * Zahlungserinnerungen, Vertriebsmails, Kundenportal, interne Hinweise).
 *
 * Aufbau: grauer Hintergrund, weiße Karte mit blauem Streifen oben,
 * Logo, Inhalt, Signatur (Yusuf mit Foto oder Buchhaltung) und Fußzeile
 * mit Anschrift und Links zu Impressum, Datenschutz und AGB.
 *
 * Mail-Regeln, die hier gelten:
 *  - Nur Tabellen + Inline-Styles, damit Outlook und Gmail mitspielen.
 *  - In style="..." nur einfache Anführungszeichen (siehe FONT), doppelte
 *    würden das Attribut beim Empfänger aufbrechen.
 *  - Bilder immer von der Live-Domain laden. Preview-Deployments auf
 *    Vercel sind passwortgeschützt, Bilder von dort kämen nicht an.
 */

export const BRAND = {
  blue: '#2563eb',
  ink: '#0a0a0a',
  text: '#1f2937',
  muted: '#6b7280',
  line: '#e5e7eb',
  soft: '#f9fafb',
  bg: '#f3f4f6',
} as const;

/** Inter wie auf der Website. Clients ohne Webfonts (Gmail, Outlook) nehmen die Systemschrift. */
export const FONT = `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`;

const SITE = 'https://www.kolac-digital.de';
const ASSETS = `${SITE}/email`;

export const LEGAL_LINKS: Array<[string, string]> = [
  ['Impressum', `${SITE}/impressum.html`],
  ['Datenschutz', `${SITE}/datenschutz.html`],
  ['AGB', `${SITE}/agb.html`],
];

export function esc(s: string): string {
  return (s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Wer unterschreibt. 'none' für interne Hinweise an Yusuf selbst. */
export type EmailSender = 'yusuf' | 'buchhaltung' | 'none';

const link = (href: string, label: string, color: string = BRAND.blue) =>
  `<a href="${esc(href)}" style="color:${color}; text-decoration:none;">${label}</a>`;

/** Blauer Knopf, funktioniert auch in Outlook (Tabelle statt nur <a>). */
export function emailButton(label: string, href: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0 4px;"><tr><td style="border-radius:10px; background:${BRAND.blue};">
  <a href="${esc(href)}" style="display:inline-block; padding:13px 22px; font-family:${FONT}; font-size:15px; font-weight:600; color:#ffffff; text-decoration:none; border-radius:10px;">${esc(label)}</a>
</td></tr></table>`;
}

/** Hervorgehobener Kasten, z.B. für Bankdaten oder Zitate. */
export function emailBox(innerHtml: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:18px 0;"><tr><td style="padding:14px 18px; background:${BRAND.soft}; border:1px solid ${BRAND.line}; border-left:3px solid ${BRAND.blue}; border-radius:8px; font-family:${FONT}; font-size:14px; line-height:1.6; color:${BRAND.text};">${innerHtml}</td></tr></table>`;
}

/** Zweispaltige Daten-Tabelle (Bezeichnung grau, Wert fett). Werte werden escaped. */
export function emailDataRows(rows: Array<[string, string]>): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="font-family:${FONT}; font-size:14px; line-height:1.6;">${rows
    .map(
      ([k, v]) =>
        `<tr><td style="color:${BRAND.muted}; padding:2px 18px 2px 0; vertical-align:top;">${esc(k)}</td><td style="color:${BRAND.ink}; font-weight:600; padding:2px 0;">${esc(v)}</td></tr>`,
    )
    .join('')}</table>`;
}

/** Absender für alles rund um Rechnungen, Zahlungen und Mahnungen. */
export const ACCOUNTING_FROM = 'Kolac Digital Buchhaltung <buchhaltung@kolac-digital.de>';
export const ACCOUNTING_REPLY_TO = 'buchhaltung@kolac-digital.de';

interface Persona {
  name: string;
  role: string;
  photo: string;
  phone?: { label: string; href: string };
  email: string;
}

const PERSONAS: Record<Exclude<EmailSender, 'none'>, Persona> = {
  yusuf: {
    name: 'Yusuf Kolac',
    role: 'Inhaber, Kolac Digital',
    photo: `${ASSETS}/yk-signatur.jpg`,
    phone: { label: '+49 176 95762018', href: 'tel:+4917695762018' },
    email: 'yusuf@kolac-digital.de',
  },
  buchhaltung: {
    name: 'Marci Anders',
    role: 'Buchhaltung, Kolac Digital',
    photo: `${ASSETS}/marci-signatur.jpg`,
    email: 'buchhaltung@kolac-digital.de',
  },
};

function signatureHtml(sender: EmailSender, closing?: string): string {
  if (sender === 'none') return '';
  const p = PERSONAS[sender];
  const closingHtml = closing
    ? `<p style="margin:0 0 16px; font-family:${FONT}; font-size:15px; color:${BRAND.text};">${esc(closing)}</p>`
    : '';

  return `<tr><td class="px" style="padding:0 40px 32px;">
  ${closingHtml}
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="font-family:${FONT};"><tr>
    <td style="vertical-align:top; padding-right:16px; width:72px;">
      <img src="${p.photo}" alt="${esc(p.name)}" width="72" height="72" style="display:block; border:0; width:72px; height:72px; border-radius:50%;" />
    </td>
    <td style="vertical-align:top; border-left:3px solid ${BRAND.blue}; padding:2px 0 2px 14px; font-size:14px; line-height:1.6; color:${BRAND.text};">
      <div style="font-size:16px; font-weight:700; color:${BRAND.ink};">${esc(p.name)}</div>
      <div style="color:${BRAND.muted};">${esc(p.role)}</div>
      <div style="margin-top:8px;">${p.phone ? `${link(p.phone.href, p.phone.label, BRAND.text)}</div><div>` : ''}${link(`mailto:${p.email}`, p.email)}</div>
      <div>${link(SITE, 'www.kolac-digital.de')}</div>
    </td>
  </tr></table>
</td></tr>`;
}

export interface EmailLayoutOptions {
  /** Unsichtbare Vorschauzeile im Posteingang. */
  preheader?: string;
  /** Große Überschrift über dem Text (optional, eher für Portal und interne Mails). */
  title?: string;
  /** Inhalt als HTML. Absätze als <p>, Abstände kommen aus dem Layout. */
  bodyHtml: string;
  button?: { label: string; href: string };
  /** Kleiner grauer Hinweis unter dem Inhalt (HTML, vorher escapen). */
  footnote?: string;
  sender?: EmailSender;
  /** Grußformel über der Signatur, z.B. "Beste Grüße". */
  closing?: string;
}

/** Komplettes HTML-Dokument einer Mail im Kolac-Digital-Design. */
export function emailLayout(opts: EmailLayoutOptions): string {
  const sender = opts.sender ?? 'yusuf';
  const legal = LEGAL_LINKS.map(([label, href]) => link(href, label, BRAND.muted)).join(
    `<span style="color:#d1d5db;">&nbsp;&nbsp;·&nbsp;&nbsp;</span>`,
  );

  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${esc(opts.title ?? 'Kolac Digital')}</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
<style>
  .content p { margin: 0 0 14px; }
  .content ul, .content ol { margin: 0 0 14px; padding-left: 20px; }
  .content li { margin: 0 0 6px; }
  .content a { color: ${BRAND.blue}; }
  @media (max-width: 600px) {
    .px { padding-left: 22px !important; padding-right: 22px !important; }
    .outer { padding: 12px 6px !important; }
  }
</style>
</head>
<body style="margin:0; padding:0; background:${BRAND.bg}; -webkit-text-size-adjust:100%;">
${opts.preheader ? `<div style="display:none; max-height:0; overflow:hidden; opacity:0; mso-hide:all;">${esc(opts.preheader)}</div>` : ''}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BRAND.bg};">
<tr><td align="center" class="outer" style="padding:32px 12px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px; background:#ffffff; border:1px solid ${BRAND.line}; border-radius:14px; overflow:hidden;">
    <tr><td style="height:4px; line-height:4px; font-size:0; background:${BRAND.blue};">&nbsp;</td></tr>
    <tr><td class="px" style="padding:26px 40px 6px;">
      <a href="${SITE}" style="text-decoration:none;"><img src="${ASSETS}/logo.png" alt="Kolac Digital" width="130" height="59" style="display:block; border:0; width:130px; height:auto;" /></a>
    </td></tr>
    <tr><td class="px content" style="padding:18px 40px 22px; font-family:${FONT}; font-size:15px; line-height:1.65; color:${BRAND.text};">
      ${opts.title ? `<h1 style="margin:0 0 16px; font-family:${FONT}; font-size:22px; line-height:1.3; font-weight:700; color:${BRAND.ink};">${esc(opts.title)}</h1>` : ''}
      ${opts.bodyHtml}
      ${opts.button ? emailButton(opts.button.label, opts.button.href) : ''}
      ${opts.footnote ? `<p style="margin:20px 0 0; font-size:13px; line-height:1.55; color:${BRAND.muted};">${opts.footnote}</p>` : ''}
    </td></tr>
    ${signatureHtml(sender, opts.closing)}
    <tr><td class="px" style="padding:18px 40px 20px; background:${BRAND.soft}; border-top:1px solid ${BRAND.line}; font-family:${FONT}; font-size:12px; line-height:1.6; color:${BRAND.muted};">
      <div><strong style="color:${BRAND.text};">Kolac Digital</strong> · Yusuf Kolac · Beckhausstraße 108 · 33611 Bielefeld</div>
      <div style="margin-top:4px;">${legal}</div>
    </td></tr>
  </table>
</td></tr>
</table>
</body>
</html>`;
}

/** Plaintext-Signatur passend zum HTML (für den text/plain-Teil). */
export function emailSignatureText(sender: EmailSender, closing?: string): string {
  const legal = `Impressum: ${SITE}/impressum.html · Datenschutz: ${SITE}/datenschutz.html · AGB: ${SITE}/agb.html`;
  const footer = ['', '--', 'Kolac Digital · Yusuf Kolac · Beckhausstraße 108 · 33611 Bielefeld', legal];
  const head = closing ? [closing, ''] : [];
  if (sender === 'none') return footer.join('\n');
  const p = PERSONAS[sender];
  return [
    ...head,
    p.name,
    p.role,
    ...(p.phone ? [p.phone.label] : []),
    p.email,
    'www.kolac-digital.de',
    ...footer,
  ].join('\n');
}
