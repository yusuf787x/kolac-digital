/* eslint-disable jsx-a11y/alt-text */
'use client';

import type { ComponentProps } from 'react';
import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
} from '@react-pdf/renderer';
import type { Quote, Customer } from '@/lib/types';
import { formatEUR, formatDateDE, computeVat } from '@/lib/utils';
import { COMPANY_INFO } from '@/lib/qr';
import { parseRichText, type MdInlineSegment } from '@/lib/simple-markdown';

const COLORS = {
  blue: '#2563EB',
  black: '#0a0a0a',
  gray: '#6b7280',
  border: '#e5e7eb',
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 40,
    paddingHorizontal: 50,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: COLORS.black,
    lineHeight: 1.5,
  },
  logoBox: { alignItems: 'center', marginBottom: 30 },
  logo: { width: 140, height: 50, objectFit: 'contain' },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  senderLine: {
    fontSize: 8,
    color: COLORS.gray,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  recipient: { flex: 1 },
  recipientText: { fontSize: 10 },
  meta: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    minWidth: 200,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 2,
  },
  metaLabel: { fontSize: 9, color: COLORS.gray, marginRight: 8 },
  metaValue: { fontSize: 10 },
  metaValueHighlight: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.blue,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    marginTop: 12,
    marginBottom: 18,
    letterSpacing: 1,
  },
  paragraph: { marginBottom: 10, fontSize: 10 },
  bulletRow: {
    flexDirection: 'row',
    marginBottom: 4,
    paddingLeft: 4,
  },
  bulletMarker: { width: 10, fontSize: 10 },
  bulletBody: { flex: 1, fontSize: 10 },
  itemBulletRow: {
    flexDirection: 'row',
    marginTop: 1,
    paddingLeft: 2,
  },
  itemBulletMarker: { width: 8, fontSize: 9, color: COLORS.gray },
  itemBulletBody: { flex: 1, fontSize: 9, color: COLORS.gray },
  optionalBadge: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#B45309', // amber-700
    letterSpacing: 0.5,
  },
  cellSumOptional: { color: '#B45309' },
  optionalHint: {
    marginTop: 4,
    fontSize: 9,
    color: COLORS.gray,
    fontStyle: 'italic',
  },
  table: { marginTop: 14, marginBottom: 4 },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: COLORS.blue,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  tableHeaderCell: {
    color: '#ffffff',
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.border,
  },
  cellPosition: { width: '60%' },
  cellQty: { width: '10%', textAlign: 'right' },
  cellPrice: { width: '15%', textAlign: 'right' },
  cellSum: { width: '15%', textAlign: 'right' },
  itemTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 10,
    marginBottom: 2,
  },
  itemSubline: { fontSize: 9, color: COLORS.gray },
  summaryRow: {
    flexDirection: 'row',
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  summaryLabel: { width: '60%' },
  summaryUnit: {
    width: '25%',
    textAlign: 'right',
    color: COLORS.gray,
  },
  summaryValue: { width: '15%', textAlign: 'right' },
  totalBox: {
    backgroundColor: COLORS.blue,
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 12,
    marginBottom: 18,
  },
  totalLabel: {
    width: '85%',
    color: '#ffffff',
    fontFamily: 'Helvetica-Bold',
    fontSize: 11,
    textAlign: 'right',
    paddingRight: 6,
  },
  totalValue: {
    width: '15%',
    color: '#ffffff',
    fontFamily: 'Helvetica-Bold',
    fontSize: 11,
    textAlign: 'right',
  },
  acceptanceBox: {
    marginTop: 4,
    marginBottom: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: COLORS.blue,
    borderStyle: 'solid',
    borderRadius: 4,
  },
  acceptanceText: { fontSize: 10, color: COLORS.black },
  signatureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 30,
    marginBottom: 20,
  },
  signatureBox: {
    width: '45%',
    borderTopWidth: 0.5,
    borderTopColor: COLORS.black,
    paddingTop: 4,
  },
  signatureLabel: { fontSize: 8, color: COLORS.gray },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 50,
    right: 50,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  footerLeft: { flex: 1 },
  footerCompany: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 11,
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  footerLine: { fontSize: 9, color: COLORS.black },
  footerRight: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 11,
    letterSpacing: 0.5,
    textAlign: 'right',
  },
});

interface Props {
  quote: Quote;
  customer: Customer;
  logoSrc: string;
}

/**
 * Inline-Segmente einer Markdown-Zeile in @react-pdf-<Text>-Kinder
 * uebersetzen. Fett-Segmente bekommen Helvetica-Bold, damit sie im PDF
 * auch wirklich fett rendern (react-pdf mappt fontWeight nicht auf die
 * Standard-Helvetica-Familie).
 */
