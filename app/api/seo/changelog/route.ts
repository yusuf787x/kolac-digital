import { NextResponse } from 'next/server';
import { safe } from '@/lib/seo/server/admin-route';
import { parseChangelogMarkdown } from '@/lib/seo/changelog-markdown';
import { normalizeCheckInput, type CheckInput } from '@/lib/seo/checks';
import { todayIso } from '@/lib/seo/months';
import { normalizeJsonEntries, syncChangelog } from '@/lib/seo/server/changelog-sync';
import { clientFromToken } from '@/lib/seo/server/token-auth';

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
 *   entries?: [{ date, area, change, benefit?, scope?, status?, links? }]
 *   checks?: [{ date, kind, title, summary, metrics[], findings[], links[] }]
 *                         Pruefungen/Scans, Format siehe lib/seo/checks.ts
 *   publish?: boolean     neue Eintraege direkt fuer den Kunden sichtbar
 *   dryRun?: boolean      nur anzeigen, was passieren wuerde
 * }
 */
async function handlePOST(req: Request) {
  const client = await clientFromToken(req, 'changelog', 60);
  if (client instanceof NextResponse) return client;

  const raw = await req.text();
  if (raw.length > MAX_BYTES) return NextResponse.json({ error: 'Anfrage zu groß.' }, { status: 413 });
  let body: { markdown?: unknown; entries?: unknown; checks?: unknown; publish?: unknown; dryRun?: unknown };
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
  const checks: CheckInput[] = [];
  if (Array.isArray(body.checks)) {
    body.checks.slice(0, 50).forEach((raw, i) => {
      const c = normalizeCheckInput(raw);
      if (c) checks.push(c);
      else warnings.push(`Prüfung ${i + 1} übersprungen: date (YYYY-MM-DD), title und summary sind Pflicht.`);
    });
  }
  if (entries.length === 0 && checks.length === 0) {
    return NextResponse.json({ error: 'Keine Einträge erkannt.', warnings }, { status: 422 });
  }

  try {
    const summary = await syncChangelog({
      customerId: client.customerId,
      entries,
      checks,
      publish: body.publish === true,
      fullFile,
      dryRun: body.dryRun === true,
    });
    return NextResponse.json({
      ok: true,
      customer: client.displayName,
      dryRun: body.dryRun === true,
      ...summary,
      warnings,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export const POST = safe(handlePOST);
