/* eslint-disable jsx-a11y/alt-text */
// Bewusst KEIN 'use client' — diese Komponente nutzt nur deklarative
// @react-pdf/renderer-Elemente (kein React-DOM, keine Hooks) und muss
// auch von Server-Routes importierbar sein (GoCardless-Webhook). Mit
// 'use client' wuerde Next.js einen Client-Component-Reference statt
// der echten Funktion liefern und der PDF-Renderer wirft React #130.

import type { ComponentProps } from 'react';
import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
} from '@react-pdf/renderer';
import type { Invoice, Customer } from '@/lib/types';
import {
  formatEUR,
  formatDateDE,
  tsToDate,
  computeInvoiceVat,
} from '@/lib/utils';
import { COMPANY_BANK, COMPANY_INFO } from '@/lib/qr';
import {
  parseRichText,
  type MdBlock,
  type MdInlineSegment,
} from '@/lib/simple-markdown';

const COLORS = {
  blue: '#2563EB',
  black: '#0a0a0a',
  gray: '#6b7280',
  lightGray: '#9ca3af',
  border: '#e5e7eb',
  bgLight: '#f9fafb',
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 40,
    // Footer OHNE QR ist ~60pt hoch (5 Textzeilen + bottom-Offset 30).
    // 100pt Puffer reservieren, damit Content klar darueber endet und
    // Referral-Kasten + QR-Zeile davor natuerlich fliessen koennen.
    paddingBottom: 100,
    paddingHorizontal: 50,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: COLORS.black,
    lineHeight: 1.5,
  },
  logoBox: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logo: {
    width: 140,
    height: 50,
    objectFit: 'contain',
  },
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
  recipient: {
    flex: 1,
  },
  recipientText: {
    fontSize: 10,
  },
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
  metaLabel: {
    fontSize: 9,
    color: COLORS.gray,
    marginRight: 8,
  },
  metaValue: {
    fontSize: 10,
  },
  metaValueHighlight: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.blue,
  },
  rechnungTitle: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    marginTop: 12,
    marginBottom: 18,
    letterSpacing: 1,
  },
  paragraph: {
    marginBottom: 10,
    fontSize: 10,
  },
  table: {
    marginTop: 14,
    marginBottom: 4,
  },
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
  itemSubline: {
    fontSize: 9,
    color: COLORS.gray,
  },
  itemBulletRow: {
    flexDirection: 'row',
    marginTop: 1,
    paddingLeft: 2,
  },
  itemBulletMarker: { width: 8, fontSize: 9, color: COLORS.gray },
  itemBulletBody: { flex: 1, fontSize: 9, color: COLORS.gray },
  summaryRow: {
    flexDirection: 'row',
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  summaryLabel: {
    width: '60%',
  },
  summaryUnit: {
    width: '25%',
    textAlign: 'right',
    color: COLORS.gray,
  },
  summaryValue: {
    width: '15%',
    textAlign: 'right',
  },
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
  small: {
    fontSize: 9,
    color: COLORS.gray,
    marginBottom: 8,
  },
  bold: {
    fontFamily: 'Helvetica-Bold',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 50,
    right: 50,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  footerLeft: {
    flex: 1,
  },
  footerCompany: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 11,
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  footerLine: {
    fontSize: 9,
    color: COLORS.black,
  },
  qrBox: {
    alignItems: 'center',
    marginHorizontal: 20,
  },
  qrImage: {
    width: 70,
    height: 70,
  },
  qrLabel: {
    fontSize: 7,
    color: COLORS.gray,
    marginTop: 3,
    textAlign: 'center',
  },
  footerRight: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 11,
    letterSpacing: 0.5,
    textAlign: 'right',
  },
  // Referral-Kasten (letzte Seite) — nudged in-line vor dem Footer,
  // damit er nur EINMAL erscheint (nicht mit `fixed` auf jeder Seite).
  referralBox: {
    marginTop: 16,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.blue,
    backgroundColor: '#EFF6FF', // blue-50
    borderRadius: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  referralTextCol: { flex: 1 },
  referralHeadline: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 11,
    color: COLORS.blue,
    marginBottom: 3,
  },
  referralBody: {
    fontSize: 9,
    color: COLORS.black,
    lineHeight: 1.35,
  },
  referralBadge: {
    // Feste Breite reserviert Platz fuer "15%" (fontSize 22) UND das
    // Wort "AUSZAHLUNG" darunter (10 Zeichen bei fontSize 8) —
    // verhindert das Overlap durch letterSpacing/negative marginTop.
    width: 78,
    alignItems: 'center',
    justifyContent: 'center',
  },
  referralPercent: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.blue,
    lineHeight: 1,
    textAlign: 'center',
  },
  referralPercentLabel: {
    fontSize: 8,
    color: COLORS.blue,
    letterSpacing: 0.8,
    textAlign: 'center',
    marginTop: 4,
  },
  // GiroCode-Sektion (letzte Seite). Section-Headline und Text sind
  // links buendig mit dem restlichen Rechnungs-Layout, QR sitzt rechts.
  qrSection: {
    marginTop: 16,
  },
  qrSectionHeadline: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 11,
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.border,
  },
  qrSectionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  qrSectionTextCol: {
    flex: 1,
  },
  qrHint: {
    fontSize: 9,
    color: COLORS.gray,
    lineHeight: 1.4,
    textAlign: 'left',
  },
});

