import ReportView from '@/components/seo/portal/ReportView';
import { requirePortalSession } from '@/lib/portal/session';
import { isMonthKey } from '@/lib/seo/months';
import { loadPortalData } from '@/lib/seo/server/store';

export const dynamic = 'force-dynamic';

export default async function PortalReportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await requirePortalSession();
  const q = await searchParams;
  const requested = isMonthKey(q.monat) ? q.monat : null;
  // Nur freigegebene Monate: includeUnreleased = false
  let data = await loadPortalData(session.client, requested, false);
  // Admin-Ansicht: einen Entwurf zeigen, wenn er ausdruecklich angefragt
  // wird (Link aus dem Dashboard). Sonst exakt die Kundenansicht.
  const draft = session.admin && !!requested && data.month !== requested;
  if (draft) data = await loadPortalData(session.client, requested, true);
  const pdfHref =
    data.month && data.report?.status === 'released' && data.report.hasPdf ? `/api/portal/report/${data.month}` : null;
  return <ReportView data={data} monthBaseHref="/portal?monat=" pdfHref={pdfHref} preview={draft} />;
}
