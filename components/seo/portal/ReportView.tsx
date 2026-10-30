import Link from 'next/link';
import { BucketColumnChart } from '@/components/seo/charts/ColumnChart';
import { STATUS_COLORS } from '@/components/seo/charts/palette';
import { BUCKET_LABELS } from '@/lib/seo/analysis';
import { formatMonthDE, formatMonthShortDE, monthNameDE } from '@/lib/seo/months';
import {
  fmtCls,
  fmtInt,
  fmtPct,
  fmtPos,
  fmtSeconds,
  rateCls,
  rateInp,
  rateLcp,
  rateScore,
  RATING_LABELS,
  shortUrl,
  type PortalData,
  type Rating,
} from '@/lib/seo/view';
import type { PageSpeedResult, SeoMetrics } from '@/lib/seo/types';
import CheckCard from './CheckCard';
import KeywordTable from './KeywordTable';
import MetricHistory from './MetricHistory';
import MoversPanel from './MoversPanel';
import { ActivityList, Delta, PlannedList, Section } from './parts';

/**
 * Der Monatsbericht im Portal. Wird vom Portal (Server) und von der
 * Admin-Vorschau (Client) mit demselben PortalData gerendert.
 */

const NAV: Array<[string, string]> = [
  ['einschaetzung', 'Einschätzung'],
  ['zahlen', 'Zahlen'],
  ['massnahmen', 'Was wir getan haben'],
  ['pruefungen', 'Prüfungen'],
  ['suchbegriffe', 'Suchbegriffe'],
  ['gewinner', 'Gewinner und Verlierer'],
  ['chancen', 'Chancen'],
  ['platzierung', 'Platzierungen'],
  ['themen', 'Themen'],
  ['seiten', 'Seiten'],
  ['ladezeit', 'Ladezeit'],
];

function Kpi({
  label,
  value,
  explain,
  cur,
  prev,
  yoy,
  lowerIsBetter,
}: {
  label: string;
  value: string;
  explain: string;
  cur: number;
  prev: number | null | undefined;
  yoy: number | null | undefined;
  lowerIsBetter?: boolean;
}) {
  return (
    <div className="flex flex-col rounded-xl border border-gray-200 bg-white p-4">
      <div className="text-sm font-medium text-gray-600">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums whitespace-nowrap sm:text-3xl">{value}</div>
      <div className="mt-2 flex flex-col gap-0.5">
        <Delta label="Vormonat" current={cur} previous={prev} lowerIsBetter={lowerIsBetter} />
        <Delta label="Vorjahr" current={cur} previous={yoy} lowerIsBetter={lowerIsBetter} />
      </div>
      <p className="mt-3 text-xs leading-snug text-gray-500">{explain}</p>
    </div>
  );
}

function RatingDot({ rating }: { rating: Rating }) {
  return <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: STATUS_COLORS[rating] }} aria-hidden />;
}

function Vital({ label, rating, text }: { label: string; rating: Rating; text: string }) {
  return (
    <div className="flex items-center gap-1.5 text-sm">
      <RatingDot rating={rating} />
      <span className="text-gray-500">{label}</span>
      <span className="tabular-nums whitespace-nowrap">{text}</span>
      <span className="sr-only">({RATING_LABELS[rating]})</span>
    </div>
  );
}

function SpeedRow({ r }: { r: PageSpeedResult }) {
  const scoreRating = rateScore(r.score);
  return (
    <div className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:gap-6">
      <div className="flex w-40 items-center gap-2">
        <span className="text-sm font-medium">{r.strategy === 'mobile' ? 'Handy' : 'Computer'}</span>
        {r.score === null ? (
          <span className="text-sm text-gray-500">Messung fehlgeschlagen</span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 px-2 py-0.5 text-sm tabular-nums">
            <RatingDot rating={scoreRating} />
            {r.score} {RATING_LABELS[scoreRating]}
          </span>
        )}
      </div>
      {r.score !== null && (
        <div className="flex flex-wrap gap-x-5 gap-y-1">
          <Vital label="Ladezeit (LCP)" rating={rateLcp(r.lcpMs)} text={fmtSeconds(r.lcpMs)} />
          <Vital label="Reaktion (INP)" rating={rateInp(r.inpMs)} text={r.inpMs === null ? 'noch keine Daten' : `${r.inpMs} ms`} />
          <Vital label="Stabilität (CLS)" rating={rateCls(r.cls)} text={fmtCls(r.cls)} />
        </div>
      )}
    </div>
  );
}

