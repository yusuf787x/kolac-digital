import { NextResponse } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase-admin';
import { listActiveAccessEmails } from '@/lib/portal/access';
import { validatePattern } from '@/lib/seo/analysis';
import { looksSensitive } from '@/lib/seo/checks';
import { suggestAssessment } from '@/lib/seo/assessment';
import { formatMonthDE, isMonthKey, lastCompleteMonths } from '@/lib/seo/months';
import { badRequest, safe } from '@/lib/seo/server/admin-route';
import { portalBaseUrl } from '@/lib/seo/server/config';
import { fetchMonth, measureMonth } from '@/lib/seo/server/fetch';
import {
  COL,
  getReport,
  listActivities,
  listChecks,
  deleteEmptyMonths,
  listMonthDocs,
  listReports,
  loadPortalData,
  upsertReport,
} from '@/lib/seo/server/store';
import { clientFromToken } from '@/lib/seo/server/token-auth';
import type { KeywordGroup, SeoClient } from '@/lib/seo/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * Vollzugriff fuer Claude Code auf den Portal-Inhalt EINES Kunden, ueber
 * dessen Kunden-Schluessel (kdp_..., im Admin unter Massnahmen). Der
 * Schluessel bestimmt den Kunden, andere Kunden sind unerreichbar.
 *
 * POST Authorization: Bearer kdp_...   Body: { action, ... }
 *
 *   status                         Ueberblick: Einstellungen, Monate, Berichte
 *   data      { month?, keywords? } Zahlen wie im Portal (auch unfreigegeben)
 *   fetch     { month, pagespeed? } Monat aus der Search Console abrufen
 *   report    { month, assessment?, suggest? }
 *                                  Bericht anlegen/aktualisieren, PDF erzeugen
 *   release   { month, confirm: true }
 *                                  freigeben, Kunde bekommt eine Mail
 *   settings  { displayName?, gscProperty?, brandTerms?, keywordGroups?,
 *               pagespeedUrls?, enabled? }
 *   items                          Massnahmen und Pruefungen mit IDs
 *   visibility { type: 'activity'|'check', id, published }
 *   delete    { type: 'activity'|'check', id }
 *   deleteReport { month, confirm: true }
 *                                  Bericht und PDF loeschen, Zahlen bleiben
 *   plan      { id?, area?, change?, goal?, dueDate?, published?, status? }
 *                                  Plan-Punkt anlegen/aendern (Erinnerung an Yusuf)
 *
 * Massnahmen und Pruefungen anlegen: /api/seo/changelog.
 * Bewusst NICHT moeglich: Portal-Zugaenge einladen oder entziehen,
 * Schluessel aendern, Kunden loeschen. Ein geleakter Schluessel kann so
 * niemandem Zugang zu den Kundendaten verschaffen.
 */
async function handlePOST(req: Request) {
  const client = await clientFromToken(req, 'agent', 300);
  if (client instanceof NextResponse) return client;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const id = client.customerId;

  switch (body.action) {
    case 'status':
      return NextResponse.json(await status(client));

    case 'data': {
      const month = isMonthKey(body.month) ? body.month : null;
      const data = await loadPortalData(client, month, true);
      const limit = Math.min(1000, Math.max(0, Number(body.keywords ?? 100)));
      return NextResponse.json({ ...data, keywords: data.keywords.slice(0, limit) });
    }

    case 'fetch': {
      if (!isMonthKey(body.month)) return badRequest('month (YYYY-MM) fehlt.');
      const summary = await fetchMonth(client, body.month);
      const pagespeed = body.pagespeed ? await measureMonth(client, body.month) : null;
      return NextResponse.json({ ok: true, summary, pagespeed });
    }

    case 'report': {
      if (!isMonthKey(body.month)) return badRequest('month (YYYY-MM) fehlt.');
      // Bei bereits freigegebenen Berichten sieht der Kunde eine neue Einschaetzung sofort
      if (typeof body.assessment === 'string') {
        await upsertReport(id, body.month, { assessment: body.assessment.trim().slice(0, 6000) });
      } else if (body.suggest === true) {
        await upsertReport(id, body.month, { assessment: suggestAssessment(await loadPortalData(client, body.month, true)) });
      }
      const { generateReport } = await import('@/lib/seo/server/report');
      const r = await generateReport(client, body.month);
      const after = await getReport(id, body.month);
      return NextResponse.json({ ok: true, month: body.month, status: after?.status ?? 'draft', assessment: r.assessment });
    }

    case 'release': {
      if (!isMonthKey(body.month)) return badRequest('month (YYYY-MM) fehlt.');
      if (body.confirm !== true) {
        return badRequest('Freigabe schickt dem Kunden eine Mail. Zur Bestätigung confirm: true mitsenden.');
      }
      const { releaseReport } = await import('@/lib/seo/server/report');
      const r = await releaseReport(client, body.month);
      return NextResponse.json({ ok: true, month: body.month, mailedTo: r.sentTo.length });
    }

    case 'deleteReport': {
      if (!isMonthKey(body.month)) return badRequest('month (YYYY-MM) fehlt.');
      if (body.confirm !== true) {
        return badRequest('Löscht Bericht und PDF (die Zahlen bleiben). Zur Bestätigung confirm: true mitsenden.');
      }
      const { deleteReport } = await import('@/lib/seo/server/report');
      await deleteReport(client, body.month);
      return NextResponse.json({ ok: true, month: body.month, deleted: true });
    }

    case 'settings':
      return NextResponse.json(await updateSettings(client, body));

    case 'items': {
      const [acts, checks] = await Promise.all([listActivities(id), listChecks(id)]);
      return NextResponse.json({
        activities: acts.map((a) => ({
          id: a.id,
          date: a.date,
          area: a.area,
          change: a.change,
          status: a.status,
          published: a.published,
          source: a.source,
          ...(a.status === 'planned' ? { dueDate: a.dueDate ?? null, goal: a.goal ?? null } : {}),
        })),
        checks: checks.map((c) => ({ id: c.id, date: c.date, kind: c.kind, title: c.title, published: c.published, source: c.source })),
      });
    }

    case 'plan':
      return planItem(id, body);

    case 'visibility':
    case 'delete': {
      const col = body.type === 'activity' ? COL.activities : body.type === 'check' ? COL.checks : null;
      if (!col || typeof body.id !== 'string') return badRequest("type ('activity' oder 'check') und id fehlen.");
      const ref = adminDb().collection(col).doc(body.id);
      const snap = await ref.get();
      // Nur Eintraege dieses Kunden
      if (!snap.exists || snap.data()?.customerId !== id) return badRequest('Eintrag nicht gefunden.', 404);
      if (body.action === 'delete') await ref.delete();
      else await ref.update({ published: body.published === true, updatedAt: Timestamp.now() });
      return NextResponse.json({ ok: true });
    }

    default:
      return badRequest('Unbekannte action. Erlaubt: status, data, fetch, report, release, deleteReport, settings, items, plan, visibility, delete.');
  }
}

