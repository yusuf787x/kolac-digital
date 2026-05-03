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
}

export interface GoogleAuth {
  refreshToken: string;
  accessToken: string | null;
  tokenExpiresAt: Timestamp | null;
  scopes: string[];
  connectedAt: Timestamp;
  connectedEmail: string;
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
