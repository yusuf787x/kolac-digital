import 'server-only';
import { emailBox, emailDataRows, emailLayout, esc } from '@/lib/email-layout';
import type { StoredLead } from './store';
import { CATEGORY_LABELS, type SeoCheckResult } from './types';
import { brancheLabel, websiteAlterLabel, type LeadSource } from './funnel';
import { site } from '@/lib/site-config';

const FROM = 'Kolac Digital <yusuf@kolac-digital.de>';
const REPLY_TO = 'yusuf@kolac-digital.de';

export function reportUrl(id: string): string {
  return `https://www.kolac-digital.de/seo-check?id=${encodeURIComponent(id)}`;
}

function categoryLines(r: SeoCheckResult): Array<[string, string]> {
  return (Object.keys(CATEGORY_LABELS) as (keyof typeof CATEGORY_LABELS)[]).map((k) => {
    const v = r.categories[k];
    return [CATEGORY_LABELS[k], v === null ? 'nicht gemessen' : `${v} / 100`];
  });
}

function sourceLines(src?: LeadSource): Array<[string, string]> {
  if (!src) return [['Herkunft', 'direkt (keine Anzeige erkannt)']];
  const rows: Array<[string, string]> = [];
  if (src.landing) rows.push(['Seite', src.landing]);
  if (src.utm_source) rows.push(['Quelle (utm_source)', src.utm_source]);
  if (src.utm_medium) rows.push(['Medium (utm_medium)', src.utm_medium]);
  if (src.utm_campaign) rows.push(['Kampagne (utm_campaign)', src.utm_campaign]);
  if (src.utm_content) rows.push(['Anzeige (utm_content)', src.utm_content]);
  if (src.fbclid) rows.push(['Meta-Klick (fbclid)', 'ja']);
  return rows.length ? rows : [['Herkunft', 'direkt (keine Anzeige erkannt)']];
}

/** Benachrichtigung an Yusuf: neuer Lead aus dem SEO-Check. */
export function leadNotificationEmail(id: string, lead: StoredLead, r: SeoCheckResult) {
  const rows: Array<[string, string]> = [
    ['Name', lead.name],
    ['E-Mail', lead.email],
    ['Telefon', lead.phone || 'nicht angegeben'],
    ...(lead.company ? ([['Firma', lead.company]] as Array<[string, string]>) : []),
    ['Rückruf gewünscht', lead.wantsCall ? 'Ja' : 'Nein'],
    ['Branche', brancheLabel(lead.branche)],
    ['Website seit', websiteAlterLabel(lead.websiteAlter)],
    ['Website', r.finalUrl],
    ['Gesamtpunktzahl', `${r.score} / 100`],
    ...categoryLines(r),
    ...(r.rankings.available
      ? ([
          ['Begriffe auf Seite 1', String(r.rankings.top10)],
          ['Begriffe gesamt', String(r.rankings.total)],
        ] as Array<[string, string]>)
      : []),
    ...(r.platform ? ([['System', r.platform]] as Array<[string, string]>) : []),
    ...sourceLines(lead.source),
  ];
  const measures = r.measures.map((m, i) => `${i + 1}. ${esc(m.title)}`).join('<br/>');
  const html = emailLayout({
    sender: 'none',
    preheader: `${lead.name}, ${r.domain}: ${r.score} Punkte${lead.wantsCall ? ', will Rückruf' : ''}`,
    title: lead.wantsCall ? 'SEO-Check: Rückruf gewünscht' : 'SEO-Check: neuer Kontakt',
    bodyHtml: `${emailDataRows(rows)}${measures ? emailBox(`<strong>Top-Maßnahmen</strong><br/>${measures}`) : ''}`,
    button: { label: 'Bericht öffnen', href: reportUrl(id) },
    footnote: lead.phone ? `Telefon: ${esc(lead.phone)}` : 'Antworte direkt auf diese Mail.',
  });
  const text = [
    'Neuer Kontakt aus dem SEO-Check.',
    ...rows.map(([k, v]) => `${k}: ${v}`),
    '',
    `Bericht: ${reportUrl(id)}`,
  ].join('\n');
  return {
    from: FROM,
    replyTo: lead.email,
    subject: `SEO-Check: ${lead.name} (${r.domain}, ${r.score} Punkte)${lead.wantsCall ? ' Rückruf' : ''}`,
    html,
    text,
  };
}

/** Mail an den Besucher mit Link zu seinem Bericht. */
export function reportEmail(id: string, lead: StoredLead, r: SeoCheckResult) {
  const firstName = lead.name.split(' ')[0];
  const top = r.measures.slice(0, 5).map((m, i) => `${i + 1}. ${esc(m.title)}`).join('<br/>');
  const html = emailLayout({
    sender: 'yusuf',
    closing: 'Viele Grüße',
    preheader: `Dein SEO-Check für ${r.domain}: ${r.score} von 100 Punkten`,
    bodyHtml: `<p>Hallo ${esc(firstName)},</p>
<p>hier ist dein Ergebnis für <strong>${esc(r.domain)}</strong>: <strong>${r.score} von 100 Punkten</strong>. Den vollständigen Bericht mit allen Prüfpunkten und deinen fünf wichtigsten Maßnahmen findest du jederzeit unter dem Link unten.</p>
${top ? emailBox(`<strong>Deine wichtigsten Maßnahmen</strong><br/>${top}`) : ''}
<p>Ich melde mich kurz telefonisch, damit wir das Ergebnis gemeinsam durchgehen. Wenn du lieber direkt einen Termin festmachen willst: <a href="${site.meetingUrl}">hier ein kostenloses Gespräch buchen</a>.</p>`,
    button: { label: 'Bericht ansehen', href: reportUrl(id) },
  });
  const text = [
    `Hallo ${firstName},`,
    '',
    `dein SEO-Check für ${r.domain}: ${r.score} von 100 Punkten.`,
    `Vollständiger Bericht: ${reportUrl(id)}`,
    '',
    'Ich melde mich kurz telefonisch, damit wir das Ergebnis gemeinsam durchgehen.',
    `Lieber direkt einen Termin? ${site.meetingUrl}`,
    '',
    'Viele Grüße',
    'Yusuf Kolac, Kolac Digital',
  ].join('\n');
  return { from: FROM, replyTo: REPLY_TO, subject: `Dein SEO-Check für ${r.domain}`, html, text };
}