/**
 * Geplanten Punkt anlegen oder aendern ("Der Plan" im Portal, Erinnerung
 * per Mail an Yusuf). Mit id: aendern, z. B. Termin verschieben oder mit
 * status "done" als erledigt markieren. Ohne id: neu anlegen.
 */
async function planItem(customerId: string, body: Record<string, unknown>) {
  const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : undefined);
  const isDate = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
  const update: Record<string, unknown> = {};
  const area = str(body.area, 60);
  const change = str(body.change, 400);
  const goal = str(body.goal, 300);
  if (area) update.area = area;
  if (change) update.change = change;
  if (goal !== undefined) update.goal = goal || null;
  if (body.dueDate === null) update.dueDate = null;
  else if (body.dueDate !== undefined) {
    if (!isDate(body.dueDate)) return badRequest('dueDate im Format YYYY-MM-DD.');
    update.dueDate = body.dueDate;
  }
  if (typeof body.published === 'boolean') update.published = body.published;
  if (body.status !== undefined) {
    if (!['done', 'prepared', 'checked', 'planned'].includes(body.status as string)) return badRequest('Ungültiger status.');
    update.status = body.status;
    // Erledigt: Datum auf heute, damit die Massnahme im richtigen Monat steht
    if (body.status !== 'planned') {
      const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Berlin' });
      update.date = isDate(body.date) ? body.date : today;
      update.month = (update.date as string).slice(0, 7);
      if (str(body.benefit, 400)) update.benefit = str(body.benefit, 400);
    }
  }
  const sensitive = looksSensitive(area ?? '', change ?? '', goal ?? '');
  const now = Timestamp.now();
  const col = adminDb().collection(COL.activities);

  if (typeof body.id === 'string') {
    const ref = col.doc(body.id);
    const snap = await ref.get();
    if (!snap.exists || snap.data()?.customerId !== customerId) return badRequest('Eintrag nicht gefunden.', 404);
    if (sensitive) update.published = false;
    await ref.update({ ...update, updatedAt: now });
    return NextResponse.json({ ok: true, id: body.id, updated: Object.keys(update), held: sensitive });
  }

  if (!change) return badRequest('change fehlt.');
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Berlin' });
  const ref = await col.add({
    customerId,
    date: today,
    month: today.slice(0, 7),
    area: area || 'Allgemein',
    change,
    goal: goal || null,
    dueDate: (update.dueDate as string | undefined) ?? null,
    status: 'planned',
    published: body.published === true && !sensitive,
    source: 'claude-code',
    links: [],
    createdAt: now,
    updatedAt: now,
  });
  return NextResponse.json({ ok: true, id: ref.id, held: sensitive });
}

