import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { adminDb } from '@/lib/firebase-admin';
import { authenticate, authErrorResponse } from '@/lib/server-auth';
import { getOAuthClientForRefresh } from '@/lib/google-oauth';
import { companyDomainFromEmail, GMAIL_SCOPE, normalizeDomain } from '@/lib/crm-shared';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/**
 * Mails zu einer Kundenakte aus Yusufs Gmail: alles von/an die Adressen
 * der Akte und ihrer Ansprechpartner, plus die Firmen-Domain. Nur lesen,
 * nichts wird gespeichert.
 */
export async function GET(req: Request) {
  const errResp = authErrorResponse(await authenticate(req));
  if (errResp) return errResp;

  const customerId = new URL(req.url).searchParams.get('customerId') ?? '';
  if (!customerId) return NextResponse.json({ error: 'customerId fehlt' }, { status: 400 });

  const db = adminDb();
  const [authSnap, custSnap, contactsSnap] = await Promise.all([
    db.collection('settings').doc('google_auth').get(),
    db.collection('customers').doc(customerId).get(),
    db.collection('contacts').where('customerId', '==', customerId).get(),
  ]);

  const auth = authSnap.data();
  if (!auth?.refreshToken) return NextResponse.json({ status: 'not_connected', mails: [] });
  const scopes: string[] = Array.isArray(auth.scopes) ? auth.scopes : [];
  if (!scopes.includes(GMAIL_SCOPE)) return NextResponse.json({ status: 'scope_missing', mails: [] });

  const cust = custSnap.data();
  if (!cust) return NextResponse.json({ error: 'Akte nicht gefunden' }, { status: 404 });

  const emails = new Set<string>();
  const add = (e: unknown) => {
    const v = typeof e === 'string' ? e.trim().toLowerCase() : '';
    if (v.includes('@')) emails.add(v);
  };
  add(cust.email);
  add(cust.retainerInvoiceEmail);
  contactsSnap.docs.forEach((d) => add(d.data().email));

  const domains = new Set<string>();
  const site = normalizeDomain(cust.website);
  if (site) domains.add(site);
  for (const e of emails) {
    const d = companyDomainFromEmail(e);
    if (d) domains.add(d);
  }
  // Mails an Adressen der Firmen-Domain sind über die Domain schon abgedeckt.
  const singles = [...emails].filter((e) => !domains.has(e.split('@')[1]));
  const terms = [...singles, ...domains].slice(0, 15);
  if (terms.length === 0) return NextResponse.json({ status: 'ok', mails: [], hint: 'Keine Mail-Adresse oder Website in der Akte.' });

  const q = terms.map((t) => `from:${t} OR to:${t} OR cc:${t}`).join(' OR ');

  try {
    const gmail = google.gmail({ version: 'v1', auth: getOAuthClientForRefresh(auth.refreshToken) });
    const list = await gmail.users.messages.list({ userId: 'me', q, maxResults: 40, includeSpamTrash: false });
    const ids = (list.data.messages ?? []).map((m) => m.id!).filter(Boolean);
    const own = String(auth.connectedEmail ?? '').toLowerCase();

    const mails = await Promise.all(
      ids.map(async (id) => {
        const m = await gmail.users.messages.get({
          userId: 'me',
          id,
          format: 'metadata',
          metadataHeaders: ['From', 'To', 'Subject', 'Date'],
        });
        const h = (name: string) => m.data.payload?.headers?.find((x) => x.name?.toLowerCase() === name.toLowerCase())?.value ?? '';
        const from = h('From');
        const labels = m.data.labelIds ?? [];
        const outgoing = labels.includes('SENT') || (!!own && from.toLowerCase().includes(own));
        const threadId = m.data.threadId ?? id;
        return {
          id,
          threadId,
          at: Number(m.data.internalDate ?? 0),
          from: shortAddress(from),
          to: shortAddress(h('To')),
          subject: h('Subject'),
          snippet: decodeEntities(m.data.snippet ?? ''),
          outgoing,
          url: `https://mail.google.com/mail/u/${encodeURIComponent(own || '0')}/#all/${threadId}`,
        };
      }),
    );
    return NextResponse.json({ status: 'ok', mails, account: own });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[crm/mails]', msg);
    const scopeProblem = /insufficient|scope|invalid_grant/i.test(msg);
    return NextResponse.json(
      { status: scopeProblem ? 'scope_missing' : 'error', mails: [], error: scopeProblem ? undefined : 'Gmail konnte nicht gelesen werden.' },
      { status: scopeProblem ? 200 : 502 },
    );
  }
}

/** "Max Muster <max@firma.de>" → "Max Muster", sonst die Adresse. Mehrere Empfänger: erster + Anzahl. */
function shortAddress(raw: string): string {
  const parts = raw.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map((p) => p.trim()).filter(Boolean);
  const first = parts[0] ?? '';
  const name = first.match(/^"?([^"<]+?)"?\s*</)?.[1]?.trim();
  const label = name || first.replace(/[<>]/g, '');
  return parts.length > 1 ? `${label} +${parts.length - 1}` : label;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}
