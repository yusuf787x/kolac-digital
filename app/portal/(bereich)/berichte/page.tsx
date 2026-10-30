import Link from 'next/link';
import { requirePortalSession } from '@/lib/portal/session';
import { formatMonthDE } from '@/lib/seo/months';
import { listReports } from '@/lib/seo/server/store';

export const dynamic = 'force-dynamic';

export default async function PortalBerichtePage() {
  const session = await requirePortalSession();
  const reports = (await listReports(session.customerId))
    .filter((r) => r.status === 'released')
    .sort((a, b) => b.month.localeCompare(a.month));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold sm:text-3xl">Alle Berichte</h1>
        <p className="mt-2 max-w-prose leading-relaxed text-gray-600">
          Jeder Monatsbericht bleibt hier dauerhaft für Sie abrufbar, online und als PDF.
        </p>
      </header>
      {reports.length === 0 ? (
        <p className="rounded-2xl border border-gray-200 bg-white p-6 text-gray-600">
          Ihr erster Bericht ist noch in Vorbereitung. Wir schicken Ihnen eine E-Mail, sobald er fertig ist.
        </p>
      ) : (
        <ul className="divide-y divide-gray-100 rounded-2xl border border-gray-200 bg-white">
          {reports.map((r) => (
            <li key={r.month} className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
              <div>
                <div className="font-medium">{formatMonthDE(r.month)}</div>
                {r.releasedAt && (
                  <div className="text-sm text-gray-500">
                    veröffentlicht am{' '}
                    <span className="whitespace-nowrap tabular-nums">
                      {r.releasedAt.toDate().toLocaleDateString('de-DE', { timeZone: 'Europe/Berlin' })}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href={`/portal?monat=${r.month}`} className="btn-secondary pointer-coarse:h-11">
                  Online ansehen
                </Link>
                {r.storagePath && (
                  <a href={`/api/portal/report/${r.month}`} className="btn-secondary pointer-coarse:h-11">
                    PDF laden
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
