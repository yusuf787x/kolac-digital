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
import type { Invoice, Customer } from '@/lib/types';
import { formatEUR, formatDateDE, tsToDate } from '@/lib/utils';
import { COMPANY_BANK, COMPANY_INFO } from '@/lib/qr';

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
    paddingBottom: 40,
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
});

interface Props {
  invoice: Invoice;
  customer: Customer;
  logoSrc: string;
  qrCodeDataUrl: string;
}

const salutationGreeting = (c: Customer): string => {
  const last = c.lastName?.trim() || c.company?.trim() || '';
  if (c.salutation === 'Frau') return `Sehr geehrte Frau ${last},`;
  if (c.salutation === 'Herr') return `Sehr geehrter Herr ${last},`;
  return `Sehr geehrte/r ${last},`;
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
                {invoice.invoiceNumber}
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

          {/* Net + USt rows */}
          <View style={[styles.summaryRow, { marginTop: 6 }]}>
            <Text style={styles.summaryLabel}>Total netto</Text>
            <Text style={styles.summaryUnit}>EUR</Text>
            <Text style={styles.summaryValue}>
              {invoice.totalAmount
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
            {invoice.totalAmount
              .toFixed(2)
              .replace('.', ',')
              .replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
          </Text>
        </View>

        {/* Notes */}
        <Text style={styles.paragraph}>
          Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.
        </Text>
        {isDirectDebit ? (
          <Text style={styles.paragraph}>
            Der Rechnungsbetrag wurde am{' '}
            <Text style={styles.bold}>
              {chargedAt ? formatDateDE(chargedAt) : formatDateDE(invoice.invoiceDate.toDate())}
            </Text>{' '}
            per SEPA-Lastschrift von deinem hinterlegten Konto eingezogen.
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

        {/* Footer */}
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

          {!isDirectDebit && (
            <View style={styles.qrBox}>
              <Image style={styles.qrImage} src={qrCodeDataUrl} />
              <Text style={styles.qrLabel}>Mit Banking-App scannen</Text>
            </View>
          )}

          <View>
            <Text style={styles.footerRight}>DANKE FÜR IHR VERTRAUEN</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
