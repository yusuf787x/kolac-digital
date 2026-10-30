import { ActivityTimeline, PlannedList } from '@/components/seo/portal/parts';
import { requirePortalSession } from '@/lib/portal/session';
import { listActivities } from '@/lib/seo/server/store';
import { toPortalActivity } from '@/lib/seo/view';

export const dynamic = 'force-dynamic';

export default async function PortalMassnahmenPage() {
  const session = await requirePortalSession();
  const all = (await listActivities(session.customerId)).filter((a) => a.published).map(toPortalActivity);
  const done = all.filter((a) => a.status !== 'planned');
  const planned = all.filter((a) => a.status === 'planned');

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold sm:text-3xl">Alles, was wir für Sie getan haben</h1>
        <p className="mt-2 max-w-prose leading-relaxed text-gray-600">
          Jede Änderung an Ihrer Website, Monat für Monat, mit dem Nutzen für Sie. So sehen Sie jederzeit, woran wir
          arbeiten.
        </p>
      </header>
      {planned.length > 0 && (
        <section className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-6">
          <h2 className="mb-4 text-lg font-semibold">Als Nächstes geplant</h2>
          <PlannedList items={planned} />
        </section>
      )}
      {done.length ? (
        <ActivityTimeline items={done} />
      ) : (
        <p className="rounded-2xl border border-gray-200 bg-white p-6 text-gray-600">Hier erscheinen bald die ersten Einträge.</p>
      )}
    </div>
  );
}
