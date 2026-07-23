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
import { SIG_FIELD_POSITIONS } from '@/components/contract/TemplateContractPdf';

/**
 * Stand-alone Signaturseite (eine A4-Seite) — bewusst separat, damit
 * sie hinter beliebige Dokumente gemergt werden kann. Wird z.B. hinter
 * ein Angebots-PDF gehaengt, wenn der User "Angebot" als Vertragstyp
 * waehlt und ein bestehendes Angebot 1:1 zur Unterschrift schickt.
 *
 * Layout ist IDENTISCH zur Signaturseite in TemplateContractPdf.tsx —
 * gleiche Schriften, gleiche Positionen. Muss so bleiben, damit die
 * exportierten SIG_FIELD_POSITIONS in beiden Faellen exakt sitzen.
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
    paddingBottom: 90,
    paddingHorizontal: 50,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: COLORS.black,
    lineHeight: 1.5,
  },
  logoBox: { alignItems: 'center', marginBottom: 24 },
  logo: { width: 140, height: 50, objectFit: 'contain' },
  sigPageTitle: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 6,
  },
  sigPageSubtitle: {
    fontSize: 10,
    color: COLORS.gray,
    marginBottom: 28,
  },
  sigPageIntro: {
    fontSize: 10,
    marginBottom: 32,
    color: COLORS.black,
  },
  sigColumnsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 30,
  },
  sigColumn: {
    flex: 1,
    minHeight: 200,
  },
  sigOrtDatumLabel: {
    fontSize: 8,
    color: COLORS.gray,
    marginBottom: 2,
  },
  sigOrtDatum: {
    fontSize: 10,
    lineHeight: 1.2,
    height: 18,
    marginBottom: 8,
  },
  sigSlot: {
    height: 46,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.black,
    marginBottom: 4,
    justifyContent: 'flex-end',
  },
  sigImage: {
    height: 44,
    width: 'auto',
    objectFit: 'contain',
  },
  sigLabel: {
    fontSize: 8,
    color: COLORS.gray,
    marginBottom: 2,
  },
  sigName: {
    fontSize: 10,
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

interface Props {
  /** Kontext-Titel, z.B. „Angebot A-2026-005". */
  title: string;
  /** Kurzer Untertitel (Kundenname o.ae.). */
  subtitle?: string;
  customer: Customer;
  /** URL des Kolac-Signaturbilds. */
  kolacSignatureSrc?: string;
  /** URL des Kolac-Logos. */
  logoSrc: string;
  /** Anzeige-Datum links unter der Kolac-Signatur. */
  generatedAt: string;
}

export default function SignaturePageOnlyPdf({
  title,
  subtitle,
  customer,
  kolacSignatureSrc,
  logoSrc,
  generatedAt,
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

        <Text style={styles.sigPageTitle}>Unterschriften</Text>
        <Text style={styles.sigPageSubtitle}>
          {title}
          {subtitle ? ` · ${subtitle}` : ''}
        </Text>
        <Text style={styles.sigPageIntro}>
          Mit der Unterschrift auf dieser Seite bestätigen beide Parteien
          die auf den vorstehenden Seiten festgehaltenen Vereinbarungen.
        </Text>

        <View style={styles.sigColumnsRow}>
          <View style={styles.sigColumn}>
            <Text style={styles.sigOrtDatumLabel}>Ort, Datum</Text>
            <Text style={styles.sigOrtDatum}>
              {COMPANY_INFO.city}, den {generatedAt}
            </Text>
            <View style={styles.sigSlot as AnyStyle}>
              {kolacSignatureSrc && (
                <Image
                  src={kolacSignatureSrc}
                  style={styles.sigImage as AnyStyle}
                />
              )}
            </View>
            <Text style={styles.sigLabel}>Auftragnehmer</Text>
            <Text style={styles.sigName}>Yusuf Kolac</Text>
            <Text style={styles.sigLabel}>{COMPANY_INFO.name}</Text>
          </View>

          <View style={styles.sigColumn}>
            <Text style={styles.sigOrtDatumLabel}>Ort, Datum</Text>
            <View style={styles.sigOrtDatum as AnyStyle} />
            <View style={styles.sigSlot as AnyStyle} />
            <Text style={styles.sigLabel}>Auftraggeber</Text>
            <Text style={styles.sigName}>{customerName}</Text>
            {customer.company && (
              <Text style={styles.sigLabel}>{customer.company}</Text>
            )}
          </View>
        </View>

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
            <Text style={styles.footerRight}>UNTERSCHRIFTEN</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}

// Re-export der Konstante, damit Aufrufer nur eine Datei importieren.
export { SIG_FIELD_POSITIONS };
