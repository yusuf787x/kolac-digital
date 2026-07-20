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

// ------------------------------------------------------------------
// Signaturseiten-Layout — feste Werte, damit die Coordinates fuer die
// ContractFields (Ort/Datum + Kundenunterschrift) im Signing-Overlay
// exakt auf den PDF-Feldern liegen.
// A4 = 595 x 842 pt. Seiten-paddingTop=40, paddingBottom=90,
// paddingHorizontal=50.
// ------------------------------------------------------------------
const A4_WIDTH_PT = 595;
const A4_HEIGHT_PT = 842;

const SIG_LAYOUT = {
  // Vertikale Position, an der der Signaturblock beginnt (nach Logo
  // + Titel-Zeilen + Intro-Text). Grob berechnet:
  //   paddingTop(40) + logo(50) + logo-margin(24) + title(14+6) +
  //   subtitle(10+28) + intro(10*4+32) ≈ 244pt.
  blockTopPt: 244,
  slotHeightPt: 46, // hoehe des unterschrift-slots (Bild-Container)
  ortDatumHeightPt: 14,
  ortDatumBottomGapPt: 6,
  // rechte Spalte startet ungefaehr bei Mitte + halber Gap
  rightColumnStartPct: 0.52,
  rightColumnWidthPct: 0.4,
};

/**
 * Position und Groesse der ContractFields auf der Signaturseite.
 * Werden vom Neu-/Edit-Flow als authoritative Wahrheit uebernommen —
 * so bleiben PDF-Layout und Signing-Overlay in Sync.
 */
