/* eslint-disable jsx-a11y/alt-text */
'use client';

import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
} from '@react-pdf/renderer';
import type { Quote, Customer } from '@/lib/types';
import { formatEUR, formatDateDE } from '@/lib/utils';
import { COMPANY_INFO } from '@/lib/qr';

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

        <Text style={styles.paragraph}>{greeting(customer)}</Text>
        <Text style={styles.paragraph}>
          vielen Dank für Ihre Anfrage. Wir freuen uns, Ihnen folgendes Angebot
          unterbreiten zu dürfen:
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

          {quote.items.map((item) => {
            const lines = item.description.split('\n');
            const head = lines[0] ?? '';
            const rest = lines.slice(1);
            return (
              <View key={item.position} style={styles.tableRow}>
                <View style={styles.cellPosition}>
                  <Text style={styles.itemTitle}>{head}</Text>
                  {rest.length > 0 && (
                    <Text style={styles.itemSubline}>{rest.join('\n')}</Text>
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

          {/* Net + USt rows (Kleinunternehmer — analog zur Rechnung) */}
          <View style={[styles.summaryRow, { marginTop: 6 }]}>
            <Text style={styles.summaryLabel}>Total netto</Text>
            <Text style={styles.summaryUnit}>EUR</Text>
            <Text style={styles.summaryValue}>
              {quote.totalAmount
                .toFixed(2)
                .replace('.', ',')
                .replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>USt (0%)</Text>
            <Text style={styles.summaryUnit}>EUR</Text>
            <Text style={styles.summaryValue}>0,00</Text>
          </View>
        </View>

        {/* Total box */}
        <View style={styles.totalBox}>
          <Text style={styles.totalLabel}>EUR</Text>
          <Text style={styles.totalValue}>
            {quote.totalAmount
              .toFixed(2)
              .replace('.', ',')
              .replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
          </Text>
        </View>

        <Text style={styles.paragraph}>
          Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.
        </Text>

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
