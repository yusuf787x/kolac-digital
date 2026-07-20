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
import type { Customer } from '@/lib/types';
import { COMPANY_INFO } from '@/lib/qr';
import {
  parseRichText,
  type MdInlineSegment,
  type MdBlock,
} from '@/lib/simple-markdown';

/**
 * PDF-Template fuer generierte Vertraege / Angebots-Uebergaben /
 * Auftragsbestaetigungen usw. Aufbau ist FIX:
 *
 *   [Logo]
 *   [Titel (Vertragsart)]
 *   [Parteien-Block: Kolac ↔ Kunde]
 *   [Freitext (WYSIWYG-Body)]
 *   [Signaturblock: Ort/Datum + 2 Unterschriftslinien]
 *   [Footer (fixed): Kolac-Adresse + Steuernummer]
 *
 * Nur der Freitext ist variabel — der Nutzer erzeugt ihn im WYSIWYG,
 * wir rendern ihn ueber den geteilten parseRichText-Parser (dieselbe
 * Logik wie das Angebots-PDF: <p>, <strong>, <ul><li>).
 */

const COLORS = {
  blue: '#2563EB',
  black: '#0a0a0a',
  gray: '#6b7280',
  border: '#e5e7eb',
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 40,
    // Platz fuer den festen Footer unten.
    paddingBottom: 90,
    paddingHorizontal: 50,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: COLORS.black,
    lineHeight: 1.5,
  },
  logoBox: { alignItems: 'center', marginBottom: 24 },
  logo: { width: 140, height: 50, objectFit: 'contain' },
  title: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 10,
    color: COLORS.gray,
    marginBottom: 18,
  },
  partiesBox: {
    borderTopWidth: 0.5,
    borderTopColor: COLORS.border,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.border,
    paddingVertical: 12,
    marginBottom: 20,
    flexDirection: 'row',
    gap: 20,
  },
  partyCol: { flex: 1 },
  partyLabel: {
    fontSize: 8,
    color: COLORS.gray,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  partyStrong: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 10,
    marginBottom: 1,
  },
  partyLine: { fontSize: 10, marginBottom: 1 },
  paragraph: { marginBottom: 8, fontSize: 10 },
  bulletRow: {
    flexDirection: 'row',
    marginBottom: 4,
    paddingLeft: 4,
  },
  bulletMarker: { width: 10, fontSize: 10 },
  bulletBody: { flex: 1, fontSize: 10 },
  signatureSection: {
    marginTop: 36,
  },
  dateLine: {
    marginBottom: 30,
    fontSize: 10,
  },
  signatureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 30,
  },
  signatureBox: {
    flex: 1,
    borderTopWidth: 0.5,
    borderTopColor: COLORS.black,
    paddingTop: 4,
  },
  signatureLabel: { fontSize: 8, color: COLORS.gray },
  signatureName: {
    fontSize: 9,
    color: COLORS.black,
    marginTop: 2,
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
    borderTopWidth: 0.5,
    borderTopColor: COLORS.border,
    paddingTop: 8,
  },
  footerLeft: { flex: 1 },
  footerCompany: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 10,
    marginBottom: 2,
    letterSpacing: 0.5,
  },
  footerLine: { fontSize: 8, color: COLORS.black },
  footerRight: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 10,
    letterSpacing: 0.5,
    textAlign: 'right',
  },
});

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

const RichBody = ({ text }: { text: string }) => {
  const blocks: MdBlock[] = parseRichText(text);
  return (
    <>
      {blocks.map((b, idx) =>
        b.type === 'bullet' ? (
          <View key={idx} style={styles.bulletRow as AnyStyle} wrap={false}>
            <Text style={styles.bulletMarker as AnyStyle}>•</Text>
            <Text style={styles.bulletBody as AnyStyle}>
              {renderSegments(b.segments)}
            </Text>
          </View>
        ) : (
          <Text key={idx} style={styles.paragraph as AnyStyle}>
            {renderSegments(b.segments)}
          </Text>
        ),
      )}
    </>
  );
};

interface Props {
  /** Titel oben, z.B. „ANGEBOT" oder „AUFTRAGSBESTAETIGUNG". */
  title: string;
  /** Optionaler Unter-Titel (z.B. „zur Angebots-Annahme A-2026-005"). */
  subtitle?: string;
  customer: Customer;
  /** WYSIWYG-HTML oder Markdown (parseRichText normalisiert beides). */
  bodyText: string;
  logoSrc: string;
}

export default function TemplateContractPdf({
  title,
  subtitle,
  customer,
  bodyText,
  logoSrc,
}: Props) {
  const customerName =
    [customer.firstName, customer.lastName].filter(Boolean).join(' ') ||
    customer.company;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.logoBox}>
          <Image style={styles.logo} src={logoSrc} />
        </View>

        <Text style={styles.title}>{title.toUpperCase()}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}

        {/* Parteien */}
        <View style={styles.partiesBox}>
          <View style={styles.partyCol}>
            <Text style={styles.partyLabel}>ZWISCHEN</Text>
            <Text style={styles.partyStrong}>{COMPANY_INFO.name}</Text>
            <Text style={styles.partyLine}>Yusuf Kolac</Text>
            <Text style={styles.partyLine}>{COMPANY_INFO.street}</Text>
            <Text style={styles.partyLine}>
              {COMPANY_INFO.zip} {COMPANY_INFO.city}
            </Text>
          </View>
          <View style={styles.partyCol}>
            <Text style={styles.partyLabel}>UND</Text>
            {customer.company && (
              <Text style={styles.partyStrong}>{customer.company}</Text>
            )}
            <Text style={styles.partyLine}>{customerName}</Text>
            {customer.street && (
              <Text style={styles.partyLine}>{customer.street}</Text>
            )}
            {(customer.zip || customer.city) && (
              <Text style={styles.partyLine}>
                {customer.zip} {customer.city}
              </Text>
            )}
          </View>
        </View>

        {/* Freitext */}
        <RichBody text={bodyText} />

        {/* Signaturblock — bleibt zusammen, rutscht auf naechste Seite,
            wenn er nicht mehr passt. */}
        <View style={styles.signatureSection as AnyStyle} wrap={false}>
          <Text style={styles.dateLine}>
            {COMPANY_INFO.city}, den _________________
          </Text>
          <View style={styles.signatureRow}>
            <View style={styles.signatureBox}>
              <Text style={styles.signatureLabel}>
                Datum, Unterschrift Auftragnehmer
              </Text>
              <Text style={styles.signatureName}>
                Yusuf Kolac · {COMPANY_INFO.name}
              </Text>
            </View>
            <View style={styles.signatureBox}>
              <Text style={styles.signatureLabel}>
                Datum, Unterschrift Auftraggeber
              </Text>
              <Text style={styles.signatureName}>
                {customerName}
                {customer.company ? ` · ${customer.company}` : ''}
              </Text>
            </View>
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
            <Text style={styles.footerRight}>DANKE FÜR IHR VERTRAUEN</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