const renderSegments = (segments: MdInlineSegment[]) =>
  segments.map((seg, i) =>
    seg.bold ? (
      <Text key={i} style={{ fontFamily: 'Helvetica-Bold' }}>
        {seg.text}
      </Text>
    ) : (
      <Text key={i}>{seg.text}</Text>
    ),
  );

type AnyStyle = ComponentProps<typeof View>['style'] &
  ComponentProps<typeof Text>['style'];

interface MarkdownProps {
  text: string;
  /** Basisstyle fuer normale Absaetze (paragraph vs. itemSubline usw.). */
  paragraphStyle: AnyStyle;
  bulletRowStyle: AnyStyle;
  bulletMarkerStyle: AnyStyle;
  bulletBodyStyle: AnyStyle;
}

const PdfMarkdown = ({
  text,
  paragraphStyle,
  bulletRowStyle,
  bulletMarkerStyle,
  bulletBodyStyle,
}: MarkdownProps) => {
  const blocks = parseRichText(text);
  return (
    <>
      {blocks.map((b, idx) =>
        b.type === 'bullet' ? (
          <View key={idx} style={bulletRowStyle}>
            <Text style={bulletMarkerStyle}>•</Text>
            <Text style={bulletBodyStyle}>{renderSegments(b.segments)}</Text>
          </View>
        ) : (
          <Text key={idx} style={paragraphStyle}>
            {renderSegments(b.segments)}
          </Text>
        ),
      )}
    </>
  );
};

const greeting = (c: Customer): string => {
  const last = c.lastName?.trim() || c.company?.trim() || '';
  if (c.salutation === 'Frau') return `Sehr geehrte Frau ${last},`;
  if (c.salutation === 'Herr') return `Sehr geehrter Herr ${last},`;
  return `Sehr geehrte/r ${last},`;
};

