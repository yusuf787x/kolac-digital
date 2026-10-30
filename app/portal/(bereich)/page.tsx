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
  // Nur freigegebene Monate: includeUnreleased = false
  const data = await loadPortalData(session.client, isMonthKey(q.monat) ? q.monat : null, false);
  const pdfHref =
    data.month && data.report?.status === 'released' && data.report.hasPdf ? `/api/portal/report/${data.month}` : null;
  return <ReportView data={data} monthBaseHref="/portal?monat=" pdfHref={pdfHref} />;
}