async function status(client: SeoClient) {
  const id = client.customerId;
  const [months, reports, recipients] = await Promise.all([listMonthDocs(id), listReports(id), listActiveAccessEmails(id)]);
  const have = new Set(months.map((m) => m.month));
  // Moegliche Monate: die letzten 16 abgeschlossenen, aber nicht vor "Zahlen ab"
  const window = lastCompleteMonths(16)
    .filter((m) => !client.dataStart || m >= client.dataStart)
    .sort();
  const firstStored = [...have].sort()[0] ?? null;
  return {
    customer: client.displayName,
    domain: client.domain,
    demo: client.demo === true,
    portalUrl: `${portalBaseUrl()}/portal`,
    settings: {
      enabled: client.enabled,
      gscProperty: client.gscProperty,
      brandTerms: client.brandTerms ?? [],
      keywordGroups: client.keywordGroups ?? [],
      pagespeedUrls: client.pagespeedUrls ?? [],
      dataStart: client.dataStart ?? null,
    },
    lastFetchError: client.lastFetchError ?? null,
    monthsWithData: [...have].sort().reverse(),
    /** Monate ohne Tageswerte (vor Einfuehrung abgerufen). Erneut fetch aufrufen, solange Google sie noch liefert (16 Monate). */
    monthsWithoutDaily: months.filter((m) => !m.daily?.length && m.totals.impressions > 0).map((m) => m.month),
    /** Luecken zwischen dem ersten gespeicherten Monat (bzw. "Zahlen ab") und dem letzten abgeschlossenen Monat: abrufen. */
    missingMonths: firstStored
      ? window.filter((m) => m > firstStored && !have.has(m))
      : window.slice(-1),
    /**
     * Aeltere Monate vor dem ersten gespeicherten, neuester zuerst: einzeln abrufen und beim
     * ersten leeren Monat aufhoeren (davor hat Google keine Daten). Leere Monate werden nicht gespeichert.
     */
    olderMonthsToTry: firstStored ? window.filter((m) => m < firstStored).reverse() : window.slice(0, -1).reverse(),
    reports: reports
      .sort((a, b) => b.month.localeCompare(a.month))
      .map((r) => ({
        month: r.month,
        label: formatMonthDE(r.month),
        status: r.status,
        hasPdf: !!r.storagePath,
        releasedAt: r.releasedAt ? r.releasedAt.toDate().toISOString() : null,
      })),
    /** Wie viele Adressen bei einer Freigabe eine Mail bekommen. */
    portalRecipients: recipients.length,
  };
}

async function updateSettings(client: SeoClient, body: Record<string, unknown>) {
  const update: Record<string, unknown> = {};
  const errors: string[] = [];
  const strList = (v: unknown, max: number) =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').map((x) => x.trim()).filter(Boolean).slice(0, max) : null;

  if (typeof body.displayName === 'string' && body.displayName.trim()) update.displayName = body.displayName.trim().slice(0, 120);
  if (typeof body.gscProperty === 'string' && body.gscProperty.trim()) update.gscProperty = body.gscProperty.trim();
  if (typeof body.enabled === 'boolean') update.enabled = body.enabled;
  if (body.dataStart === null || body.dataStart === '') update.dataStart = null;
  else if (body.dataStart !== undefined) {
    if (!isMonthKey(body.dataStart)) errors.push('dataStart im Format YYYY-MM.');
    else update.dataStart = body.dataStart;
  }
  const brand = strList(body.brandTerms, 30);
  if (brand) update.brandTerms = brand;
  const urls = strList(body.pagespeedUrls, 5);
  if (urls) {
    const bad = urls.filter((u) => !/^https?:\/\/\S+$/.test(u));
    if (bad.length) errors.push(`Ungültige URLs: ${bad.join(', ')}`);
    else update.pagespeedUrls = urls;
  }
  if (Array.isArray(body.keywordGroups)) {
    const groups: KeywordGroup[] = [];
    for (const g of body.keywordGroups.slice(0, 30)) {
      if (!g || typeof g !== 'object') continue;
      const o = g as Record<string, unknown>;
      const name = typeof o.name === 'string' ? o.name.trim().slice(0, 60) : '';
      const patterns = strList(o.patterns, 20) ?? [];
      if (!name || !patterns.length) continue;
      const invalid = patterns.map((p) => [p, validatePattern(p)] as const).filter(([, e]) => e);
      if (invalid.length) {
        errors.push(`${name}: ungültiger Ausdruck ${invalid.map(([p]) => p).join(', ')}`);
        continue;
      }
      const gid =
        typeof o.id === 'string' && o.id.trim()
          ? o.id.trim().slice(0, 60)
          : name.toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      groups.push({ id: gid, name, patterns });
    }
    if (!errors.length) update.keywordGroups = groups;
  }
  if (errors.length) return { ok: false, errors };
  if (!Object.keys(update).length) return { ok: false, errors: ['Keine änderbaren Felder übergeben.'] };
  await adminDb()
    .collection(COL.clients)
    .doc(client.customerId)
    .update({ ...update, updatedAt: Timestamp.now() });
  // Neues "Zahlen ab": aeltere und leere Monate sofort entfernen
  const removedMonths = 'dataStart' in update ? await deleteEmptyMonths(client.customerId, update.dataStart as string | null) : [];
  return { ok: true, updated: Object.keys(update), ...(removedMonths.length ? { removedMonths } : {}) };
}

export const POST = safe(handlePOST);
