import 'server-only';
import { createHash } from 'crypto';
import { site } from '@/lib/site-config';
import { leadEventId } from './meta';
import type { StoredLead } from './store';

/**
 * Meta Conversions API: meldet einen Lead vom Server, aber nur, wenn der
 * Besucher im Formular das Häkchen „Erfolgsmessung an Meta“ gesetzt hat.
 *
 * Konfiguration (Vercel):
 *   NEXT_PUBLIC_META_PIXEL_ID  Pixel-ID (Datensatz-ID) aus dem Events Manager
 *   META_CAPI_TOKEN            Zugriffsschlüssel der Conversions API (geheim)
 *   META_TEST_EVENT_CODE       optional, nur zum Testen im Events Manager
 *   META_GRAPH_VERSION         optional, Standard v25.0
 */

export function metaPixelId(): string {
  return (process.env.META_PIXEL_ID || process.env.NEXT_PUBLIC_META_PIXEL_ID || '').trim();
}

/** Häkchen und Server-Meldung gibt es nur, wenn Pixel-ID und Schlüssel gesetzt sind. */
export function metaCapiEnabled(): boolean {
  return Boolean(metaPixelId() && process.env.META_CAPI_TOKEN?.trim());
}

export interface LeadContext {
  ip?: string;
  userAgent?: string;
  /** Zeitpunkt, an dem die Klick-ID (fbclid) gesehen wurde, in Millisekunden. */
  clickSeenAtMs?: number;
}

const sha = (v: string) => createHash('sha256').update(v).digest('hex');

/** Telefon nach Meta-Vorgabe: nur Ziffern, mit Ländervorwahl, ohne führende Nullen. */
function normalizePhone(raw: string): string {
  let d = raw.replace(/\D/g, '');
  if (raw.trim().startsWith('+')) return d;
  if (d.startsWith('00')) return d.slice(2);
  if (d.startsWith('0')) return `49${d.slice(1)}`;
  return d;
}

function normalizeName(raw: string): string {
  return raw.trim().toLowerCase().replace(/[^\p{L}]/gu, '');
}

export async function sendMetaLead(checkId: string, lead: StoredLead, ctx: LeadContext): Promise<void> {
  if (lead.measureConsent !== true || !metaCapiEnabled()) return;
  const pixelId = metaPixelId();
  const token = process.env.META_CAPI_TOKEN!.trim();
  const version = (process.env.META_GRAPH_VERSION || 'v25.0').trim();

  const user_data: Record<string, unknown> = {
    em: [sha(lead.email.trim().toLowerCase())],
    country: [sha('de')],
  };
  if (lead.phone) {
    const ph = normalizePhone(lead.phone);
    if (ph.length >= 8) user_data.ph = [sha(ph)];
  }
  const parts = lead.name.trim().split(/\s+/);
  if (parts.length >= 2) {
    const fn = normalizeName(parts[0]);
    const ln = normalizeName(parts[parts.length - 1]);
    if (fn) user_data.fn = [sha(fn)];
    if (ln) user_data.ln = [sha(ln)];
  }
  if (ctx.ip) user_data.client_ip_address = ctx.ip;
  if (ctx.userAgent) user_data.client_user_agent = ctx.userAgent;
  const fbclid = lead.source?.fbclid;
  if (fbclid) user_data.fbc = `fb.1.${ctx.clickSeenAtMs ?? Date.now()}.${fbclid}`;

  const landing = lead.source?.landing?.startsWith('/') ? lead.source.landing : '/seo-check';
  const body: Record<string, unknown> = {
    data: [
      {
        event_name: 'Lead',
        event_time: Math.floor(Date.now() / 1000),
        event_id: leadEventId(checkId),
        action_source: 'website',
        event_source_url: `${site.baseUrl}${landing}`,
        user_data,
        custom_data: lead.branche ? { content_category: lead.branche } : undefined,
      },
    ],
  };
  const testCode = process.env.META_TEST_EVENT_CODE?.trim();
  if (testCode) body.test_event_code = testCode;

  const res = await fetch(
    `https://graph.facebook.com/${version}/${encodeURIComponent(pixelId)}/events?access_token=${encodeURIComponent(token)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    },
  );
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    // Kein Token im Log: nur Status und Metas Fehlertext.
    console.error(`Meta Conversions API ${res.status}: ${text.slice(0, 300)}`);
  }
}