export default function ReportView({
  data,
  monthBaseHref,
  pdfHref,
  preview = false,
}: {
  data: PortalData;
  /** z. B. "/portal?monat=", der Monat wird angehaengt. */
  monthBaseHref: string;
  pdfHref?: string | null;
  preview?: boolean;
}) {
  if (!data.month || !data.kpis) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8">
        <h1 className="text-2xl font-semibold">Ihr erster Bericht wird vorbereitet</h1>
        <p className="mt-2 max-w-prose leading-relaxed text-gray-600">
          Sobald die Zahlen aus der Google Search Console ausgewertet sind, finden Sie hier jeden Monat Ihren Bericht. Wir
          melden uns per E-Mail, wenn er fertig ist.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link href="/portal/massnahmen" className="btn-secondary">
            Bisherige Maßnahmen ansehen
          </Link>
          {data.latestChecks.length > 0 && (
            <Link href="/portal/pruefungen" className="btn-secondary">
              Prüfungen ansehen
            </Link>
          )}
        </div>
      </div>
    );
  }

  const m = data.month;
  const k = data.kpis;
  const maxPotential = Math.max(1, ...data.opportunities.map((o) => o.potential));
  const bucketHistory = data.history.filter((h) => h.buckets);
  const currentBuckets = bucketHistory.find((h) => h.month === m)?.buckets;
  const groupRows = data.groupHistory.map((g) => {
    const idx = g.months.findIndex((x) => x.month === m);
    const cur = g.months[idx] ?? { clicks: 0, impressions: 0 };
    const prev = idx > 0 && g.months[idx - 1] ? g.months[idx - 1] : null;
    return { id: g.id, name: g.name, cur, prev };
  });
  const speedByUrl = new Map<string, PageSpeedResult[]>();
  for (const r of data.pagespeed?.results ?? []) speedByUrl.set(r.url, [...(speedByUrl.get(r.url) ?? []), r]);
  const knownClicks = k.brand.clicks + k.nonBrand.clicks;
  const brandShare = (s: SeoMetrics) => (knownClicks > 0 ? s.clicks / knownClicks : 0);

  return (
    <div className="space-y-5 sm:space-y-6">
      <header className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm text-gray-500">{data.client.domain}</p>
            <h1 className="text-2xl font-semibold sm:text-3xl">SEO-Bericht {formatMonthDE(m)}</h1>
          </div>
          {pdfHref && (
            <a href={pdfHref} className="btn-secondary pointer-coarse:h-11">
              Bericht als PDF
            </a>
          )}
        </div>
        {data.months.length > 1 && (
          <nav aria-label="Monat wählen" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <ul className="flex gap-1.5 pb-1">
              {data.months.map((x) => (
                <li key={x}>
                  <Link
                    href={`${monthBaseHref}${x}`}
                    aria-current={x === m ? 'page' : undefined}
                    className={`block whitespace-nowrap rounded-full border px-3 py-1 text-sm pointer-coarse:py-2 ${
                      x === m ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 bg-white text-gray-700 hover:border-gray-400'
                    }`}
                  >
                    {formatMonthShortDE(x)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}
        {preview && data.report?.status !== 'released' && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
            Vorschau: Dieser Monat ist noch nicht freigegeben. Der Kunde sieht ihn erst nach der Freigabe.
          </p>
        )}
        <nav aria-label="Abschnitte" className="hidden flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600 md:flex">
          {NAV.map(([id, l]) => (
            <a key={id} href={`#${id}`} className="hover:text-gray-900 hover:underline">
              {l}
            </a>
          ))}
        </nav>
      </header>

      {data.report?.assessment && (
        <section id="einschaetzung" className="scroll-mt-20 rounded-2xl border border-blue-100 bg-blue-50/60 p-4 sm:p-6">
          <h2 className="text-lg font-semibold sm:text-xl">Unsere Einschätzung</h2>
          <div className="mt-3 max-w-prose space-y-3 leading-relaxed text-gray-800">
            {data.report.assessment
              .split(/\n\s*\n/)
              .filter((p) => p.trim())
              .map((p, i) => (
                <p key={i} className="whitespace-pre-line">
                  {p.trim()}
                </p>
              ))}
          </div>
          <p className="mt-4 text-sm text-gray-600">Yusuf Kolac, Kolac Digital</p>
        </section>
      )}

      <section id="zahlen" className="scroll-mt-20 space-y-4">
        <h2 className="sr-only">Zahlen des Monats</h2>
        <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 lg:grid-cols-4">
          <Kpi label="Klicks" value={fmtInt(k.current.clicks)} explain="So oft wurde in der Google-Suche auf Ihre Website geklickt." cur={k.current.clicks} prev={k.prevMonth?.clicks} yoy={k.prevYear?.clicks} />
          <Kpi label="Impressionen" value={fmtInt(k.current.impressions)} explain="So oft wurde Ihre Website in den Suchergebnissen angezeigt." cur={k.current.impressions} prev={k.prevMonth?.impressions} yoy={k.prevYear?.impressions} />
          <Kpi label="Klickrate" value={fmtPct(k.current.ctr)} explain="Anteil der Anzeigen, bei denen jemand geklickt hat." cur={k.current.ctr} prev={k.prevMonth?.ctr} yoy={k.prevYear?.ctr} />
          <Kpi label="Durchschnittliche Position" value={fmtPos(k.current.position)} explain="Ihr Platz in den Suchergebnissen im Schnitt. Kleiner ist besser." cur={k.current.position} prev={k.prevMonth?.position} yoy={k.prevYear?.position} lowerIsBetter />
        </div>
        <Section id="verlauf" title={`Entwicklung der letzten ${data.history.length} Monate`}>
          <MetricHistory history={data.history} current={m} />
        </Section>
      </section>

      <Section
        id="massnahmen"
        title={`Was wir im ${monthNameDE(m)} für Sie getan haben`}
        intro="Jede Änderung an Ihrer Website, mit dem Nutzen für Sie. Den vollständigen Verlauf finden Sie unter „Maßnahmen“."
      >
        {data.activitiesThisMonth.length ? (
          <ActivityList items={data.activitiesThisMonth} />
        ) : (
          <p className="text-sm text-gray-600">Für diesen Monat sind noch keine Maßnahmen eingetragen.</p>
        )}
        {data.planned.length > 0 && (
          <div className="mt-6 rounded-xl bg-gray-50 p-4">
            <h3 className="mb-3 font-medium">Als Nächstes geplant</h3>
            <PlannedList items={data.planned} />
          </div>
        )}
      </Section>

      {data.latestChecks.length > 0 && (
        <Section
          id="pruefungen"
          title="Aktueller Stand Ihrer Website"
          intro="Die neuesten Prüfungen, die wir an Ihrer Website gemacht haben. Jede Zahl ist mit der Prüfung davor verglichen, die Links führen direkt zum Nachprüfen."
        >
          <div className="space-y-4">
            {data.latestChecks.slice(0, 3).map((c) => (
              <CheckCard key={c.id} check={c} />
            ))}
          </div>
          <Link href="/portal/pruefungen" className="mt-4 inline-block text-sm text-brand-blue hover:underline">
            Alle Prüfungen ansehen
          </Link>
        </Section>
      )}

      <Section
        id="suchbegriffe"
        title="Ihre wertvollsten Suchbegriffe"
        intro={
          <>
            Mit diesen Suchbegriffen wurde Ihre Website bei Google gefunden. Neue Kunden kommen vor allem über Suchen{' '}
            <strong>ohne Ihren Firmennamen</strong>. Diesen Monat waren das {fmtInt(k.nonBrand.clicks)} Klicks (
            {fmtPct(brandShare(k.nonBrand), 0)} der Klicks mit bekanntem Suchbegriff).
          </>
        }
      >
        <KeywordTable keywords={data.keywords} total={data.keywordTotal} groups={data.client.groups} />
        <p className="mt-4 text-xs leading-relaxed text-gray-500">
          Google zeigt aus Datenschutzgründen nicht jeden Suchbegriff. Die Summe der Tabelle ist deshalb etwas kleiner als die
          Gesamtzahl oben.
        </p>
      </Section>

      <Section id="gewinner" title="Gewinner und Verlierer" intro="Die Suchbegriffe mit der größten Veränderung zum Vormonat.">
        <MoversPanel movers={data.movers} />
      </Section>

      <Section
        id="chancen"
        title="Ihre größten Chancen"
        intro="Suchbegriffe, bei denen Ihre Seite schon auf Platz 4 bis 15 steht und oft angezeigt wird. Rückt die Seite auf Platz 3, sind diese zusätzlichen Besucher pro Monat realistisch."
      >
        {data.opportunities.length ? (
          <ol className="space-y-3">
            {data.opportunities.slice(0, 10).map((o) => (
              <li key={o.query} className="rounded-xl border border-gray-200 p-3 sm:p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <span className="font-medium break-words">{o.query}</span>
                  <span className="whitespace-nowrap font-semibold text-emerald-700 tabular-nums">+{fmtInt(o.potential)} Besucher</span>
                </div>
                <div className="mt-1 text-sm text-gray-500 tabular-nums">
                  Heute Platz {fmtPos(o.position)} · {fmtInt(o.impressions)} Impressionen · {fmtInt(o.clicks)} Klicks
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-gray-100" aria-hidden>
                  <div className="h-1.5 rounded-full bg-brand-blue" style={{ width: `${(o.potential / maxPotential) * 100}%` }} />
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-gray-600">Aktuell gibt es keine Suchbegriffe in diesem Bereich.</p>
        )}
      </Section>

      <Section
        id="platzierung"
        title="Wo Ihre Suchbegriffe stehen"
        intro="Anzahl der Suchbegriffe je Platzierung. Je mehr dunkelblau, desto mehr Suchbegriffe stehen ganz oben."
      >
        {currentBuckets && (
          <dl className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(Object.keys(BUCKET_LABELS) as Array<keyof typeof BUCKET_LABELS>).map((b) => (
              <div key={b} className="rounded-lg bg-gray-50 px-3 py-2">
                <dt className="text-xs text-gray-500">{BUCKET_LABELS[b]}</dt>
                <dd className="text-xl font-semibold tabular-nums">{fmtInt(currentBuckets[b])}</dd>
              </div>
            ))}
          </dl>
        )}
        {bucketHistory.length > 1 && (
          <BucketColumnChart points={bucketHistory.map((h) => ({ month: h.month, buckets: h.buckets! }))} current={m} />
        )}
      </Section>

      {groupRows.length > 1 && (
        <Section id="themen" title="Themen" intro="Ihre Suchbegriffe nach Themen zusammengefasst.">
          <ul className="divide-y divide-gray-100">
            {groupRows
              .sort((a, b) => b.cur.clicks - a.cur.clicks)
              .map((g) => (
                <li key={g.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2.5">
                  <span className="font-medium">{g.name}</span>
                  <span className="flex flex-wrap items-baseline gap-x-4 gap-y-0.5 text-sm tabular-nums">
                    <span className="whitespace-nowrap">
                      <span className="font-semibold">{fmtInt(g.cur.clicks)}</span> Klicks
                    </span>
                    <Delta current={g.cur.clicks} previous={g.prev?.clicks} />
                    <span className="whitespace-nowrap text-gray-500">{fmtInt(g.cur.impressions)} Impressionen</span>
                  </span>
                </li>
              ))}
          </ul>
        </Section>
      )}

      <Section id="seiten" title="Ihre besten Seiten" intro="Die Seiten Ihrer Website, die über Google die meisten Besucher bekommen.">
        <ol className="divide-y divide-gray-100">
          {data.pages.slice(0, 15).map((p) => (
            <li key={p.page} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2.5">
              <span className="min-w-0 break-all">{shortUrl(p.page)}</span>
              <span className="flex items-baseline gap-3 text-sm tabular-nums">
                <span className="whitespace-nowrap">
                  <span className="font-semibold">{fmtInt(p.clicks)}</span> Klicks
                </span>
                <Delta current={p.clicks} previous={p.prevClicks} />
              </span>
            </li>
          ))}
        </ol>
      </Section>

      {data.pagespeed && (
        <Section
          id="ladezeit"
          title="Ladezeit Ihrer wichtigsten Seiten"
          intro={`Gemessen mit Google PageSpeed Insights im ${formatMonthDE(data.pagespeed.month)}. Grün ist gut, gelb mittel, rot zu langsam. Die Reaktionszeit (INP) misst Google nur, wenn genug echte Besucher da waren.`}
        >
          <div className="space-y-4">
            {[...speedByUrl.entries()].map(([url, results]) => (
              <div key={url} className="rounded-xl border border-gray-200 px-4 py-2">
                <div className="pt-2 font-medium break-all">{shortUrl(url)}</div>
                <div className="divide-y divide-gray-100">
                  {results.map((r) => (
                    <SpeedRow key={r.strategy} r={r} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      <p className="px-1 text-xs leading-relaxed text-gray-500">
        Quelle der Zahlen: Google Search Console{data.pagespeed ? ' und Google PageSpeed Insights' : ''}. Alle Werte beziehen
        sich auf den {formatMonthDE(m)}, Vergleiche auf den Vormonat und den gleichen Monat im Vorjahr.
      </p>
    </div>
  );
}
