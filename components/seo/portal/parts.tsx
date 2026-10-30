import { Fragment } from 'react';
import { pctChange } from '@/lib/seo/analysis';
import { formatIsoDateDE, formatMonthDE } from '@/lib/seo/months';
import { ACTIVITY_STATUS_BADGES, ACTIVITY_STATUS_LABELS } from '@/lib/seo/types';
import { fmtSignedPct, type PortalActivity } from '@/lib/seo/view';
import { LinkList } from './CheckCard';

/** Bausteine fuer Portal und Admin-Vorschau. Ohne Hooks, also auch serverseitig nutzbar. */

export function Section({
  id,
  title,
  intro,
  children,
}: {
  id: string;
  title: string;
  intro?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20 rounded-2xl border border-gray-200 bg-white p-4 sm:p-6">
      <h2 className="text-lg font-semibold sm:text-xl">{title}</h2>
      {intro && <p className="mt-1 mb-5 max-w-prose text-sm leading-relaxed text-gray-600">{intro}</p>}
      {!intro && <div className="mb-4" />}
      {children}
    </section>
  );
}

/**
 * Veraenderung als Pfeil plus Prozent. Farbe und Pfeil zeigen dasselbe,
 * die Zahl steht immer daneben, damit nichts nur ueber Farbe laeuft.
 */
export function Delta({
  current,
  previous,
  lowerIsBetter = false,
  label,
}: {
  current: number;
  previous: number | null | undefined;
  lowerIsBetter?: boolean;
  label?: string;
}) {
  const ch = pctChange(current, previous);
  if (ch === null) {
    return <span className="text-xs text-gray-500">{label ? `${label}: ` : ''}kein Vergleich</span>;
  }
  const flat = Math.abs(ch) < 0.005;
  const good = lowerIsBetter ? ch < 0 : ch > 0;
  const cls = flat ? 'text-gray-500' : good ? 'text-emerald-700' : 'text-red-700';
  const arrow = flat ? '→' : ch > 0 ? '▲' : '▼';
  return (
    <span className={`whitespace-nowrap text-xs tabular-nums ${cls}`}>
      {label && <span className="text-gray-500">{label} </span>}
      <span aria-hidden>{arrow} </span>
      {fmtSignedPct(ch)}
    </span>
  );
}

/** Positionsveraenderung: Plus heisst weiter oben. */
export function PositionDelta({ position, prev }: { position: number; prev: number | null }) {
  if (prev === null) return <span className="text-xs font-medium text-sky-700">neu</span>;
  const d = prev - position;
  if (Math.abs(d) < 0.5) return <span className="text-xs text-gray-500 tabular-nums">gleich</span>;
  return (
    <span className={`whitespace-nowrap text-xs tabular-nums ${d > 0 ? 'text-emerald-700' : 'text-red-700'}`}>
      <span aria-hidden>{d > 0 ? '▲' : '▼'} </span>
      {d > 0 ? '+' : '-'}
      {Math.abs(d).toLocaleString('de-DE', { maximumFractionDigits: 1 })}
      <span className="sr-only">{d > 0 ? ' Plätze besser' : ' Plätze schlechter'}</span>
    </span>
  );
}

/** Minimales Inline-Markdown: **fett** und `code`. Alles andere bleibt Text. */
export function InlineMd({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith('**') ? (
          <strong key={i} className="font-semibold">
            {p.slice(2, -2)}
          </strong>
        ) : p.startsWith('`') ? (
          <code key={i} className="rounded bg-gray-100 px-1 py-0.5 text-[0.9em]">
            {p.slice(1, -1)}
          </code>
        ) : (
          <Fragment key={i}>{p}</Fragment>
        ),
      )}
    </>
  );
}

export function StatusBadge({ status }: { status: PortalActivity['status'] }) {
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium ${ACTIVITY_STATUS_BADGES[status]}`}>
      {ACTIVITY_STATUS_LABELS[status]}
    </span>
  );
}

export function ActivityList({ items }: { items: PortalActivity[] }) {
  return (
    <ol className="divide-y divide-gray-100">
      {items.map((a) => (
        <li key={a.id} className="py-4 first:pt-0 last:pb-0">
          <div className="mb-1.5 flex flex-wrap items-center gap-2 text-xs text-gray-500">
            <time dateTime={a.date} className="whitespace-nowrap tabular-nums">
              {formatIsoDateDE(a.date)}
            </time>
            <span aria-hidden>·</span>
            <span className="font-medium text-gray-700">{a.area}</span>
            <StatusBadge status={a.status} />
          </div>
          <p className="leading-relaxed text-gray-900">
            <InlineMd text={a.change} />
          </p>
          {a.benefit && (
            <p className="mt-1 text-sm leading-relaxed text-gray-600">
              <span className="font-medium text-gray-700">Ihr Nutzen: </span>
              <InlineMd text={a.benefit} />
            </p>
          )}
          {a.scope && (
            <p className="mt-0.5 text-sm text-gray-500">
              Umfang: <InlineMd text={a.scope} />
            </p>
          )}
          {a.links && <LinkList links={a.links} />}
        </li>
      ))}
    </ol>
  );
}

/** Massnahmen nach Monat gruppiert, neuester Monat zuerst. */
export function ActivityTimeline({ items }: { items: PortalActivity[] }) {
  const byMonth = new Map<string, PortalActivity[]>();
  for (const a of items) byMonth.set(a.month, [...(byMonth.get(a.month) ?? []), a]);
  const months = [...byMonth.keys()].sort().reverse();
  return (
    <div className="space-y-6">
      {months.map((m) => (
        <section key={m} className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-6">
          <h2 className="mb-4 flex items-baseline justify-between gap-3 text-lg font-semibold">
            {formatMonthDE(m)}
            <span className="text-sm font-normal text-gray-500">
              {byMonth.get(m)!.length} {byMonth.get(m)!.length === 1 ? 'Eintrag' : 'Einträge'}
            </span>
          </h2>
          <ActivityList items={byMonth.get(m)!.sort((a, b) => b.date.localeCompare(a.date))} />
        </section>
      ))}
    </div>
  );
}

export function PlannedList({ items }: { items: PortalActivity[] }) {
  return (
    <ul className="space-y-2.5">
      {items.map((a) => (
        <li key={a.id} className="flex gap-3 leading-relaxed">
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gray-400" aria-hidden />
          <span>
            <span className="font-medium">{a.area}: </span>
            <InlineMd text={a.change} />
          </span>
        </li>
      ))}
    </ul>
  );
}
