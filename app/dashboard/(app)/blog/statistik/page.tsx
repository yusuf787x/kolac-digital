'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  listBlogPosts,
  listBlogStats,
  listBlogStatDays,
  listBlogSearches,
} from '@/lib/firestore';
import type {
  BlogPost,
  BlogStat,
  BlogStatDay,
  BlogSearchStat,
} from '@/lib/types';
import {
  NO_TRACK_KEY,
  REFERRER_LABELS,
  type BlogReferrer,
} from '@/lib/blog-tracking';

/**
 * Ratgeber-Statistik: welche Beitraege gelesen werden, welche helfen,
 * welche zu Anfragen fuehren, woher die Leser kommen und wonach sie
 * suchen. Datenquelle ist /api/blog/track (siehe lib/blog-tracking.ts).
 */

type Range = 7 | 30 | 90;
type SortKey = 'periodViews' | 'views' | 'readRate' | 'helpful' | 'cta';

/** Datum in deutscher Zeit als JJJJ-MM-TT, n Tage zurueck. */
function berlinDay(daysAgo = 0): string {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Berlin',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(Date.now() - daysAgo * 86_400_000));
}

const pct = (part: number, whole: number) =>
  whole > 0 ? Math.round((part / whole) * 100) : null;

const sum = (values: Array<number | undefined>) =>
  values.reduce<number>((a, b) => a + (b ?? 0), 0);

/** Ab so vielen Stimmen ist "hilfreich" aussagekraeftig. */
const MIN_VOTES = 3;

interface Row {
  post: BlogPost;
  stat: BlogStat | undefined;
  periodViews: number;
  views: number;
  readRate: number | null;
  helpfulRate: number | null;
  votes: number;
  cta: number;
  topRef: BlogReferrer | null;
}

