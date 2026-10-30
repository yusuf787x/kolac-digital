import 'server-only';
import { NextResponse } from 'next/server';
import { authenticate } from '@/lib/server-auth';
import { isMonthKey } from '../months';
import type { SeoClient, SeoMonth } from '../types';
import { getSeoClient } from './store';

/** Gemeinsame Pruefung fuer Admin-Routen unter /api/seo. */
export async function requireAdmin(req: Request): Promise<NextResponse | null> {
  const auth = await authenticate(req);
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });
  return null;
}

export function badRequest(message: string, status = 400): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

export async function loadClientOr404(customerId: unknown): Promise<SeoClient | NextResponse> {
  if (typeof customerId !== 'string' || !customerId) return badRequest('customerId fehlt.');
  const client = await getSeoClient(customerId);
  if (!client) return badRequest('SEO-Kunde nicht gefunden.', 404);
  return client;
}

export function parseMonth(m: unknown): SeoMonth | null {
  return isMonthKey(m) ? m : null;
}

export function errorResponse(err: unknown): NextResponse {
  console.error(err);
  const msg = err instanceof Error ? err.message : String(err);
  return NextResponse.json({ error: msg || 'Unbekannter Fehler' }, { status: 500 });
}

/**
 * Faengt jeden Fehler einer Route ab und liefert ihn als JSON. Ohne das
 * kommt bei einem Absturz ausserhalb von try/catch nur ein leeres 500,
 * und die Oberflaeche kann nicht sagen, was schiefging.
 */
export function safe<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (err) {
      return errorResponse(err);
    }
  };
}
