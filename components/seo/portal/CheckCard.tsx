import { formatIsoDateDE } from '@/lib/seo/months';
import { CHECK_KIND_LABELS, type ActivityLink, type SeoFindingStatus } from '@/lib/seo/types';
import type { PortalCheck, PortalCheckMetric } from '@/lib/seo/view';

/** Eine Pruefung (Scan) fuer Laien: Kurzfassung, Kennzahlen mit Vergleich, Befunde, Links. */

const num = (v: number) => v.toLocaleString('de-DE', { maximumFractionDigits: 2 });

export function LinkList({ links }: { links: ActivityLink[] }) {
  if (!links.length) return null;
  return (
    <ul className="mt-2 flex flex-wrap gap-2">
      {links.map((l) => (
        <li key={l.url}>
          <a
            href={l.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-3 py-1 text-sm text-brand-blue hover:border-brand-blue pointer-coarse:py-2"
          >
            {l.label}
            <span aria-hidden>↗</span>
            <span className="sr-only">(öffnet in neuem Tab)</span>
          </a>
        </li>
      ))}
    </ul>
  );
}

function MetricTile({ m }: { m: PortalCheckMetric }) {
  let delta: React.ReactNode = null;
  if (m.previous !== null && m.previous !== m.value) {
    const up = m.value > m.previous;
    const good = m.better === null ? null : (m.better === 'higher') === up;
    const cls = good === null ? 'text-gray-600' : good ? 'text-emerald-700' : 'text-red-700';
    delta = (
      <span className={`whitespace-nowrap text-xs tabular-nums ${cls}`}>
        <span aria-hidden>{up ? '▲' : '▼'} </span>
        vorher {num(m.previous)}
        {m.unit ? ` ${m.unit}` : ''}
        {good !== null && <span className="sr-only">{good ? ', verbessert' : ', verschlechtert'}</span>}
      </span>
    );
  } else if (m.previous !== null) {
    delta = <span className="text-xs text-gray-500">unverändert</span>;
  }
  return (
    <div className="rounded-lg bg-gray-50 px-3 py-2">
      <div className="text-xs text-gray-600">{m.label}</div>
      <div className="text-xl font-semibold tabular-nums whitespace-nowrap">
        {num(m.value)}
        {m.unit && <span className="ml-1 text-sm font-normal text-gray-600">{m.unit}</span>}
      </div>
      {delta}
      {m.explain && <p className="mt-1 text-xs leading-snug text-gray-500">{m.explain}</p>}
    </div>
  );
}

const FINDING: Record<SeoFindingStatus, { icon: string; cls: string; label: string }> = {
  ok: { icon: '✓', cls: 'bg-emerald-50 text-emerald-700', label: 'In Ordnung' },
  warn: { icon: '!', cls: 'bg-amber-50 text-amber-700', label: 'Verbesserung möglich' },
  fail: { icon: '✕', cls: 'bg-red-50 text-red-700', label: 'Problem' },
};

export default function CheckCard({ check }: { check: PortalCheck }) {
  const order: SeoFindingStatus[] = ['fail', 'warn', 'ok'];
  const findings = [...check.findings].sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status));
  return (
    <article className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
      <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
        <time dateTime={check.date} className="whitespace-nowrap tabular-nums">
          {formatIsoDateDE(check.date)}
        </time>
        <span aria-hidden>·</span>
        <span className="font-medium text-gray-700">{CHECK_KIND_LABELS[check.kind]}</span>
      </div>
      <h3 className="text-lg font-semibold">{check.title}</h3>
      <p className="mt-1 max-w-prose leading-relaxed text-gray-700">{check.summary}</p>

      {check.metrics.length > 0 && (
        <div className="mt-4 grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 md:grid-cols-3">
          {check.metrics.map((m) => (
            <MetricTile key={m.key} m={m} />
          ))}
        </div>
      )}
      {check.previousDate && check.metrics.some((m) => m.previous !== null) && (
        <p className="mt-2 text-xs text-gray-500">Verglichen mit der Prüfung vom {formatIsoDateDE(check.previousDate)}.</p>
      )}

      {findings.length > 0 && (
        <ul className="mt-4 space-y-2">
          {findings.map((f, i) => (
            <li key={i} className="flex gap-2.5 text-sm leading-relaxed">
              <span
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${FINDING[f.status].cls}`}
                aria-hidden
              >
                {FINDING[f.status].icon}
              </span>
              <span>
                <span className="sr-only">{FINDING[f.status].label}: </span>
                {f.text}
                {f.url && (
                  <>
                    {' '}
                    <a href={f.url} target="_blank" rel="noopener noreferrer" className="whitespace-nowrap text-brand-blue underline-offset-2 hover:underline">
                      ansehen ↗
                    </a>
                  </>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
      <LinkList links={check.links} />
    </article>
  );
}
