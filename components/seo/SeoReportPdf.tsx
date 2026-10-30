/* eslint-disable jsx-a11y/alt-text */
// Bewusst KEIN 'use client': wird serverseitig von lib/seo/server/report.tsx
// gerendert (Cron, Freigabe). Gleiche Konvention wie InvoicePDF.

import { Document, Page, View, Text, Image, Link, StyleSheet } from '@react-pdf/renderer';
import { BUCKET_LABELS, pctChange, type KeywordRow } from '@/lib/seo/analysis';
import { stripInlineMarkdown } from '@/lib/seo/changelog-markdown';
import { formatIsoDateDE, formatMonthDE, formatMonthShortDE } from '@/lib/seo/months';
import { ACTIVITY_STATUS_LABELS, CHECK_KIND_LABELS, type SeoMetrics } from '@/lib/seo/types';
import {
  fmtCls,
  fmtInt,
  fmtPct,
  fmtPos,
  fmtSeconds,
  fmtSignedPct,
  rateCls,
  rateInp,
  rateLcp,
  rateScore,
  RATING_LABELS,
  shortUrl,
  type PortalData,
  type Rating,
} from '@/lib/seo/view';
import { BUCKET_COLORS, BUCKET_ORDER, SERIES_COLOR, STATUS_COLORS } from './charts/palette';

const C = {
  blue: '#2563EB',
  black: '#0a0a0a',
  gray: '#6b7280',
  lightGray: '#9ca3af',
  border: '#e5e7eb',
  bgLight: '#f9fafb',
  up: '#047857',
  down: '#b91c1c',
};

const s = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 60,
    paddingHorizontal: 44,
    fontSize: 9.5,
    fontFamily: 'Helvetica',
    color: C.black,
    lineHeight: 1.45,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 },
  logo: { width: 120, height: 40, objectFit: 'contain' },
  headerMeta: { textAlign: 'right', fontSize: 8.5, color: C.gray },
  draft: {
    marginBottom: 14,
    padding: 8,
    backgroundColor: '#fef3c7',
    borderRadius: 6,
    fontSize: 9,
    color: '#92400e',
  },
  h1: { fontSize: 20, fontFamily: 'Helvetica-Bold', lineHeight: 1.2, marginBottom: 6 },
  sub: { fontSize: 10, color: C.gray, marginBottom: 18 },
  h2: { fontSize: 13, fontFamily: 'Helvetica-Bold', marginTop: 18, marginBottom: 8 },
  hint: { fontSize: 8.5, color: C.gray, marginBottom: 8 },
  kpiRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  kpi: { flex: 1, borderWidth: 1, borderColor: C.border, borderRadius: 8, padding: 10 },
  kpiLabel: { fontSize: 8, color: C.gray, textTransform: 'uppercase', letterSpacing: 0.5 },
  kpiValue: { fontSize: 17, fontFamily: 'Helvetica-Bold', marginTop: 4, marginBottom: 4 },
  kpiCmp: { fontSize: 8, color: C.gray },
  assessment: { backgroundColor: C.bgLight, borderRadius: 8, padding: 12, borderLeftWidth: 3, borderLeftColor: C.blue },
  assessmentTitle: { fontFamily: 'Helvetica-Bold', fontSize: 10.5, marginBottom: 6 },
  para: { marginBottom: 6 },
  table: { borderTopWidth: 1, borderTopColor: C.border },
  tr: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: C.border, paddingVertical: 4 },
  th: { fontFamily: 'Helvetica-Bold', fontSize: 8, color: C.gray },
  td: { fontSize: 8.5 },
  num: { textAlign: 'right' },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 44,
    right: 44,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 7.5,
    color: C.lightGray,
  },
  chart: { flexDirection: 'row', alignItems: 'flex-end', height: 110, gap: 3, borderBottomWidth: 1, borderBottomColor: C.border },
  chartCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%' },
  chartLabels: { flexDirection: 'row', gap: 3, marginTop: 3 },
  chartLabel: { flex: 1, fontSize: 6.5, color: C.gray, textAlign: 'center' },
  legend: { flexDirection: 'row', gap: 12, marginTop: 6 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4, fontSize: 7.5, color: C.gray },
  swatch: { width: 8, height: 8, borderRadius: 2 },
  activity: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: C.border, paddingVertical: 5, gap: 8 },
  pill: { fontSize: 7, color: C.gray, borderWidth: 1, borderColor: C.border, borderRadius: 3, paddingHorizontal: 3, paddingVertical: 1 },
});