export default function QuotePDF({ quote, customer, logoSrc }: Props) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Logo */}
        <View style={styles.logoBox}>
          <Image style={styles.logo} src={logoSrc} />
        </View>

        {/* Sender line */}
        <Text style={styles.senderLine}>
          {COMPANY_INFO.name.toUpperCase()} •{' '}
          {COMPANY_INFO.street.toUpperCase()} • {COMPANY_INFO.zip}{' '}
          {COMPANY_INFO.city.toUpperCase()}
        </Text>

        {/* Recipient + Meta */}
        <View style={styles.topRow}>
          <View style={styles.recipient}>
            <Text style={styles.recipientText}>
              {[customer.firstName, customer.lastName].filter(Boolean).join(' ')}
            </Text>
            {customer.company && (
              <Text style={styles.recipientText}>{customer.company}</Text>
            )}
            {customer.street && (
              <Text style={styles.recipientText}>{customer.street}</Text>
            )}
            {(customer.zip || customer.city) && (
              <Text style={styles.recipientText}>
                {customer.zip} {customer.city}
              </Text>
            )}
          </View>

          <View style={styles.meta}>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>ANGEBOTSNR.:</Text>
              <Text style={styles.metaValueHighlight}>
                {quote.quoteNumber}
              </Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>DATUM:</Text>
              <Text style={styles.metaValue}>
                {formatDateDE(quote.quoteDate.toDate())}
              </Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>GÜLTIG BIS:</Text>
              <Text style={styles.metaValue}>
                {formatDateDE(quote.validUntil.toDate())}
              </Text>
            </View>
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title}>ANGEBOT</Text>

        {quote.introText && quote.introText.trim() ? (
          // Nutzer schreibt eigene Anrede + Text — kein zweiter,
          // hardcodeder "Sehr geehrte..." Block davor.
          <PdfMarkdown
            text={quote.introText}
            paragraphStyle={styles.paragraph}
            bulletRowStyle={styles.bulletRow}
            bulletMarkerStyle={styles.bulletMarker}
            bulletBodyStyle={styles.bulletBody}
          />
        ) : (
          <>
            <Text style={styles.paragraph}>{greeting(customer)}</Text>
            <Text style={styles.paragraph}>
              vielen Dank für Ihre Anfrage. Wir freuen uns, Ihnen folgendes
              Angebot unterbreiten zu dürfen:
            </Text>
          </>
        )}

        {/* Items table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, styles.cellPosition]}>
              POSITION
            </Text>
            <Text style={[styles.tableHeaderCell, styles.cellQty]}>ANZAHL</Text>
            <Text style={[styles.tableHeaderCell, styles.cellPrice]}>PREIS</Text>
            <Text style={[styles.tableHeaderCell, styles.cellSum]}>SUMME</Text>
          </View>

          {quote.items.map((item) => {
            const lines = item.description.split('\n');
            const head = lines[0] ?? '';
            const rest = lines.slice(1).join('\n');
            const isOptional = !!item.optional;
            const fmtN = (n: number) =>
              n
                .toFixed(2)
                .replace('.', ',')
                .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
            return (
              <View key={item.position} style={styles.tableRow}>
                <View style={styles.cellPosition}>
                  <Text style={styles.itemTitle}>
                    {isOptional && (
                      <Text style={styles.optionalBadge}>OPTIONAL · </Text>
                    )}
                    {head}
                  </Text>
                  {rest.trim() && (
                    <PdfMarkdown
                      text={rest}
                      paragraphStyle={styles.itemSubline}
                      bulletRowStyle={styles.itemBulletRow}
                      bulletMarkerStyle={styles.itemBulletMarker}
                      bulletBodyStyle={styles.itemBulletBody}
                    />
                  )}
                </View>
                <Text style={styles.cellQty}>
                  {item.quantity.toLocaleString('de-DE')}
                </Text>
                <Text style={styles.cellPrice}>{fmtN(item.unitPrice)}</Text>
                <Text
                  style={[
                    styles.cellSum,
                    isOptional ? styles.cellSumOptional : {},
                  ]}
                >
                  {isOptional ? `(${fmtN(item.totalPrice)})` : fmtN(item.totalPrice)}
                </Text>
              </View>
            );
          })}

          {/* Net + USt rows — analog zur Rechnung. Bei vatRate=0 wird
              der §19-Kleinunternehmer-Hinweis unter der Total-Box
              eingeblendet, sonst regulaerer USt-Ausweis.

              Total wird sicherheitshalber neu aus den Items berechnet
              (Optional-Positionen ausgeschlossen), damit Legacy-Quotes,
              deren `totalAmount` noch Optionals mitzaehlt, korrekt
              gerendert werden. */}
          {(() => {
            const bindingNet = quote.items
              .filter((it) => !it.optional)
              .reduce((acc, it) => acc + it.totalPrice, 0);
            const v = computeVat(bindingNet, quote.vatRate);
            const pct = Math.round(v.rate * 100);
            const fmt = (n: number) =>
              n
                .toFixed(2)
                .replace('.', ',')
                .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
            return (
              <>
                <View style={[styles.summaryRow, { marginTop: 6 }]}>
                  <Text style={styles.summaryLabel}>Total netto</Text>
                  <Text style={styles.summaryUnit}>EUR</Text>
                  <Text style={styles.summaryValue}>{fmt(v.net)}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>USt ({pct}%)</Text>
                  <Text style={styles.summaryUnit}>EUR</Text>
                  <Text style={styles.summaryValue}>{fmt(v.vat)}</Text>
                </View>
              </>
            );
          })()}
        </View>

        {/* Total box (Brutto) — Netto neu aus non-optional items,
            damit Legacy-Quotes korrekt zaehlen. */}
        {(() => {
          const bindingNet = quote.items
            .filter((it) => !it.optional)
            .reduce((acc, it) => acc + it.totalPrice, 0);
          const optionalNet = quote.items
            .filter((it) => it.optional)
            .reduce((acc, it) => acc + it.totalPrice, 0);
          const v = computeVat(bindingNet, quote.vatRate);
          const optV = computeVat(optionalNet, quote.vatRate);
          const isKleinunternehmer = v.rate === 0;
          const fmt = (n: number) =>
            n
              .toFixed(2)
              .replace('.', ',')
              .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
          return (
            <>
              <View style={styles.totalBox}>
                <Text style={styles.totalLabel}>EUR</Text>
                <Text style={styles.totalValue}>{fmt(v.gross)}</Text>
              </View>
              {optionalNet > 0 && (
                <Text style={styles.optionalHint}>
                  Optional zubuchbar: {fmt(optV.gross)} EUR brutto (nicht im
                  Angebotspreis enthalten).
                </Text>
              )}
              {isKleinunternehmer && (
                <Text style={styles.paragraph}>
                  Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.
                </Text>
              )}
            </>
          );
        })()}

        {/* Acceptance text in highlighted box (enthält bereits Kontaktwege) */}
        {quote.acceptanceText && (
          <View style={styles.acceptanceBox}>
            <Text style={styles.acceptanceText}>{quote.acceptanceText}</Text>
          </View>
        )}

        <Text style={styles.paragraph}>{quote.closingText}</Text>

        {/* Optional signature row (left: Auftraggeber, right: Auftragnehmer) */}
        <View style={styles.signatureRow}>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureLabel}>Datum, Unterschrift Auftraggeber</Text>
          </View>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureLabel}>Datum, Unterschrift Kolac Digital</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <View style={styles.footerLeft}>
            <Text style={styles.footerCompany}>
              {COMPANY_INFO.name.toUpperCase()}
            </Text>
            <Text style={styles.footerLine}>
              {COMPANY_INFO.street}, {COMPANY_INFO.zip} {COMPANY_INFO.city}
            </Text>
            <Text style={styles.footerLine}>
              Steuernr.: {COMPANY_INFO.taxId}
            </Text>
          </View>

          <View>
            <Text style={styles.footerRight}>DANKE FÜR IHRE ANFRAGE</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