export const SIG_FIELD_POSITIONS = (() => {
  const blockTop = SIG_LAYOUT.blockTopPt;
  // Ort+Datum sitzt ganz oben im Signaturblock (rechte Spalte).
  const ortDatumTop = blockTop;
  // Signatur-Slot beginnt darunter.
  const sigSlotTop =
    blockTop +
    SIG_LAYOUT.ortDatumHeightPt +
    SIG_LAYOUT.ortDatumBottomGapPt +
    // "OrtDatumLabel" (8pt) + kleiner Zusatzabstand
    12;

  return {
    date: {
      x: SIG_LAYOUT.rightColumnStartPct,
      y: ortDatumTop / A4_HEIGHT_PT,
      width: SIG_LAYOUT.rightColumnWidthPct,
      height: SIG_LAYOUT.ortDatumHeightPt / A4_HEIGHT_PT,
    },
    customerSignature: {
      x: SIG_LAYOUT.rightColumnStartPct,
      y: sigSlotTop / A4_HEIGHT_PT,
      width: SIG_LAYOUT.rightColumnWidthPct,
      height: SIG_LAYOUT.slotHeightPt / A4_HEIGHT_PT,
    },
  };
})();

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
  attachmentBadge: {
    fontSize: 8,
    color: COLORS.gray,
    letterSpacing: 1,
    marginBottom: 4,
  },
  attachmentTitle: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.border,
    paddingBottom: 6,
  },
  // ------- Signaturseite (eigene, letzte Hauptseite) -------
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
    // Feste Column-Hoehe, damit alle Positionen berechenbar sind.
    minHeight: 200,
  },
  sigOrtDatum: {
    fontSize: 10,
    height: 14,
    marginBottom: 6,
  },
  sigOrtDatumLabel: {
    fontSize: 8,
    color: COLORS.gray,
    marginBottom: 2,
  },
  // Signatur-Slot: fixe Hoehe, Signatur wird als Image (Kolac) oder
  // vom Signing-Server (Kunde) hier reingezeichnet.
  sigSlot: {
    height: SIG_LAYOUT.slotHeightPt,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.black,
    marginBottom: 4,
    justifyContent: 'flex-end',
  },
  sigImage: {
    height: SIG_LAYOUT.slotHeightPt - 2,
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

export interface ContractAttachment {
  /** Titel der Anlage, z.B. „Technische und organisatorische Maßnahmen (TOM)". */
  title: string;
  /** WYSIWYG-HTML oder Markdown. */
  body: string;
}

interface Props {
  /** Titel oben, z.B. „ANGEBOT" oder „AUFTRAGSBESTAETIGUNG". */
  title: string;
  /** Optionaler Unter-Titel (z.B. „zur Angebots-Annahme A-2026-005"). */
  subtitle?: string;
  customer: Customer;
  /** WYSIWYG-HTML oder Markdown (parseRichText normalisiert beides). */
  bodyText: string;
  /**
   * Anlagen, die NACH der Signaturseite kommen. Jede Anlage startet auf
   * einer neuen Seite mit „ANLAGE N: [Titel]"-Header.
   */
  attachments?: ContractAttachment[];
  logoSrc: string;
  /** URL des Kolac-Signaturbilds — wird auf der Signaturseite eingebettet. */
  kolacSignatureSrc?: string;
  /** Anzeige-Datum "TT.MM.JJJJ" (Erstellungsdatum, links unter Kolac). */
  generatedAt: string;
}

export default function TemplateContractPdf({
  title,
  subtitle,
  customer,
  bodyText,
  attachments = [],
  logoSrc,
  kolacSignatureSrc,
  generatedAt,
}: Props) {
  const customerName =
    [customer.firstName, customer.lastName].filter(Boolean).join(' ') ||
    customer.company;
  const validAttachments = attachments.filter(
    (a) => a.title.trim() || a.body.trim(),
  );

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

      {/* Signaturseite — eigene, letzte Hauptseite. Feste Positionen,
          damit die ContractFields (Ort/Datum + Kundensignatur) im
          Signing-Overlay exakt auf dem PDF-Feld liegen. */}
      <Page size="A4" style={styles.page}>
        <View style={styles.logoBox}>
          <Image style={styles.logo} src={logoSrc} />
        </View>

        <Text style={styles.sigPageTitle}>Unterschriften</Text>
        <Text style={styles.sigPageSubtitle}>
          {title} · {customer.company || customerName}
        </Text>
        <Text style={styles.sigPageIntro}>
          Mit der Unterschrift auf dieser Seite bestaetigen beide Parteien
          die auf den vorstehenden Seiten festgehaltenen Vereinbarungen.
        </Text>

        <View style={styles.sigColumnsRow}>
          {/* Linke Spalte — Kolac (schon signiert) */}
          <View style={styles.sigColumn}>
            <Text style={styles.sigOrtDatumLabel}>Ort, Datum</Text>
            <Text style={styles.sigOrtDatum}>
              {COMPANY_INFO.city}, {generatedAt}
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

          {/* Rechte Spalte — Kunde (leer, wird beim Signing gefuellt) */}
          <View style={styles.sigColumn}>
            <Text style={styles.sigOrtDatumLabel}>Ort, Datum</Text>
            {/* Leere Zeile fuer date-Feld (kommt beim Signing als
                "[Kundenstadt], [heute]"). */}
            <View style={styles.sigOrtDatum as AnyStyle} />
            {/* Leerer Signatur-Slot fuer customer_signature-Feld */}
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

      {/* Anlagen — je eigene Seite, ganze Kette nach der Signaturseite.
          Jede Anlage kann selbst mehrere Seiten belegen (Body-Overflow). */}
      {validAttachments.map((att, idx) => (
        <Page key={idx} size="A4" style={styles.page}>
          <View style={styles.logoBox}>
            <Image style={styles.logo} src={logoSrc} />
          </View>
          <Text style={styles.attachmentBadge}>
            ANLAGE {idx + 1} ZU „{title.toUpperCase()}"
          </Text>
          <Text style={styles.attachmentTitle}>
            {att.title || `Anlage ${idx + 1}`}
          </Text>
          <RichBody text={att.body} />

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
              <Text style={styles.footerRight}>
                ANLAGE {idx + 1} / {validAttachments.length}
              </Text>
            </View>
          </View>
        </Page>
      ))}
    </Document>
  );
}