function Cmp({ label, cur, prev, lowerIsBetter }: { label: string; cur: number; prev: number | null | undefined; lowerIsBetter?: boolean }) {
  const ch = pctChange(cur, prev);
  if (ch === null) return <Text style={s.kpiCmp}>{label}: keine Daten</Text>;
  const good = lowerIsBetter ? ch < 0 : ch > 0;
  const color = Math.abs(ch) < 0.005 ? C.gray : good ? C.up : C.down;
  return (
    <Text style={s.kpiCmp}>
      {label}: <Text style={{ color }}>{fmtSignedPct(ch)}</Text>
    </Text>
  );
}

function Kpi({ label, value, cur, prev, yoy, lowerIsBetter }: { label: string; value: string; cur: number; prev?: number | null; yoy?: number | null; lowerIsBetter?: boolean }) {
  return (
    <View style={s.kpi}>
      <Text style={s.kpiLabel}>{label}</Text>
      <Text style={s.kpiValue}>{value}</Text>
      <Cmp label="Vormonat" cur={cur} prev={prev} lowerIsBetter={lowerIsBetter} />
      <Cmp label="Vorjahr" cur={cur} prev={yoy} lowerIsBetter={lowerIsBetter} />
    </View>
  );
}

function Table<T>({ cols, rows }: { cols: Array<{ label: string; width: string; num?: boolean; render: (r: T) => string; color?: (r: T) => string | undefined }>; rows: T[] }) {
  return (
    <View style={s.table}>
      <View style={s.tr}>
        {cols.map((c) => (
          <Text key={c.label} style={[s.th, { width: c.width }, c.num ? s.num : {}]}>
            {c.label}
          </Text>
        ))}
      </View>
      {rows.map((r, i) => (
        <View key={i} style={s.tr} wrap={false}>
          {cols.map((c) => (
            <Text key={c.label} style={[s.td, { width: c.width }, c.num ? s.num : {}, c.color?.(r) ? { color: c.color(r) } : {}]}>
              {c.render(r)}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

function posDelta(r: KeywordRow): string {
  if (r.prevPosition === null) return 'neu';
  const d = r.prevPosition - r.position;
  if (Math.abs(d) < 0.5) return '0';
  return `${d > 0 ? '+' : '-'}${fmtPos(Math.abs(d))}`;
}
const posDeltaColor = (r: KeywordRow) =>
  r.prevPosition === null ? undefined : r.prevPosition - r.position >= 0.5 ? C.up : r.prevPosition - r.position <= -0.5 ? C.down : undefined;

function RatingText({ rating, text }: { rating: Rating; text: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
      <View style={[s.swatch, { backgroundColor: STATUS_COLORS[rating], borderRadius: 4 }]} />
      <Text style={s.td}>{text}</Text>
    </View>
  );
}

export interface SeoReportPdfProps {
  data: PortalData;
  logoSrc: string | { data: Buffer; format: 'png' };
  draft: boolean;
}

export default function SeoReportPdf({ data, logoSrc, draft }: SeoReportPdfProps) {
  const month = data.month!;
  const k = data.kpis!;
  const monthLabel = formatMonthDE(month);
  const maxClicks = Math.max(1, ...data.history.map((h) => h.clicks));
  const nonBrand = data.keywords.filter((r) => !r.isBrand).slice(0, 20);
  const bucketHistory = data.history.filter((h) => h.buckets).slice(-6);

  return (
    <Document title={`SEO-Bericht ${monthLabel} ${data.client.displayName}`} author="Kolac Digital">
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <Image src={logoSrc} style={s.logo} />
          <Text style={s.headerMeta}>
            {data.client.displayName}
            {'\n'}
            {data.client.domain}
          </Text>
        </View>

        {draft && (
          <Text style={s.draft}>
            Entwurf zur Prüfung. Dieser Bericht ist noch nicht freigegeben und für den Kunden nicht sichtbar.
          </Text>
        )}

        <Text style={s.h1}>SEO-Bericht {monthLabel}</Text>
        <Text style={s.sub}>So wurde Ihre Website in der Google-Suche gefunden. Quelle: Google Search Console.</Text>

        <View style={s.kpiRow}>
          <Kpi label="Klicks" value={fmtInt(k.current.clicks)} cur={k.current.clicks} prev={k.prevMonth?.clicks} yoy={k.prevYear?.clicks} />
          <Kpi label="Impressionen" value={fmtInt(k.current.impressions)} cur={k.current.impressions} prev={k.prevMonth?.impressions} yoy={k.prevYear?.impressions} />
          <Kpi label="Klickrate" value={fmtPct(k.current.ctr)} cur={k.current.ctr} prev={k.prevMonth?.ctr} yoy={k.prevYear?.ctr} />
          <Kpi label="Ø Position" value={fmtPos(k.current.position)} cur={k.current.position} prev={k.prevMonth?.position} yoy={k.prevYear?.position} lowerIsBetter />
        </View>

        {data.report?.assessment ? (
          <View style={s.assessment}>
            <Text style={s.assessmentTitle}>Unsere Einschätzung</Text>
            {data.report.assessment.split(/\n\s*\n/).map((p, i) => (
              <Text key={i} style={s.para}>
                {stripInlineMarkdown(p.trim())}
              </Text>
            ))}
          </View>
        ) : null}

        <Text style={s.h2}>Klicks der letzten {data.history.length} Monate</Text>
        <View style={s.chart}>
          {data.history.map((h) => (
            <View key={h.month} style={s.chartCol}>
              <Text style={{ fontSize: 6.5, color: C.gray, marginBottom: 2 }}>{h.month === month ? fmtInt(h.clicks) : ''}</Text>
              <View
                style={{
                  width: '70%',
                  maxWidth: 18,
                  height: `${Math.max(1, (h.clicks / maxClicks) * 85)}%`,
                  backgroundColor: SERIES_COLOR,
                  opacity: h.month === month ? 1 : 0.55,
                  borderTopLeftRadius: 3,
                  borderTopRightRadius: 3,
                }}
              />
            </View>
          ))}
        </View>
        <View style={s.chartLabels}>
          {data.history.map((h) => (
            <Text key={h.month} style={s.chartLabel}>
              {formatMonthShortDE(h.month)}
            </Text>
          ))}
        </View>

        <Footer data={data} />
      </Page>

      <Page size="A4" style={s.page}>
        <Text style={[s.h2, { marginTop: 0 }]}>Was wir im {monthLabel.split(' ')[0]} für Sie getan haben</Text>
        {data.activitiesThisMonth.length === 0 ? (
          <Text style={s.hint}>Für diesen Monat sind keine Maßnahmen eingetragen.</Text>
        ) : (
          data.activitiesThisMonth.map((a) => (
            <View key={a.id} style={s.activity} wrap={false}>
              <Text style={{ width: 52, fontSize: 8, color: C.gray }}>{formatIsoDateDE(a.date)}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 9 }}>
                  {stripInlineMarkdown(a.change)}
                </Text>
                {a.benefit ? <Text style={{ fontSize: 8.5, color: '#374151' }}>Ihr Nutzen: {stripInlineMarkdown(a.benefit)}</Text> : null}
                {a.scope ? <Text style={{ fontSize: 8, color: C.gray }}>Umfang: {stripInlineMarkdown(a.scope)}</Text> : null}
                {(a.links ?? []).map((l) => (
                  <Link key={l.url} src={l.url} style={{ fontSize: 8, color: C.blue }}>
                    {l.label}
                  </Link>
                ))}
              </View>
              <View style={{ width: 92, alignItems: 'flex-end', gap: 2 }}>
                <Text style={s.pill}>{a.area}</Text>
                <Text style={{ fontSize: 7, color: C.gray }}>{ACTIVITY_STATUS_LABELS[a.status]}</Text>
              </View>
            </View>
          ))
        )}

        {data.checksThisMonth.length > 0 && (
          <>
            <Text style={s.h2}>Prüfungen im {monthLabel.split(' ')[0]}</Text>
            {data.checksThisMonth.map((c) => (
              <View key={c.id} style={s.activity} wrap={false}>
                <Text style={{ width: 52, fontSize: 8, color: C.gray }}>{formatIsoDateDE(c.date)}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 9 }}>
                    {CHECK_KIND_LABELS[c.kind]}: {c.title}
                  </Text>
                  <Text style={{ fontSize: 8.5, color: '#374151' }}>{c.summary}</Text>
                  {c.metrics.length > 0 && (
                    <Text style={{ fontSize: 8, color: C.gray }}>
                      {c.metrics
                        .map(
                          (m) =>
                            `${m.label}: ${m.value.toLocaleString('de-DE')}${m.unit ? ` ${m.unit}` : ''}${
                              m.previous !== null && m.previous !== m.value ? ` (vorher ${m.previous.toLocaleString('de-DE')})` : ''
                            }`,
                        )
                        .join('  ·  ')}
                    </Text>
                  )}
                  {c.links.map((l) => (
                    <Link key={l.url} src={l.url} style={{ fontSize: 8, color: C.blue }}>
                      {l.label}: {l.url}
                    </Link>
                  ))}
                </View>
              </View>
            ))}
          </>
        )}

        {data.planned.length > 0 && (
          <>
            <Text style={s.h2}>Als Nächstes geplant</Text>
            {data.planned.map((a) => (
              <Text key={a.id} style={{ marginBottom: 3 }}>
                {'·  '}
                <Text style={{ fontFamily: 'Helvetica-Bold' }}>{a.area}: </Text>
                {stripInlineMarkdown(a.change)}
              </Text>
            ))}
          </>
        )}

        <Text style={s.h2}>Marke und Nicht-Marke</Text>
        <Text style={s.hint}>
          Marken-Suchen enthalten Ihren Namen ({data.client.brandTerms.join(', ') || 'nicht hinterlegt'}). Neue Kunden finden Sie vor allem über Nicht-Marken-Suchen.
        </Text>
        <Table
          cols={[
            { label: 'Bereich', width: '40%', render: (r: { l: string; m: SeoMetrics; p: SeoMetrics | null }) => r.l },
            { label: 'Klicks', width: '20%', num: true, render: (r) => fmtInt(r.m.clicks) },
            { label: 'Vormonat', width: '20%', num: true, render: (r) => fmtSignedPct(pctChange(r.m.clicks, r.p?.clicks)) },
            { label: 'Impressionen', width: '20%', num: true, render: (r) => fmtInt(r.m.impressions) },
          ]}
          rows={[
            { l: 'Nicht-Marken-Suchen', m: k.nonBrand, p: k.nonBrandPrev },
            { l: 'Marken-Suchen', m: k.brand, p: k.brandPrev },
          ]}
        />

        <Text style={s.h2}>Wertvollste Suchbegriffe (ohne Marke)</Text>
        <Table
          cols={[
            { label: 'Suchbegriff', width: '40%', render: (r: KeywordRow) => r.query },
            { label: 'Klicks', width: '12%', num: true, render: (r) => fmtInt(r.clicks) },
            { label: 'Impr.', width: '14%', num: true, render: (r) => fmtInt(r.impressions) },
            { label: 'Klickrate', width: '12%', num: true, render: (r) => fmtPct(r.ctr) },
            { label: 'Position', width: '11%', num: true, render: (r) => fmtPos(r.position) },
            { label: 'Veränd.', width: '11%', num: true, render: posDelta, color: posDeltaColor },
          ]}
          rows={nonBrand}
        />
        <Footer data={data} />
      </Page>

      <Page size="A4" style={s.page}>
        <Text style={[s.h2, { marginTop: 0 }]}>Gewinner und Verlierer</Text>
        <Text style={s.hint}>Größte Veränderung der Position zum Vormonat. Plus heißt: weiter oben bei Google.</Text>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: 'Helvetica-Bold', marginBottom: 4, color: C.up }}>Aufgestiegen</Text>
            <Table
              cols={[
                { label: 'Suchbegriff', width: '58%', render: (r: KeywordRow) => r.query },
                { label: 'Platz', width: '22%', num: true, render: (r) => `${Math.round(r.prevPosition ?? 0)} > ${Math.round(r.position)}` },
                { label: '', width: '20%', num: true, render: posDelta, color: posDeltaColor },
              ]}
              rows={data.movers.positionWinners.slice(0, 8)}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: 'Helvetica-Bold', marginBottom: 4, color: C.down }}>Abgestiegen</Text>
            <Table
              cols={[
                { label: 'Suchbegriff', width: '58%', render: (r: KeywordRow) => r.query },
                { label: 'Platz', width: '22%', num: true, render: (r) => `${Math.round(r.prevPosition ?? 0)} > ${Math.round(r.position)}` },
                { label: '', width: '20%', num: true, render: posDelta, color: posDeltaColor },
              ]}
              rows={data.movers.positionLosers.slice(0, 8)}
            />
          </View>
        </View>

        <Text style={s.h2}>Ihre größten Chancen</Text>
        <Text style={s.hint}>
          Suchbegriffe auf Platz 4 bis 15 mit vielen Impressionen. Das Klickpotenzial zeigt, wie viele Besucher zusätzlich möglich wären, wenn Ihre Seite auf Platz 3 stünde.
        </Text>
        {data.opportunities.length ? (
          <Table
            cols={[
              { label: 'Suchbegriff', width: '46%', render: (r: PortalData['opportunities'][number]) => r.query },
              { label: 'Position', width: '14%', num: true, render: (r) => fmtPos(r.position) },
              { label: 'Impressionen', width: '20%', num: true, render: (r) => fmtInt(r.impressions) },
              { label: 'Potenzial', width: '20%', num: true, render: (r) => `+${fmtInt(r.potential)}` },
            ]}
            rows={data.opportunities.slice(0, 12)}
          />
        ) : (
          <Text style={s.hint}>Aktuell keine Suchbegriffe in diesem Bereich.</Text>
        )}

        {bucketHistory.length > 0 && (
          <>
            <Text style={s.h2}>Wo Ihre Suchbegriffe stehen</Text>
            <Table
              cols={[
                { label: 'Monat', width: '24%', render: (h: PortalData['history'][number]) => formatMonthDE(h.month) },
                ...BUCKET_ORDER.map((b) => ({
                  label: BUCKET_LABELS[b],
                  width: '19%',
                  num: true,
                  render: (h: PortalData['history'][number]) => fmtInt(h.buckets?.[b] ?? 0),
                })),
              ]}
              rows={bucketHistory}
            />
            <View style={s.legend}>
              {BUCKET_ORDER.map((b) => (
                <View key={b} style={s.legendItem}>
                  <View style={[s.swatch, { backgroundColor: BUCKET_COLORS[b] }]} />
                  <Text>{BUCKET_LABELS[b]}</Text>
                </View>
              ))}
            </View>
          </>
        )}
        <Footer data={data} />
      </Page>

      <Page size="A4" style={s.page}>
        {data.groupHistory.length > 0 && (
          <>
            <Text style={[s.h2, { marginTop: 0 }]}>Themen</Text>
            <Table
              cols={[
                { label: 'Thema', width: '40%', render: (g: PortalData['groupHistory'][number]) => g.name },
                { label: 'Klicks', width: '20%', num: true, render: (g) => fmtInt(g.months.find((m) => m.month === month)?.clicks ?? 0) },
                {
                  label: 'Vormonat',
                  width: '20%',
                  num: true,
                  render: (g) => {
                    const i = g.months.findIndex((m) => m.month === month);
                    return i > 0 ? fmtSignedPct(pctChange(g.months[i].clicks, g.months[i - 1].clicks)) : 'neu';
                  },
                },
                { label: 'Impressionen', width: '20%', num: true, render: (g) => fmtInt(g.months.find((m) => m.month === month)?.impressions ?? 0) },
              ]}
              rows={data.groupHistory}
            />
          </>
        )}

        <Text style={s.h2}>Beste Seiten</Text>
        <Table
          cols={[
            { label: 'Seite', width: '52%', render: (p: PortalData['pages'][number]) => shortUrl(p.page) },
            { label: 'Klicks', width: '16%', num: true, render: (p) => fmtInt(p.clicks) },
            { label: 'Vormonat', width: '16%', num: true, render: (p) => fmtSignedPct(pctChange(p.clicks, p.prevClicks)) },
            { label: 'Impressionen', width: '16%', num: true, render: (p) => fmtInt(p.impressions) },
          ]}
          rows={data.pages.slice(0, 10)}
        />

        {data.pagespeed && (
          <>
            <Text style={s.h2}>Ladezeit</Text>
            <Text style={s.hint}>
              Gemessen mit Google PageSpeed Insights ({formatMonthDE(data.pagespeed.month)}). Grün ist gut, Gelb mittel, Rot langsam. INP gibt es nur, wenn Google genug echte Besuche gemessen hat.
            </Text>
            <View style={s.table}>
              <View style={s.tr}>
                {['Seite', 'Gerät', 'Bewertung', 'LCP', 'INP', 'CLS'].map((h, i) => (
                  <Text key={h} style={[s.th, { width: ['34%', '12%', '16%', '13%', '13%', '12%'][i] }]}>
                    {h}
                  </Text>
                ))}
              </View>
              {data.pagespeed.results.map((r, i) => (
                <View key={i} style={s.tr} wrap={false}>
                  <Text style={[s.td, { width: '34%' }]}>{shortUrl(r.url)}</Text>
                  <Text style={[s.td, { width: '12%' }]}>{r.strategy === 'mobile' ? 'Handy' : 'Computer'}</Text>
                  <View style={{ width: '16%' }}>
                    <RatingText rating={rateScore(r.score)} text={r.score === null ? 'Fehler' : `${r.score} ${RATING_LABELS[rateScore(r.score)]}`} />
                  </View>
                  <View style={{ width: '13%' }}>
                    <RatingText rating={rateLcp(r.lcpMs)} text={fmtSeconds(r.lcpMs)} />
                  </View>
                  <View style={{ width: '13%' }}>
                    <RatingText rating={rateInp(r.inpMs)} text={r.inpMs === null ? 'keine Daten' : `${r.inpMs} ms`} />
                  </View>
                  <View style={{ width: '12%' }}>
                    <RatingText rating={rateCls(r.cls)} text={fmtCls(r.cls)} />
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        <Text style={[s.hint, { marginTop: 18 }]}>
          Alle Zahlen und Einzelheiten finden Sie jederzeit in Ihrem Kundenbereich. Fragen? yusuf@kolac-digital.de oder 0176 95762018.
        </Text>
        <Footer data={data} />
      </Page>
    </Document>
  );
}

function Footer({ data }: { data: PortalData }) {
  return (
    <View style={s.footer} fixed>
      <Text>Kolac Digital · SEO-Bericht {data.month ? formatMonthDE(data.month) : ''} · {data.client.displayName}</Text>
      <Text render={({ pageNumber, totalPages }) => `Seite ${pageNumber} von ${totalPages}`} />
    </View>
  );
}
