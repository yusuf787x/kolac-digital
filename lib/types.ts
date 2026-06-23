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
  closingText: string;
  pdfUrl: string | null;
  driveUrl: string | null;
  sentAt: Timestamp | null;
  paidAt: Timestamp | null;
  items: InvoiceItem[];
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
  amount: number;
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