export default function BlogStatsPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [stats, setStats] = useState<BlogStat[]>([]);
  const [days, setDays] = useState<BlogStatDay[]>([]);
  const [searches, setSearches] = useState<BlogSearchStat[]>([]);
  const [range, setRange] = useState<Range>(30);
  const [sort, setSort] = useState<SortKey>('periodViews');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noTrack, setNoTrack] = useState(false);

  useEffect(() => {
    try {
      setNoTrack(window.localStorage.getItem(NO_TRACK_KEY) === '1');
    } catch {
      // Ohne localStorage bleibt der Schalter aus.
    }
    Promise.all([
      listBlogPosts(),
      listBlogStats(),
      listBlogStatDays(berlinDay(89)),
      listBlogSearches(),
    ])
      .then(([p, s, d, q]) => {
        setPosts(p.filter((x) => x.status === 'published'));
        setStats(s);
        setDays(d);
        setSearches(q);
      })
      .catch((err) => setError((err as Error).message))
      .finally(() => setLoading(false));
  }, []);

  const toggleNoTrack = () => {
    const next = !noTrack;
    try {
      if (next) window.localStorage.setItem(NO_TRACK_KEY, '1');
      else window.localStorage.removeItem(NO_TRACK_KEY);
      setNoTrack(next);
    } catch {
      setError('Dieser Browser erlaubt keinen lokalen Speicher.');
    }
  };

  // Tage im Zeitraum, fehlende Tage mit null auffuellen.
  const series = useMemo(() => {
    const byDate = new Map(days.map((d) => [d.date, d]));
    const out: BlogStatDay[] = [];
    for (let i = range - 1; i >= 0; i--) {
      const date = berlinDay(i);
      out.push(byDate.get(date) ?? { date });
    }
    return out;
  }, [days, range]);

  const totals = useMemo(
    () => ({
      indexViews: sum(series.map((d) => d.indexViews)),
      views: sum(series.map((d) => d.views)),
      reads: sum(series.map((d) => d.reads)),
      cta: sum(series.map((d) => d.ctaClicks)),
    }),
    [series],
  );

  const rows = useMemo<Row[]>(() => {
    const statById = new Map(stats.map((s) => [s.postId, s]));
    const list = posts.map((post) => {
      const stat = statById.get(post.id);
      const views = stat?.views ?? 0;
      const yes = stat?.helpfulYes ?? 0;
      const no = stat?.helpfulNo ?? 0;
      const refs = Object.entries(stat?.referrers ?? {}).sort(
        (a, b) => b[1] - a[1],
      );
      return {
        post,
        stat,
        periodViews: sum(series.map((d) => d.posts?.[post.id])),
        views,
        readRate: pct(stat?.reads ?? 0, views),
        helpfulRate: yes + no >= MIN_VOTES ? pct(yes, yes + no) : null,
        votes: yes + no,
        cta: stat?.ctaClicks ?? 0,
        topRef: (refs[0]?.[0] as BlogReferrer | undefined) ?? null,
      };
    });
    const val = (r: Row): number => {
      switch (sort) {
        case 'views':
          return r.views;
        case 'readRate':
          return r.readRate ?? -1;
        case 'helpful':
          return r.helpfulRate ?? -1;
        case 'cta':
          return r.cta;
        default:
          return r.periodViews;
      }
    };
    return list.sort((a, b) => val(b) - val(a));
  }, [posts, stats, series, sort]);

  const highlights = useMemo(() => {
    const best = <T,>(list: T[], score: (x: T) => number | null) =>
      list
        .filter((x) => (score(x) ?? 0) > 0)
        .sort((a, b) => (score(b) ?? 0) - (score(a) ?? 0))[0];
    return {
      mostRead: best(rows, (r) => r.periodViews),
      mostHelpful: best(rows, (r) => r.helpfulRate),
      mostCta: best(rows, (r) => r.cta),
    };
  }, [rows]);

  const referrers = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of stats) {
      for (const [k, v] of Object.entries(s.referrers ?? {})) {
        m.set(k, (m.get(k) ?? 0) + v);
      }
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [stats]);
  const referrerTotal = sum(referrers.map(([, v]) => v));

  const categoryClicks = useMemo(() => {
    const m = new Map<string, number>();
    for (const d of series) {
      for (const [k, v] of Object.entries(d.categories ?? {})) {
        m.set(k, (m.get(k) ?? 0) + v);
      }
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [series]);

  const zeroHitSearches = searches.filter((s) => (s.zeroResults ?? 0) > 0);
  const maxDay = Math.max(1, ...series.map((d) => d.views ?? 0));

  if (loading) {
    return <div className="card text-sm text-gray-500">Lädt Statistik…</div>;
  }

  return (
    <div className="space-y-6">
      <header>
        <Link
          href="/dashboard/blog"
          className="text-sm text-gray-500 hover:text-gray-900 mb-3 inline-block"
        >
          ← Zurück zum Blog
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              Ratgeber-Statistik
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Ohne Cookies und ohne personenbezogene Daten gezählt. Bots sind
              herausgefiltert.
            </p>
          </div>
          <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
            {([7, 30, 90] as Range[]).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1.5 text-sm rounded-md ${
                  range === r
                    ? 'bg-white shadow-xs text-gray-900 font-medium'
                    : 'text-gray-600'
                }`}
              >
                {r} Tage
              </button>
            ))}
          </div>
        </div>
      </header>

      {error && (
        <div className="card text-sm text-red-700 bg-red-50">{error}</div>
      )}

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi label="Aufrufe Übersicht" value={totals.indexViews} />
        <Kpi label="Artikel-Aufrufe" value={totals.views} />
        <Kpi
          label="Zu Ende gelesen"
          value={totals.reads}
          sub={
            pct(totals.reads, totals.views) !== null
              ? `${pct(totals.reads, totals.views)} % der Aufrufe`
              : undefined
          }
        />
        <Kpi
          label="Klicks Erstgespräch & Co."
          value={totals.cta}
          sub={
            pct(totals.cta, totals.views) !== null
              ? `${pct(totals.cta, totals.views)} % der Aufrufe`
              : undefined
          }
        />
      </section>

      <section className="card">
        <h2 className="text-base font-semibold text-gray-900 mb-4">
          Artikel-Aufrufe pro Tag
        </h2>
        <div className="flex items-end gap-[2px] h-32" role="img" aria-label="Aufrufe pro Tag">
          {series.map((d) => (
            <div
              key={d.date}
              className="flex-1 bg-blue-500/80 hover:bg-blue-600 rounded-t-sm min-h-[2px]"
              style={{ height: `${((d.views ?? 0) / maxDay) * 100}%` }}
              title={`${d.date}: ${d.views ?? 0} Aufrufe`}
            />
          ))}
        </div>
        <div className="mt-2 flex justify-between text-xs text-gray-400">
          <span>{series[0]?.date}</span>
          <span>{series[series.length - 1]?.date}</span>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Highlight
          label={`Meistgelesen (${range} Tage)`}
          row={highlights.mostRead}
          detail={(r) => `${r.periodViews} Aufrufe`}
        />
        <Highlight
          label="Am hilfreichsten"
          row={highlights.mostHelpful}
          detail={(r) => `${r.helpfulRate} % hilfreich bei ${r.votes} Stimmen`}
          empty={`Noch kein Beitrag mit ${MIN_VOTES} oder mehr Stimmen.`}
        />
        <Highlight
          label="Bringt die meisten Anfragen-Klicks"
          row={highlights.mostCta}
          detail={(r) => `${r.cta} Klicks auf Erstgespräch, Telefon oder Leistungsseite`}
        />
      </section>

      <section className="card overflow-x-auto">
        <h2 className="text-base font-semibold text-gray-900 mb-1">
          Beiträge im Vergleich
        </h2>
        <p className="text-xs text-gray-500 mb-3">
          Spaltenköpfe sortieren. Gesamtwerte zählen seit Start der Messung,
          die erste Spalte nur im gewählten Zeitraum. „Hilfreich“ erscheint ab{' '}
          {MIN_VOTES} Stimmen.
        </p>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-500 border-b border-gray-200">
              <th className="py-2 pr-3 font-medium">Beitrag</th>
              <SortTh k="periodViews" sort={sort} setSort={setSort}>
                {range} Tage
              </SortTh>
              <SortTh k="views" sort={sort} setSort={setSort}>
                Gesamt
              </SortTh>
              <SortTh k="readRate" sort={sort} setSort={setSort}>
                Gelesen
              </SortTh>
              <SortTh k="helpful" sort={sort} setSort={setSort}>
                Hilfreich
              </SortTh>
              <SortTh k="cta" sort={sort} setSort={setSort}>
                Klicks
              </SortTh>
              <th className="py-2 pl-3 font-medium">Herkunft</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.post.id} className="border-b border-gray-100 last:border-0">
                <td className="py-2 pr-3 max-w-[320px]">
                  <Link
                    href={`/dashboard/blog/${r.post.id}`}
                    className="text-gray-900 hover:underline line-clamp-2"
                  >
                    {r.post.title}
                  </Link>
                  <span className="text-xs text-gray-400">{r.post.category}</span>
                </td>
                <td className="py-2 px-3 text-right tabular-nums font-medium">
                  {r.periodViews}
                </td>
                <td className="py-2 px-3 text-right tabular-nums">{r.views}</td>
                <td className="py-2 px-3 text-right tabular-nums">
                  {r.readRate !== null ? `${r.readRate} %` : '–'}
                </td>
                <td className="py-2 px-3 text-right tabular-nums">
                  {r.helpfulRate !== null ? (
                    <span
                      className={
                        r.helpfulRate >= 70
                          ? 'text-green-700'
                          : r.helpfulRate < 40
                            ? 'text-red-700'
                            : ''
                      }
                    >
                      {r.helpfulRate} %
                    </span>
                  ) : (
                    <span className="text-gray-400">
                      {r.votes > 0 ? `${r.votes} St.` : '–'}
                    </span>
                  )}
                </td>
                <td className="py-2 px-3 text-right tabular-nums">{r.cta}</td>
                <td className="py-2 pl-3 text-xs text-gray-600 whitespace-nowrap">
                  {r.topRef ? REFERRER_LABELS[r.topRef] : '–'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="card">
          <h2 className="text-base font-semibold text-gray-900 mb-1">
            Woher die Leser kommen
          </h2>
          <p className="text-xs text-gray-500 mb-3">
            Alle Artikel-Aufrufe seit Start. „KI-Assistenten“ sind Besuche aus
            ChatGPT, Perplexity, Copilot, Gemini und Claude.
          </p>
          {referrers.length === 0 ? (
            <p className="text-sm text-gray-500">Noch keine Daten.</p>
          ) : (
            <div className="space-y-2">
              {referrers.map(([k, v]) => (
                <div key={k}>
                  <div className="flex justify-between text-sm">
                    <span>{REFERRER_LABELS[k as BlogReferrer] ?? k}</span>
                    <span className="tabular-nums text-gray-600">
                      {v} · {pct(v, referrerTotal)} %
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${k === 'ki' ? 'bg-violet-500' : 'bg-blue-500'}`}
                      style={{ width: `${pct(v, referrerTotal) ?? 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="text-base font-semibold text-gray-900 mb-1">
            Kategorie-Filter ({range} Tage)
          </h2>
          <p className="text-xs text-gray-500 mb-3">
            Wie oft eine Kategorie in der Übersicht angeklickt wurde.
          </p>
          {categoryClicks.length === 0 ? (
            <p className="text-sm text-gray-500">Noch keine Daten.</p>
          ) : (
            <ul className="text-sm space-y-1">
              {categoryClicks.map(([k, v]) => (
                <li key={k} className="flex justify-between">
                  <span>{k}</span>
                  <span className="tabular-nums text-gray-600">{v}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="card">
          <h2 className="text-base font-semibold text-gray-900 mb-1">
            Suchen ohne Treffer
          </h2>
          <p className="text-xs text-gray-500 mb-3">
            Danach haben Leser gesucht und nichts gefunden. Gute Kandidaten
            für neue Beiträge.
          </p>
          {zeroHitSearches.length === 0 ? (
            <p className="text-sm text-gray-500">Bisher nichts.</p>
          ) : (
            <ul className="text-sm space-y-1">
              {zeroHitSearches.map((s) => (
                <li key={s.term} className="flex justify-between gap-3">
                  <span className="text-gray-900">{s.term}</span>
                  <span className="tabular-nums text-gray-600">
                    {s.zeroResults}×
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card">
          <h2 className="text-base font-semibold text-gray-900 mb-1">
            Häufigste Suchbegriffe
          </h2>
          <p className="text-xs text-gray-500 mb-3">Seit Start der Messung.</p>
          {searches.length === 0 ? (
            <p className="text-sm text-gray-500">Noch keine Suchen.</p>
          ) : (
            <ul className="text-sm space-y-1">
              {searches.slice(0, 20).map((s) => (
                <li key={s.term} className="flex justify-between gap-3">
                  <span className="text-gray-900">{s.term}</span>
                  <span className="tabular-nums text-gray-600">
                    {s.count}× · zuletzt {s.lastResults} Treffer
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="card flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-gray-900">
            Eigene Besuche ausschließen
          </h2>
          <p className="text-sm text-gray-500">
            Gilt nur für diesen Browser. Am besten auf jedem Gerät einmal
            setzen, mit dem du den Blog liest.
          </p>
        </div>
        <button onClick={toggleNoTrack} className={noTrack ? 'btn-primary' : 'btn-secondary'}>
          {noTrack ? 'Wird nicht gezählt ✓' : 'Diesen Browser nicht mitzählen'}
        </button>
      </section>
    </div>
  );
}

function Kpi({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="card">
      <p className="text-xs uppercase tracking-wider text-gray-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-gray-900 tabular-nums">{value}</p>
      {sub && <p className="mt-1 text-xs text-gray-500">{sub}</p>}
    </div>
  );
}

function Highlight({
  label,
  row,
  detail,
  empty = 'Noch keine Daten.',
}: {
  label: string;
  row: Row | undefined;
  detail: (r: Row) => string;
  empty?: string;
}) {
  return (
    <div className="card">
      <p className="text-xs uppercase tracking-wider text-gray-500">{label}</p>
      {row ? (
        <>
          <Link
            href={`/dashboard/blog/${row.post.id}`}
            className="mt-2 block font-medium text-gray-900 hover:underline"
          >
            {row.post.title}
          </Link>
          <p className="mt-1 text-xs text-gray-500">{detail(row)}</p>
        </>
      ) : (
        <p className="mt-2 text-sm text-gray-500">{empty}</p>
      )}
    </div>
  );
}

function SortTh({
  k,
  sort,
  setSort,
  children,
}: {
  k: SortKey;
  sort: SortKey;
  setSort: (k: SortKey) => void;
  children: React.ReactNode;
}) {
  return (
    <th className="py-2 px-3 font-medium text-right whitespace-nowrap">
      <button
        onClick={() => setSort(k)}
        className={sort === k ? 'text-gray-900' : 'hover:text-gray-900'}
      >
        {children}
        {sort === k ? ' ↓' : ''}
      </button>
    </th>
  );
}