interface Props {
  invoice: Invoice;
  customer: Customer;
  logoSrc: string;
  qrCodeDataUrl: string;
}

/** Formatiert einen Betrag im de-DE-Stil OHNE Waehrungssymbol (Tausender
 *  -Trennzeichen Punkt, Dezimal-Trenner Komma) — fuer die Summary-Tabelle,
 *  in der die Waehrung in einer separaten Spalte steht. */
const germanAmount = (n: number): string =>
  n
    .toFixed(2)
    .replace('.', ',')
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');

const salutationGreeting = (c: Customer): string => {
  const last = c.lastName?.trim() || c.company?.trim() || '';
  if (c.salutation === 'Frau') return `Sehr geehrte Frau ${last},`;
  if (c.salutation === 'Herr') return `Sehr geehrter Herr ${last},`;
  return `Sehr geehrte/r ${last},`;
};

// ---- Rich-Text-Rendering fuer Positions-Beschreibungen (analog Angebot):
// fett + Bullet-Listen via parseRichText, tolerant fuer Legacy-Klartext.
type AnyStyle = ComponentProps<typeof View>['style'] &
  ComponentProps<typeof Text>['style'];

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

interface PdfMarkdownProps {
  text?: string;
  blocks?: MdBlock[];
  paragraphStyle: AnyStyle;
  bulletRowStyle: AnyStyle;
  bulletMarkerStyle: AnyStyle;
  bulletBodyStyle: AnyStyle;
}
const PdfMarkdown = ({
  text,
  blocks: provided,
  paragraphStyle,
  bulletRowStyle,
  bulletMarkerStyle,
  bulletBodyStyle,
}: PdfMarkdownProps) => {
  const blocks = provided ?? parseRichText(text ?? '');
  return (
    <>
      {blocks.map((b, idx) =>
        b.type === 'bullet' ? (
          <View key={idx} style={bulletRowStyle} wrap={false}>
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

export default function InvoicePDF({
  invoice,
  customer,
  logoSrc,
  qrCodeDataUrl,
}: Props) {
  // Lastschrift-Rechnung: Geld wurde bereits eingezogen. Kein Ueberweisungs-
  // Hinweis, kein GiroCode noetig.
  const isDirectDebit = Boolean(invoice.gocardlessPaymentId);
  const chargedAt =
    tsToDate(invoice.gocardlessChargedAt) ?? tsToDate(invoice.paidAt);
  // MwSt: pro Position berechnen (mit fallback auf Rechnungs-vatRate).
  // Bei Rechnungen ohne Item-vatRate ist byRate exakt ein Eintrag.
  const vatCalc = computeInvoiceVat(invoice.items, invoice.vatRate);
  const isKleinunternehmer = vatCalc.byRate.every((r) => r.rate === 0);
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
              {[customer.firstName, customer.lastName]
                .filter(Boolean)
                .join(' ')}
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
              <Text style={styles.metaLabel}>RECHNUNGSNR.:</Text>
              <Text style={styles.metaValueHighlight}>
                {invoice.invoiceNumber ?? 'ENTWURF'}
              </Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>DATUM:</Text>
              <Text style={styles.metaValue}>
                {formatDateDE(invoice.invoiceDate.toDate())}
              </Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>ZAHLBAR BIS:</Text>
              <Text style={styles.metaValue}>
                {formatDateDE(invoice.dueDate.toDate())}
              </Text>
            </View>
          </View>
        </View>

        {/* Title */}
        <Text style={styles.rechnungTitle}>RECHNUNG</Text>

        {/* Greeting */}
        <Text style={styles.paragraph}>{salutationGreeting(customer)}</Text>
        <Text style={styles.paragraph}>
          wir bedanken uns für Ihren Auftrag und berechnen Ihnen folgende
          Positionen:
        </Text>

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

          {invoice.items.map((item) => {
            // Beschreibung durch den Rich-Text-Parser (HTML aus WYSIWYG
            // ODER Legacy-Klartext). Erster Paragraph = fetter Titel,
            // alles danach = Body (Fett + Bullets werden korrekt gerendert).
            const blocks = parseRichText(item.description);
            const titleBlock = blocks.find((b) => b.type === 'paragraph');
            const restBlocks = titleBlock
              ? blocks.filter((b) => b !== titleBlock)
              : blocks;
            return (
              <View key={item.position} style={styles.tableRow}>
                <View style={styles.cellPosition}>
                  <Text style={styles.itemTitle}>
                    {titleBlock ? renderSegments(titleBlock.segments) : ''}
                  </Text>
                  {restBlocks.length > 0 && (
                    <PdfMarkdown
                      blocks={restBlocks}
                      paragraphStyle={styles.itemSubline as AnyStyle}
                      bulletRowStyle={styles.itemBulletRow as AnyStyle}
                      bulletMarkerStyle={styles.itemBulletMarker as AnyStyle}
                      bulletBodyStyle={styles.itemBulletBody as AnyStyle}
                    />
                  )}
                </View>
                <Text style={styles.cellQty}>
                  {item.quantity.toLocaleString('de-DE')}
                </Text>
                <Text style={styles.cellPrice}>
                  {item.unitPrice
                    .toFixed(2)
                    .replace('.', ',')
                    .replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
                </Text>
                <Text style={styles.cellSum}>
                  {item.totalPrice
                    .toFixed(2)
                    .replace('.', ',')
                    .replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
                </Text>
              </View>
            );
          })}

          {/* Net + USt rows: pro Steuersatz eine Zeile. Bei nur einem
              Satz aussehen wie vorher (kompakt). */}
          <View style={[styles.summaryRow, { marginTop: 6 }]}>
            <Text style={styles.summaryLabel}>Total netto</Text>
            <Text style={styles.summaryUnit}>EUR</Text>
            <Text style={styles.summaryValue}>{germanAmount(vatCalc.net)}</Text>
          </View>
          {vatCalc.byRate.map((r) => (
            <View key={r.rate} style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>
                USt ({Math.round(r.rate * 100)}%)
                {vatCalc.byRate.length > 1
                  ? ` auf ${germanAmount(r.net)}`
                  : ''}
              </Text>
              <Text style={styles.summaryUnit}>EUR</Text>
              <Text style={styles.summaryValue}>{germanAmount(r.vat)}</Text>
            </View>
          ))}
        </View>

        {/* Total box */}
        <View style={styles.totalBox}>
          <Text style={styles.totalLabel}>EUR</Text>
          <Text style={styles.totalValue}>{germanAmount(vatCalc.gross)}</Text>
        </View>

        {/* Notes */}
        {isKleinunternehmer && (
          <Text style={styles.paragraph}>
            Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.
          </Text>
        )}
        {isDirectDebit ? (
          <Text style={styles.paragraph}>
            Der Rechnungsbetrag wurde am{' '}
            <Text style={styles.bold}>
              {chargedAt ? formatDateDE(chargedAt) : formatDateDE(invoice.invoiceDate.toDate())}
            </Text>{' '}
            per SEPA-Lastschrift von Ihrem hinterlegten Konto eingezogen.
            Keine weitere Aktion notwendig.
          </Text>
        ) : (
          <Text style={styles.paragraph}>
            Bitte den gesamten Betrag unter Angabe der Rechnungsnummer bis zum
            Zahlungsziel auf das Konto von {COMPANY_BANK.recipientName},{' '}
            <Text style={styles.bold}>{COMPANY_BANK.iban}</Text> überweisen. Die
            vollständigen Kontodaten finden Sie unten.
          </Text>
        )}
        <Text style={styles.paragraph}>
          Bei Rückfragen stehe ich unter der Rufnummer {COMPANY_INFO.phone} zur
          Verfügung.
        </Text>
        <Text style={styles.paragraph}>{invoice.closingText}</Text>

        {/* Referral-Kasten + GiroCode — beides nur EINMAL, natural
            flow, wrap={false} haelt Kasten und QR zusammen und rutscht
            gemeinsam auf naechste Seite, falls nicht mehr Platz. */}
        <View wrap={false}>
          <View style={styles.referralBox}>
            <View style={styles.referralTextCol}>
              <Text style={styles.referralHeadline}>
                Zufrieden mit der Zusammenarbeit?
              </Text>
              <Text style={styles.referralBody}>
                Empfehlen Sie uns weiter. Wenn aus Ihrer Empfehlung ein Auftrag
                entsteht, erhalten Sie{' '}
                <Text style={{ fontFamily: 'Helvetica-Bold' }}>
                  15 % der ersten Rechnung als Auszahlung
                </Text>
                .
              </Text>
            </View>
            <View style={styles.referralBadge}>
              <Text style={styles.referralPercent}>15%</Text>
              <Text style={styles.referralPercentLabel}>AUSZAHLUNG</Text>
            </View>
          </View>

          {!isDirectDebit && (
            <View style={styles.qrSection}>
              <Text style={styles.qrSectionHeadline}>
                Bequem bezahlen mit QR-Code
              </Text>
              <View style={styles.qrSectionRow}>
                <View style={styles.qrSectionTextCol}>
                  <Text style={styles.qrHint}>
                    Scannen Sie den Code mit Ihrer Banking-App. Empfänger, IBAN
                    und Gesamtbetrag werden automatisch eingesetzt. So sparen
                    Sie sich das Abtippen und stellen sicher, dass die Zahlung
                    korrekt zugeordnet wird.
                  </Text>
                </View>
                <View style={styles.qrBox}>
                  <Image style={styles.qrImage} src={qrCodeDataUrl} />
                  <Text style={styles.qrLabel}>Mit Banking-App scannen</Text>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Footer — jetzt OHNE QR, laeuft weiterhin auf jeder Seite. */}
        <View style={styles.footer} fixed>
          <View style={styles.footerLeft}>
            <Text style={styles.footerCompany}>
              {COMPANY_INFO.name.toUpperCase()}
            </Text>
            <Text style={styles.footerLine}>
              Kontoinhaber: {COMPANY_BANK.recipientName}
            </Text>
            <Text style={styles.footerLine}>IBAN: {COMPANY_BANK.iban}</Text>
            <Text style={styles.footerLine}>SWIFT: {COMPANY_BANK.bic}</Text>
            <Text style={styles.footerLine}>
              Steuernr.: {COMPANY_INFO.taxId}
            </Text>
          </View>

          <View>
            <Text style={styles.footerRight}>DANKE FÜR IHR VERTRAUEN</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
