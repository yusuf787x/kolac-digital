import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Minimal-Client für die GoCardless Pro API.
 *
 * Nutzt fetch() statt SDK, weil wir nur ein paar Endpoints brauchen.
 * Auth via Bearer-Token, immer mit API-Version-Header.
 *
 * Konfiguration via Env Vars:
 *   - GOCARDLESS_ACCESS_TOKEN     der Token aus GoCardless > API-Einstellungen
 *   - GOCARDLESS_WEBHOOK_SECRET   Secret, das GoCardless beim Webhook-Setup ausgibt
 *   - GOCARDLESS_ENVIRONMENT      "sandbox" (default) oder "live"
 */

const API_VERSION = '2015-07-06';

function baseUrl(): string {
  const env = process.env.GOCARDLESS_ENVIRONMENT ?? 'sandbox';
  return env === 'live'
    ? 'https://api.gocardless.com'
    : 'https://api-sandbox.gocardless.com';
}

function token(): string {
  const t = process.env.GOCARDLESS_ACCESS_TOKEN;
  if (!t) {
    throw new Error(
      'GOCARDLESS_ACCESS_TOKEN ist nicht gesetzt. Bitte als Env Var hinterlegen.',
    );
  }
  return t;
}

async function gcFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${baseUrl()}${path}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token()}`,
      'GoCardless-Version': API_VERSION,
      Accept: 'application/json',
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(
      `GoCardless ${path} ${res.status}: ${body.slice(0, 300)}`,
    );
  }
  return (await res.json()) as T;
}

// ===================================================================
// Resource Types — nur die Felder, die wir tatsaechlich verarbeiten.
// ===================================================================

export interface GcPayment {
  id: string;
  amount: number; // in Minor-Units (Cent für EUR)
  currency: string;
  status: string;
  description: string | null;
  charge_date: string;
  created_at: string;
  links: {
    mandate: string;
    subscription?: string;
    creditor: string;
  };
}

export interface GcCustomer {
  id: string;
  email: string;
  given_name: string | null;
  family_name: string | null;
  company_name: string | null;
  address_line1: string | null;
  address_line2: string | null;
  address_line3: string | null;
  city: string | null;
  postal_code: string | null;
  country_code: string | null;
  language: string | null;
}

export interface GcMandate {
  id: string;
  status: string;
  reference: string | null;
  links: {
    customer: string;
    customer_bank_account: string;
  };
}

export interface GcEvent {
  id: string;
  created_at: string;
  resource_type: string;
  action: string;
  links: Record<string, string>;
  details?: {
    origin?: string;
    cause?: string;
    description?: string;
    reason_code?: string;
  };
}

// ===================================================================
// API-Aufrufe
// ===================================================================

export async function getPayment(id: string): Promise<GcPayment> {
  const data = await gcFetch<{ payments: GcPayment }>(`/payments/${id}`);
  return data.payments;
}

export async function getMandate(id: string): Promise<GcMandate> {
  const data = await gcFetch<{ mandates: GcMandate }>(`/mandates/${id}`);
  return data.mandates;
}

export async function getCustomer(id: string): Promise<GcCustomer> {
  const data = await gcFetch<{ customers: GcCustomer }>(`/customers/${id}`);
  return data.customers;
}

/**
 * Holt zum Payment den dazugehörigen Kunden — Payment hat nur einen
 * Mandate-Link, der Customer hängt am Mandate dran.
 */
export async function getCustomerForPayment(
  payment: GcPayment,
): Promise<{ customer: GcCustomer; mandate: GcMandate }> {
  const mandate = await getMandate(payment.links.mandate);
  const customer = await getCustomer(mandate.links.customer);
  return { customer, mandate };
}

// ===================================================================
// Webhook-Signaturpruefung
// ===================================================================

/**
 * Verifiziert die HMAC-SHA256-Signatur eines GoCardless-Webhooks.
 *
 * Der Header heißt "Webhook-Signature" und enthält die hex-codierte
 * Signatur des unveränderten Request-Bodies (Bytes!) mit dem Webhook-
 * Secret als Key. Vergleich ist timing-safe, um Side-Channel-Attacken
 * zu verhindern.
 */
export function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
): boolean {
  const secret = process.env.GOCARDLESS_WEBHOOK_SECRET;
  if (!secret) {
    console.error('GOCARDLESS_WEBHOOK_SECRET ist nicht gesetzt.');
    return false;
  }
  if (!signatureHeader) return false;

  const expected = createHmac('sha256', secret)
    .update(rawBody, 'utf8')
    .digest('hex');

  // Beide Strings müssen gleich lang sein, sonst wirft timingSafeEqual.
  if (expected.length !== signatureHeader.length) return false;

  return timingSafeEqual(
    Buffer.from(expected, 'utf8'),
    Buffer.from(signatureHeader, 'utf8'),
  );
}

// ===================================================================
// Helpers
// ===================================================================

/** Extrahiert die Domain aus einer E-Mail-Adresse (lowercase). */
export function emailDomain(email: string): string {
  const at = email.indexOf('@');
  if (at < 0) return '';
  return email.slice(at + 1).trim().toLowerCase();
}

/** Wandelt GoCardless-Cent-Beträge in Euro um. */
export function centsToEuros(amount: number): number {
  return Math.round(amount) / 100;
}
