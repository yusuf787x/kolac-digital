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
}

export interface Invoice {
  id: string;
  customerId: string;
  invoiceNumber: string;
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
}

export type QuoteStatus =
  | 'draft'
  | 'sent'
  | 'accepted'
  | 'rejected'
  | 'invoiced'
  | 'expired';

export interface Quote {
  id: string;
  customerId: string;
  quoteNumber: string;
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
  dealId: string;
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
