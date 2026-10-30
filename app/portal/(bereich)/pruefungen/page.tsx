import CheckCard from '@/components/seo/portal/CheckCard';
import { requirePortalSession } from '@/lib/portal/session';
import { listChecks } from '@/lib/seo/server/store';
import { buildCheckTimeline } from '@/lib/seo/view';

export const dynamic = 'force-dynamic';

export default async function PortalPruefungenPage() {
  const session = await requirePortalSession();
  const checks = buildCheckTimeline(await listChecks(session.customerId));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold sm:text-3xl">Prüfungen Ihrer Website</h1>
        <p className="mt-2 max-w-prose leading-relaxed text-gray-600">
          Wir prüfen Ihre Website regelmäßig: Ladezeit, Technik, Inhalte und Sichtbarkeit bei Google. Hier sehen Sie jedes
          Ergebnis in einfachen Worten, mit dem Vergleich zur letzten Prüfung und Links, mit denen Sie alles selbst nachprüfen
          können.
        </p>
      </header>
      {checks.length ? (
        <div className="space-y-4">
          {checks.map((c) => (
            <CheckCard key={c.id} check={c} />
          ))}
        </div>
      ) : (
        <p className="rounded-2xl border border-gray-200 bg-white p-6 text-gray-600">Hier erscheinen bald die ersten Prüfungen.</p>
      )}
    </div>
  );
}
