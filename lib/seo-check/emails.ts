import 'server-only';
import { emailBox, emailDataRows, emailLayout, esc } from '@/lib/email-layout';
import type { StoredLead } from './store';
import { CATEGORY_LABELS, type SeoCheckResult } from './types';

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

/** Benachrichtigung an Yusuf: neuer Lead aus dem SEO-Check. */
export function leadNotificationEmail(id: string, lead: StoredLead, r: SeoCheckResult) {
  const rows: Array<[string, string]> = [
    ['Name', lead.name],
    ['E-Mail', lead.email],
    ['Telefon', lead.phone || 'nicht angegeben'],
    ...(lead.company ? ([['Firma', lead.company]] as Array<[string, string]>) : []),
    ['Rückruf gewünscht', lead.wantsCall ? 'Ja' : 'Nein'],
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
<p>${lead.wantsCall ? 'Ich melde mich in den nächsten Tagen kurz telefonisch, damit wir das Ergebnis gemeinsam durchgehen.' : 'Wenn du möchtest, gehen wir das Ergebnis in einem kurzen Gespräch gemeinsam durch. Antworte einfach auf diese Mail.'}</p>`,
    button: { label: 'Bericht ansehen', href: reportUrl(id) },
  });
  const text = [
    `Hallo ${firstName},`,
    '',
    `dein SEO-Check für ${r.domain}: ${r.score} von 100 Punkten.`,
    `Vollständiger Bericht: ${reportUrl(id)}`,
    '',
    'Viele Grüße',
    'Yusuf Kolac, Kolac Digital',
  ].join('\n');
  return { from: FROM, replyTo: REPLY_TO, subject: `Dein SEO-Check für ${r.domain}`, html, text };
}
