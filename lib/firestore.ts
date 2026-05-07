import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  setDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
  runTransaction,
  type DocumentData,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from './firebase';
import type {
  Customer,
  Invoice,
  Expense,
  Quote,
  Settings,
  GoogleAuth,
} from './types';
import { buildInvoiceNumber, buildQuoteNumber } from './utils';

const fromDoc = <T>(d: QueryDocumentSnapshot<DocumentData>): T =>
  ({ id: d.id, ...d.data() } as T);

// ===================================================================
// CUSTOMERS
// ===================================================================

const customersCol = () => collection(db, 'customers');

export async function listCustomers(): Promise<Customer[]> {
  const snap = await getDocs(query(customersCol(), orderBy('company')));
  return snap.docs.map((d) => fromDoc<Customer>(d));
}

export async function getCustomer(id: string): Promise<Customer | null> {
  const snap = await getDoc(doc(db, 'customers', id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Customer;
}

export async function createCustomer(
  data: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<string> {
  const ref = await addDoc(customersCol(), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateCustomer(
  id: string,
  data: Partial<Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>>,
): Promise<void> {
  await updateDoc(doc(db, 'customers', id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteCustomer(id: string): Promise<void> {
  await deleteDoc(doc(db, 'customers', id));
}

// ===================================================================
// INVOICES
// ===================================================================

const invoicesCol = () => collection(db, 'invoices');

export async function listInvoices(): Promise<Invoice[]> {
  const snap = await getDocs(
    query(invoicesCol(), orderBy('invoiceDate', 'desc')),
  );
  return snap.docs.map((d) => fromDoc<Invoice>(d));
}

export async function listInvoicesByCustomer(
  customerId: string,
): Promise<Invoice[]> {
  // Sort client-side to avoid requiring a composite Firestore index.
  const snap = await getDocs(
    query(invoicesCol(), where('customerId', '==', customerId)),
  );
  const list = snap.docs.map((d) => fromDoc<Invoice>(d));
  return list.sort(
    (a, b) => b.invoiceDate.toMillis() - a.invoiceDate.toMillis(),
  );
}

export async function getInvoice(id: string): Promise<Invoice | null> {
  const snap = await getDoc(doc(db, 'invoices', id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Invoice;
}

/**
 * Atomically reserves the next invoice number from settings/config and
 * creates the invoice. Format ("R<n>" vs. "KD-YYYY-NNN") is decided by
 * the invoice date.
 */
export async function createInvoiceWithNumber(
  data: Omit<Invoice, 'id' | 'invoiceNumber' | 'createdAt' | 'updatedAt'>,
): Promise<{ id: string; invoiceNumber: string }> {
  const settingsRef = doc(db, 'settings', 'config');
  const newRef = doc(invoicesCol());

  const invoiceNumber = await runTransaction(db, async (tx) => {
    const settingsSnap = await tx.get(settingsRef);
    const current = settingsSnap.exists()
      ? (settingsSnap.data() as Settings).nextInvoiceNumber
      : 1218;

    const dateObj =
      data.invoiceDate instanceof Timestamp
        ? data.invoiceDate.toDate()
        : new Date(data.invoiceDate as unknown as string);
    const number = buildInvoiceNumber(current, dateObj);

    tx.set(
      settingsRef,
      { nextInvoiceNumber: current + 1 },
      { merge: true },
    );
    tx.set(newRef, {
      ...data,
      invoiceNumber: number,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return number;
  });

  return { id: newRef.id, invoiceNumber };
}

export async function updateInvoice(
  id: string,
  data: Partial<Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>>,
): Promise<void> {
  await updateDoc(doc(db, 'invoices', id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteInvoice(id: string): Promise<void> {
  await deleteDoc(doc(db, 'invoices', id));
}

// ===================================================================
// QUOTES (Angebote)
// ===================================================================

const quotesCol = () => collection(db, 'quotes');

export async function listQuotes(): Promise<Quote[]> {
  const snap = await getDocs(query(quotesCol(), orderBy('quoteDate', 'desc')));
  return snap.docs.map((d) => fromDoc<Quote>(d));
}

export async function listQuotesByCustomer(
  customerId: string,
): Promise<Quote[]> {
  // Sort client-side to avoid requiring a composite Firestore index.
  const snap = await getDocs(
    query(quotesCol(), where('customerId', '==', customerId)),
  );
  const list = snap.docs.map((d) => fromDoc<Quote>(d));
  return list.sort((a, b) => b.quoteDate.toMillis() - a.quoteDate.toMillis());
}

export async function getQuote(id: string): Promise<Quote | null> {
  const snap = await getDoc(doc(db, 'quotes', id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Quote;
}

/**
 * Atomically reserve the next quote number from settings/config and create
 * the quote document.
 */
export async function createQuoteWithNumber(
  data: Omit<Quote, 'id' | 'quoteNumber' | 'createdAt' | 'updatedAt'>,
): Promise<{ id: string; quoteNumber: string }> {
  const settingsRef = doc(db, 'settings', 'config');
  const newRef = doc(quotesCol());

  const quoteNumber = await runTransaction(db, async (tx) => {
    const settingsSnap = await tx.get(settingsRef);
    const current = settingsSnap.exists()
      ? (settingsSnap.data() as Settings).nextQuoteNumber ?? 1
      : 1;

    const dateObj =
      data.quoteDate instanceof Timestamp
        ? data.quoteDate.toDate()
        : new Date(data.quoteDate as unknown as string);
    const number = buildQuoteNumber(current, dateObj);

    tx.set(settingsRef, { nextQuoteNumber: current + 1 }, { merge: true });
    tx.set(newRef, {
      ...data,
      quoteNumber: number,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return number;
  });

  return { id: newRef.id, quoteNumber };
}

export async function updateQuote(
  id: string,
  data: Partial<Omit<Quote, 'id' | 'createdAt' | 'updatedAt'>>,
): Promise<void> {
  await updateDoc(doc(db, 'quotes', id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteQuote(id: string): Promise<void> {
  await deleteDoc(doc(db, 'quotes', id));
}

// ===================================================================
// EXPENSES
// ===================================================================

const expensesCol = () => collection(db, 'expenses');

export async function listExpenses(): Promise<Expense[]> {
  const snap = await getDocs(query(expensesCol(), orderBy('date', 'desc')));
  return snap.docs.map((d) => fromDoc<Expense>(d));
}

export async function getExpense(id: string): Promise<Expense | null> {
  const snap = await getDoc(doc(db, 'expenses', id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Expense;
}

export async function createExpense(
  data: Omit<Expense, 'id' | 'createdAt'>,
): Promise<string> {
  const ref = await addDoc(expensesCol(), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateExpense(
  id: string,
  data: Partial<Omit<Expense, 'id' | 'createdAt'>>,
): Promise<void> {
  await updateDoc(doc(db, 'expenses', id), data);
}

export async function deleteExpense(id: string): Promise<void> {
  await deleteDoc(doc(db, 'expenses', id));
}

// ===================================================================
// SETTINGS
// ===================================================================

const SETTINGS_DOC = doc(db, 'settings', 'config');

export const DEFAULT_SETTINGS: Settings = {
  nextInvoiceNumber: 1218,
  invoiceFormat: 'legacy',
  defaultPaymentDays: 7,
  defaultClosingText: 'Vielen Dank und liebe Grüße\nYusuf Kolac',
  nextQuoteNumber: 1,
  defaultQuoteValidDays: 14,
  defaultQuoteAcceptanceText:
    'Bitte bestätigen Sie das Angebot formlos per E-Mail an yusuf@kolac-digital.de oder per WhatsApp an +49 176 95762018 — alternativ können Sie dieses Angebot auch digital unterschrieben zurücksenden. Die Annahme gilt als Auftragserteilung.',
};

export async function getSettings(): Promise<Settings> {
  const snap = await getDoc(SETTINGS_DOC);
  if (!snap.exists()) return DEFAULT_SETTINGS;
  return { ...DEFAULT_SETTINGS, ...(snap.data() as Settings) };
}

export async function ensureSettings(): Promise<Settings> {
  const snap = await getDoc(SETTINGS_DOC);
  if (!snap.exists()) {
    await setDoc(SETTINGS_DOC, DEFAULT_SETTINGS);
    return DEFAULT_SETTINGS;
  }
  return { ...DEFAULT_SETTINGS, ...(snap.data() as Settings) };
}

export async function updateSettings(
  data: Partial<Settings>,
): Promise<void> {
  await setDoc(SETTINGS_DOC, data, { merge: true });
}

// ===================================================================
// GOOGLE AUTH (OAuth2 Refresh-Token Persistenz)
// ===================================================================

const GOOGLE_AUTH_DOC = doc(db, 'settings', 'google_auth');

export async function getGoogleAuth(): Promise<GoogleAuth | null> {
  const snap = await getDoc(GOOGLE_AUTH_DOC);
  if (!snap.exists()) return null;
  return snap.data() as GoogleAuth;
}

export async function saveGoogleAuth(
  data: Omit<GoogleAuth, 'connectedAt'>,
): Promise<void> {
  await setDoc(GOOGLE_AUTH_DOC, {
    ...data,
    connectedAt: serverTimestamp(),
  });
}

export async function deleteGoogleAuth(): Promise<void> {
  await deleteDoc(GOOGLE_AUTH_DOC);
}

// ===================================================================
// FILE STORAGE (Firebase Storage)
// ===================================================================

export async function uploadFile(
  path: string,
  file: File | Blob,
): Promise<string> {
  const r = ref(storage, path);
  await uploadBytes(r, file);
  return getDownloadURL(r);
}

export async function deleteFile(path: string): Promise<void> {
  const r = ref(storage, path);
  await deleteObject(r);
}
