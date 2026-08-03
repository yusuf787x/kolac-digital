import type { Timestamp } from 'firebase/firestore';

export type Salutation = 'Herr' | 'Frau' | 'Divers';

export interface Customer {
  id: string;
  company: string;
  salutation: Salutation;
  firstName: string;
  lastName: string;
  street: string;
  zip: string;
  city: string;
  email: string;
  phone: string;
  taxId?: string;
  notes?: string;
  /** Optionaler Hardlink zu einem GoCardless-Kunden. Hat Vorrang vor Domain-Match. */
  gocardlessCustomerId?: string;
  /** Rechnungsempfänger-Mail für Lastschrift-Rechnungen, falls abweichend von `email`. */
  retainerInvoiceEmail?: string;
  /** Template-Text für die Auto-Rechnung. Unterstützt {monat}, {jahr}, {monat_jahr}, {kunde_firma}, {betrag}. */
  retainerInvoiceTemplate?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type InvoiceStatus =
  | 'draft'
  | 'sent'
  | 'paid'
  | 'partially_paid'
  | 'overdue';

export interface InvoiceItem {
  position: number;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  /**
   * Nur relevant fuer Angebote: markiert eine Position als optional.
   * Die Summe zaehlt sie NICHT mit; im PDF wird sie visuell markiert.
   * Bei Rechnungen immer undefined/false (Rechnungen haben nur
   * verbindliche Positionen).
   */
  optional?: boolean;
  /**
   * Position-spezifischer USt-Satz als Dezimalzahl (0.19 = 19%).
   * Fehlt der Wert → fallback zum Rechnungs-`vatRate`. So kann eine
   * Rechnung mit Standardsatz 19% eine einzelne 0%-Position enthalten
   * (z.B. durchlaufender Posten fuer Werbebudget). Legacy-Positionen
   * ohne Feld verhalten sich exakt wie bisher.
   */
  vatRate?: number;
}

export interface Invoice {
  id: string;
  customerId: string;
  /**
   * Rechnungsnummer wird ERST beim Finalisieren („Rechnung stellen")
   * atomar aus der laufenden Nummer vergeben — Entwuerfe haben `null`.
   * Solange `null` ist, ist der Datensatz noch nicht buchhaltungs-
   * relevant, kann bearbeitet werden und wird nicht per Mail/Drive
   * verschickt.
   */
  invoiceNumber: string | null;
  invoiceDate: Timestamp;
  dueDate: Timestamp;
  status: InvoiceStatus;
  paidAmount: number;
  totalAmount: number;
  /**
   * Mehrwertsteuersatz als Dezimalzahl (0.19 = 19%). Optional, weil
   * Legacy-Rechnungen vor MwSt-Einführung das Feld nicht haben. Fehlt
   * der Wert -> 0 (Kleinunternehmer-Regel § 19 UStG).
   * `totalAmount` ist immer der NETTO-Betrag; Brutto = totalAmount * (1 + vatRate).
   */
  vatRate?: number;
  closingText: string;
  pdfUrl: string | null;
  driveUrl: string | null;
  sentAt: Timestamp | null;
  paidAt: Timestamp | null;
  items: InvoiceItem[];
  /** Optional: ID des GoCardless-Payments, der diese Rechnung ausgelöst hat. */
  gocardlessPaymentId?: string;
  /** Optional: GoCardless-Charge-Datum (Lastschrift gezogen am). */
  gocardlessChargedAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type ExpenseCategory =
  | 'Software/Tools'
  | 'Werbung/Ads'
  | 'Hardware'
  | 'Reisen'
  | 'Büro'
  | 'Weiterbildung'
  | 'Telefon/Internet'
  | 'Versicherungen'
  | 'Sonstiges';

export interface Expense {
  id: string;
  date: Timestamp;
  description: string;
  /** Brutto-Betrag — das was tatsaechlich bezahlt wurde (Belegsumme). */
  amount: number;
  /** Mehrwertsteuer-Satz auf dem Beleg (z.B. 0.19). Optional fuer Legacy. */
  vatRate?: number;
  /**
   * Reverse-Charge-Verfahren (§ 13b UStG): EU/Auslands-Rechnung ohne
   * ausgewiesene MwSt. Wenn true, ist `amount` der Netto-Betrag (nichts
   * wurde vom Lieferant an USt einbehalten). Wir deklarieren dann die
   * "fiktive" USt aus vatRate als geschuldete Steuer UND ziehen sie
   * gleichzeitig als Vorsteuer ab — Netto-Effekt: null.
   *
   * Praxis: Meta Ireland, Google Ireland, Canva, Anthropic etc.
   */
  reverseCharge?: boolean;
  category: ExpenseCategory;
  supplier: string;
  receiptUrl: string | null;
  driveUrl: string | null;
  createdAt: Timestamp;
}

export interface Settings {
  nextInvoiceNumber: number;
  invoiceFormat: 'legacy' | 'new';
  defaultPaymentDays: number;
  defaultClosingText: string;
  /** Default-MwSt-Satz für neue Rechnungen (0.19 = 19%). */
  defaultVatRate?: number;
  // Quotes
  nextQuoteNumber: number;
  defaultQuoteValidDays: number;
  defaultQuoteAcceptanceText: string;
  /** Zaehler fuer Auftragsbestaetigungen (Nummernkreis AB-YYYY-NNN). */
  nextOrderConfirmationNumber?: number;
}

export type QuoteStatus =
  | 'draft'
  | 'sent'
  | 'accepted'
  | 'rejected'
  | 'invoiced'
  | 'expired';

/**
 * Ein Quote-Doc kann entweder ein Angebot ODER eine Auftragsbestaetigung
 * sein — der Aufbau ist strukturell identisch (Kunde, Positionen, MwSt,
 * Texte), nur Nummernkreis, Titel im PDF und Default-Formulierungen
 * unterscheiden sich. Fehlt das Feld: Legacy-Angebot.
 */
export type QuoteDocumentType = 'quote' | 'order_confirmation';

export interface Quote {
  id: string;
  customerId: string;
  quoteNumber: string;
  /** Default 'quote' wenn nicht gesetzt (Legacy-Compat). */
  documentType?: QuoteDocumentType;
  quoteDate: Timestamp;
  validUntil: Timestamp;
  status: QuoteStatus;
  totalAmount: number;
  /**
   * MwSt-Satz als Dezimalzahl (0.19 = 19%). Optional fuer Legacy-Angebote.
   * `totalAmount` ist NETTO, Brutto = totalAmount * (1 + vatRate).
   * Analog zur Invoice-Logik.
   */
  vatRate?: number;
  /** Freier Text-Block oben im Angebot, zwischen Anrede und Positionen.
   *  Optional, damit Legacy-Angebote nichts kaputt macht. */
  introText?: string;
  closingText: string;
  acceptanceText: string;
  pdfUrl: string | null;
  driveUrl: string | null;
  confirmationFileUrl: string | null;
  confirmationFilename: string | null;
  confirmationDriveUrl: string | null;
  sentAt: Timestamp | null;
  acceptedAt: Timestamp | null;
  rejectedAt: Timestamp | null;
  invoicedAt: Timestamp | null;
  invoiceId: string | null;
  items: InvoiceItem[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface GoogleAuth {
  refreshToken: string;
  accessToken: string | null;
  tokenExpiresAt: Timestamp | null;
  scopes: string[];
  connectedAt: Timestamp;
  connectedEmail: string;
}

// ===================================================================
// CRM / VERTRIEB (Deals, Aktivitäten, E-Mail-Vorlagen)
// ===================================================================

export type DealStage =
  | 'kontaktiert'
  | 'erstgespraech'
  | 'angebot_verschickt'
  | 'vertrag_erhalten'
  | 'abgeschlossen'
  | 'verloren';

export type DealSource =
  | 'empfehlung'
  | 'google'
  | 'social_media'
  | 'kaltakquise'
  | 'sonstiges';

export interface Deal {
  id: string;
  customerId: string;
  title: string;
  value: number | null;
  stage: DealStage;
  source: DealSource;
  expectedCloseDate: Timestamp | null;
  lostReason: string | null;
  notes: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type ActivityType =
  | 'anruf'
  | 'email'
  | 'notiz'
  | 'meeting'
  | 'angebot'
  | 'vertrag'
  | 'sonstiges';

export interface Activity {
  id: string;
  /** Ein Aktivitaet gehoert zu einem Deal ODER zu einem Lead. */
  dealId?: string;
  leadId?: string;
  type: ActivityType;
  description: string;
  emailSubject: string | null;
  emailBody: string | null;
  dueDate: Timestamp | null;
  completed: boolean;
  completedAt: Timestamp | null;
  createdAt: Timestamp;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ===================================================================
// COLD-CALL: Skript + Config + Log
// ===================================================================

export interface CallScriptBlock {
  id: string;
  title: string;
  /** WYSIWYG/Markdown-Body. Regie-Hinweise via **fett** oder Bullets. */
  body: string;
  order: number;
}

export interface CallScriptObjection {
  id: string;
  /** Trigger, was der Kunde sagt. */
  trigger: string;
  /** Antwort-Vorschlag. */
  response: string;
}

export interface CallScript {
  id: string;
  version: number;
  status: 'active' | 'archived';
  /** Optionaler Titel/Notiz zu dieser Version ("V2 — kuerzerer Einstieg"). */
  note?: string;
  blocks: CallScriptBlock[];
  objections: CallScriptObjection[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy?: string;
}

/**
 * Konfigurierbare Enums fuer das Call-Log. Wird als EIN Firestore-Doc
 * unter `callConfig/default` gehalten, damit sich der Nutzer die
 * Stufen/Ergebnisse/Einwaende ohne Code-Aenderung anpassen kann.
 */
export interface CallStageOption {
  id: string;
  label: string;
  order: number;
}

export interface CallOutcomeOption {
  id: string;
  label: string;
  /** true → zaehlt als erfolgreicher Termin (fuer Terminquote). */
  isSuccess: boolean;
  order: number;
}

export interface CallObjectionOption {
  id: string;
  label: string;
  order: number;
}

export interface CallLogConfig {
  id: string; // 'default'
  stages: CallStageOption[];
  outcomes: CallOutcomeOption[];
  objections: CallObjectionOption[];
  updatedAt: Timestamp;
}

export interface CallLog {
  id: string;
  /** Snapshot: welche Version wurde bei diesem Call verwendet? */
  scriptVersionId: string;
  scriptVersionNumber: number;
  /** Wo endete der Call. */
  stageId: string;
  stageLabel: string; // Snapshot fuer Auswertung
  /** Ergebnis. */
  outcomeId: string;
  outcomeLabel: string; // Snapshot
  outcomeIsSuccess: boolean; // Snapshot fuer Terminquote-Berechnung
  /** Einwand-Kategorie (nur wenn stage=Einwand oder generell relevant). */
  objectionTypeId?: string;
  objectionLabel?: string;
  /** Optionale Verknuepfung zu Lead. */
  leadId?: string;
  leadCompany?: string; // Snapshot
  callerId?: string;
  callerName?: string;
  note?: string;
  durationSeconds?: number;
  calledAt: Timestamp;
  createdAt: Timestamp;
}

// ===================================================================
// LEADS (Sales-Pipeline vor Customer-Anlage)
// ===================================================================

/**
 * Lead-Status im typischen Kaltakquise-Trichter. „kalt" ist der
 * Default nach Import, „gewonnen" fuehrt zum Convert-Flow (Lead wird
 * zu Customer + Deal).
 */
export type LeadStatus =
  | 'kalt'
  | 'kontaktiert'
  | 'interessiert'
  | 'termin_vereinbart'
  | 'kein_interesse'
  | 'nicht_erreicht'
  | 'gewonnen'
  | 'verloren';

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  kalt: 'Kalt',
  kontaktiert: 'Kontaktiert',
  interessiert: 'Interessiert',
  termin_vereinbart: 'Termin vereinbart',
  kein_interesse: 'Kein Interesse',
  nicht_erreicht: 'Nicht erreicht',
  gewonnen: 'Gewonnen',
  verloren: 'Verloren',
};

/** Vor-konfektionierte Branchen — frei erweiterbar via `category` als String. */
export const LEAD_CATEGORIES = [
  'Friseur',
  'Barbier',
  'Kosmetik',
  'Nagelstudio',
  'Physio',
  'Zahnarzt',
  'Arztpraxis',
  'Heilpraktiker',
  'Handwerker',
  'Restaurant',
  'Cafe',
  'Einzelhandel',
  'Werkstatt',
  'Dienstleister',
  'Sonstiges',
] as const;

export interface Lead {
  id: string;
  /** Betriebsname. */
  company: string;
  /** Optionaler Ansprechpartner (Inhaber, GF, ...). */
  contactName?: string;
  phone?: string;
  email?: string;
  /** Bestehende Website des Betriebs, falls vorhanden. Fehlt → hot Lead. */
  website?: string;
  /**
   * Nutzung des Website-Alters als Qualifier: „veraltet" (3+ Jahre nicht
   * ueberarbeitet), „keine Website", „modern" (kein Bedarf). Frei setzbar.
   */
  websiteAge?: 'keine' | 'veraltet' | 'modern' | 'unbekannt';
  /** Branche/Kategorie, frei als String (aus LEAD_CATEGORIES oder eigen). */
  category?: string;
  street?: string;
  zip?: string;
  city?: string;
  /** Google-Rating 1-5. */
  rating?: number;
  reviewCount?: number;
  /** URL zum Google-Maps-Business-Eintrag (Quelle-Referenz). */
  googleMapsUrl?: string;
  /** Weitere Quellen-URL (z.B. Kammer-Verzeichnis, Recherche-Notiz). */
  sourceUrl?: string;
  source?:
    | 'google_maps'
    | 'csv_import'
    | 'manuell'
    | 'empfehlung'
    | 'social_media'
    | 'sonstiges';
  status: LeadStatus;
  /**
   * Naechster Rueckruf/Kontakt-Termin. Wenn <= heute → im Dashboard
   * als „faellig" markiert.
   */
  nextCallAt: Timestamp | null;
  lastContactAt: Timestamp | null;
  lostReason?: string;
  /** Freitext-Notizen. */
  notes: string;
  /** Wenn Lead „gewonnen" wurde und in einen Customer konvertiert. */
  convertedCustomerId?: string;
  /**
   * Ergebnis des Website-Auto-Checks (per /api/leads/check-website).
   * Speichert die Signals, die die Heuristik gefunden hat.
   */
  websiteCheck?: {
    lastCopyrightYear?: number;
    generator?: string;
    hasViewportMeta?: boolean;
    hasHttps?: boolean;
    checkedAt: Timestamp;
    reachable: boolean;
    /** Rohe Signals als Klartext fuer Debug. */
    notes?: string;
  };
  /**
   * Zeitstempel des letzten Anruf-Versuchs im Salespilot. Wird genutzt,
   * um "heute schon versucht" zu unterscheiden von "vor Tagen".
   */
  lastCallAttemptAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ===================================================================
// VERTRÄGE (Contracts)
// ===================================================================

export type ContractStatus =
  | 'draft'
  | 'sent'
  | 'signed'
  | 'expired'
  | 'cancelled';

export type ContractFieldType =
  | 'customer_signature'
  | 'date'
  | 'kolac_signature';

/**
 * Position eines Markierungsfeldes auf dem PDF. Koordinaten sind in
 * Prozent (0-1) relativ zur Seitengröße, damit verschiedene
 * Display-Auflösungen das gleiche Layout liefern. Origin oben-links.
 */
export interface ContractField {
  type: ContractFieldType;
  page: number; // 1-basiert
  x: number; // 0-1, links
  y: number; // 0-1, oben
  width: number; // 0-1
  height: number; // 0-1
}

export interface ContractAuditEntry {
  at: Timestamp;
  event:
    | 'created'
    | 'sent'
    | 'viewed'
    | 'signed'
    | 'reminder_sent'
    | 'manual_signed'
    | 'cancelled';
  ip?: string;
  userAgent?: string;
  note?: string;
}

/**
 * Wenn ein Vertrag aus der Programm-Vorlage erzeugt wurde, halten wir
 * den strukturierten Editor-Zustand vor, damit man ihn spaeter erneut
 * oeffnen, bearbeiten und das PDF neu generieren kann. Bei
 * hochgeladenen PDFs bleibt das Feld undefined — die sind nicht
 * bearbeitbar.
 */
export interface ContractTemplateData {
  bodyText: string;
  subtitle?: string;
  attachments: Array<{ title: string; body: string }>;
  /**
   * Erstellungsdatum "TT.MM.JJJJ" fuer die Signaturseite (Kolac-Seite:
   * "Bielefeld, [Datum]"). Bleibt beim Bearbeiten konstant — sonst
   * wuerde jede Aenderung das Ort/Datum-Label neu setzen.
   */
  generatedAt?: string;
}

export interface Contract {
  id: string;
  customerId: string;
  customerSnapshot: {
    company: string;
    firstName: string;
    lastName: string;
    email: string;
    /** Stadt des Kunden — wird im Datumsfeld als „Ort, Datum" gerendert. */
    city?: string;
  };
  typeId: string; // ID des Vertragstyps (siehe contractTypes)
  typeLabel: string; // Snapshot für Anzeige in Listen
  title: string; // freier Titel, z.B. "DSV CarHifi-Herford"
  /** Gesetzt, wenn per Programm-Vorlage erzeugt — dann bearbeitbar. */
  templateData?: ContractTemplateData;
  status: ContractStatus;
  originalPdfPath: string; // Storage-Pfad
  originalPdfUrl: string; // Download-URL
  originalSha256: string; // Hash zur Manipulationsprüfung
  pageCount: number;
  fields: ContractField[];
  signingToken: string; // URL-Token, eindeutig
  signingExpiresAt: Timestamp;
  signedPdfPath: string | null;
  signedPdfUrl: string | null;
  /** Drive-Backup URL des signierten PDFs (best-effort, kann null sein). */
  driveUrl?: string | null;
  reminderEnabled: boolean;
  reminderDays: number; // nach wie vielen Tagen ohne Signing erinnern
  lastReminderAt: Timestamp | null;
  sentAt: Timestamp | null;
  signedAt: Timestamp | null;
  signedByName: string | null; // Name, den der Kunde im Signing-Flow eingibt
  signedFromIp: string | null;
  signedFromUserAgent: string | null;
  audit: ContractAuditEntry[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ContractType {
  id: string;
  label: string; // z.B. "Dienstleistungsvertrag"
  shortLabel: string; // z.B. "DSV"
  description: string;
  active: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ===================================================================
// AUFGABEN (Personal Kanban)
// ===================================================================

export type TaskPriority = 'high' | 'medium' | 'low' | 'idea' | 'custom';

export interface TaskColumn {
  id: string;
  label: string;
  /** Tailwind-Farbklasse für den Akzent-Strich oben. */
  color: TaskPriority;
  order: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Task {
  id: string;
  columnId: string;
  title: string;
  description: string;
  /** Optional — Deadline für die Aufgabe. */
  deadline: Timestamp | null;
  /** Sortierung innerhalb der Spalte (niedrigster Wert = oben). */
  order: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'Software/Tools',
  'Werbung/Ads',
  'Hardware',
  'Reisen',
  'Büro',
  'Weiterbildung',
  'Telefon/Internet',
  'Versicherungen',
  'Sonstiges',
];
