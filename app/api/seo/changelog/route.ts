import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { clientIp, sha256 } from '@/lib/portal/access';
import { hitRateLimit } from '@/lib/portal/rate-limit';
import { parseChangelogMarkdown } from '@/lib/seo/changelog-markdown';
import { todayIso } from '@/lib/seo/months';
import { normalizeJsonEntries, syncChangelog } from '@/lib/seo/server/changelog-sync';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BYTES = 1024 * 1024;

/**
 * Schnittstelle fuer Claude Code: Massnahmen aus einem Kundenprojekt ins
 * Portal uebertragen. Authentifizierung ueber den Changelog-Schluessel des
 * Kunden (im Admin unter Massnahmen erzeugt), nicht ueber das Admin-Login.
 * Der Schluessel bestimmt den Kunden, die Anfrage kann keinen waehlen.
 *
 * POST Authorization: Bearer kdp_...
 * Body: {
 *   markdown?: string     komplette CHANGELOG.md
 *   entries?: [{ date, area, change, benefit?, scope?, status? }]
 *   publish?: boolean     neue Eintraege direkt fuer den Kunden sichtbar
 *   dryRun?: boolean      nur anzeigen, was passieren wuerde
 * }
 */
export async function POST(req: Request) {
  if (!(await hitRateLimit(`changelog-ip:${clientIp(req)}`, 60, 3600))) {
    return NextResponse.json({ error: 'Zu viele Anfragen.' }, { status: 429 });
  }
  const auth = req.headers.get('authorization') ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (!token.startsWith('kdp_') || token.length < 30) {
    return NextResponse.json({ error: 'Changelog-Schlüssel fehlt.' }, { status: 401 });
  }
  const snap = await adminDb()
    .collection('seoClients')
    .where('changelogTokenHash', '==', sha256(token))
    .limit(1)
    .get();
  if (snap.empty) return NextResponse.json({ error: 'Changelog-Schlüssel ungültig.' }, { status: 401 });
  const client = snap.docs[0];

  const raw = await req.text();
  if (raw.length > MAX_BYTES) return NextResponse.json({ error: 'Anfrage zu groß.' }, { status: 413 });
  let body: { markdown?: unknown; entries?: unknown; publish?: unknown; dryRun?: unknown };
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: 'Kein gültiges JSON.' }, { status: 400 });
  }

  const warnings: string[] = [];
  const entries = normalizeJsonEntries(body.entries);
  const fullFile = typeof body.markdown === 'string';
  if (fullFile) {
    const parsed = parseChangelogMarkdown(body.markdown as string, { fallbackDate: todayIso() });
    entries.push(...parsed.entries);
    warnings.push(...parsed.warnings);
  }
  if (entries.length === 0) {
    return NextResponse.json({ error: 'Keine Einträge erkannt.', warnings }, { status: 422 });
  }

  try {
    const summary = await syncChangelog({
      customerId: client.id,
      entries,
      publish: body.publish === true,
      fullFile,
      dryRun: body.dryRun === true,
    });
    return NextResponse.json({
      ok: true,
      customer: client.data().displayName,
      dryRun: body.dryRun === true,
      ...summary,
      warnings,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
