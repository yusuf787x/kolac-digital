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
  Deal,
  Activity,
  EmailTemplate,
  Contract,
  ContractType,
  Task,
  TaskColumn,
} from './types';
import { buildInvoiceNumber, buildQuoteNumber, tsToMillis } from './utils';
import { SEED_TEMPLATES } from './sales';

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
// DEALS (Vertrieb / Pipeline)
// ===================================================================

const dealsCol = () => collection(db, 'deals');

export async function listDeals(): Promise<Deal[]> {
  const snap = await getDocs(query(dealsCol(), orderBy('updatedAt', 'desc')));
  return snap.docs.map((d) => fromDoc<Deal>(d));
}

export async function listDealsByCustomer(
  customerId: string,
): Promise<Deal[]> {
  // Sort client-side to avoid requiring a composite Firestore index.
  const snap = await getDocs(
    query(dealsCol(), where('customerId', '==', customerId)),
  );
  const list = snap.docs.map((d) => fromDoc<Deal>(d));
  return list.sort(
    (a, b) => tsToMillis(b.updatedAt) - tsToMillis(a.updatedAt),
  );
}

export async function getDeal(id: string): Promise<Deal | null> {
  const snap = await getDoc(doc(db, 'deals', id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Deal;
}

export async function createDeal(
  data: Omit<Deal, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<string> {
  const ref = await addDoc(dealsCol(), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateDeal(
  id: string,
  data: Partial<Omit<Deal, 'id' | 'createdAt' | 'updatedAt'>>,
): Promise<void> {
  await updateDoc(doc(db, 'deals', id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteDeal(id: string): Promise<void> {
  // Aktivitäten des Deals mitlöschen.
  const acts = await getDocs(
    query(activitiesCol(), where('dealId', '==', id)),
  );
  await Promise.all(acts.docs.map((d) => deleteDoc(d.ref)));
  await deleteDoc(doc(db, 'deals', id));
}

// ===================================================================
// AKTIVITÄTEN
// ===================================================================

const activitiesCol = () => collection(db, 'activities');

export async function listActivitiesByDeal(
  dealId: string,
): Promise<Activity[]> {
  // Sort client-side to avoid requiring a composite Firestore index.
  const snap = await getDocs(
    query(activitiesCol(), where('dealId', '==', dealId)),
  );
  const list = snap.docs.map((d) => fromDoc<Activity>(d));
  return list.sort((a, b) => sortKey(b) - sortKey(a));
}

/** Sortierschlüssel: Fälligkeit, sonst Erstelldatum (neueste oben). */
function sortKey(a: Activity): number {
  return (a.dueDate ?? a.createdAt)?.toMillis?.() ?? 0;
}

/** Alle noch offenen (nicht erledigten) Aktivitäten mit Fälligkeitsdatum. */
export async function listOpenActivities(): Promise<Activity[]> {
  const snap = await getDocs(
    query(activitiesCol(), where('completed', '==', false)),
  );
  return snap.docs
    .map((d) => fromDoc<Activity>(d))
    .filter((a) => a.dueDate != null);
}

export async function createActivity(
  data: Omit<Activity, 'id' | 'createdAt'> & { createdAt?: Timestamp },
): Promise<string> {
  const { createdAt, ...rest } = data;
  const ref = await addDoc(activitiesCol(), {
    ...rest,
    createdAt: createdAt ?? serverTimestamp(),
  });
  return ref.id;
}

export async function updateActivity(
  id: string,
  data: Partial<Omit<Activity, 'id' | 'createdAt'>>,
): Promise<void> {
  await updateDoc(doc(db, 'activities', id), data);
}

export async function deleteActivity(id: string): Promise<void> {
  await deleteDoc(doc(db, 'activities', id));
}

// ===================================================================
// E-MAIL-VORLAGEN
// ===================================================================

const templatesCol = () => collection(db, 'emailTemplates');

export async function listEmailTemplates(): Promise<EmailTemplate[]> {
  const snap = await getDocs(query(templatesCol(), orderBy('name')));
  return snap.docs.map((d) => fromDoc<EmailTemplate>(d));
}

export async function getEmailTemplate(
  id: string,
): Promise<EmailTemplate | null> {
  const snap = await getDoc(doc(db, 'emailTemplates', id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as EmailTemplate;
}

export async function createEmailTemplate(
  data: Omit<EmailTemplate, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<string> {
  const ref = await addDoc(templatesCol(), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateEmailTemplate(
  id: string,
  data: Partial<Omit<EmailTemplate, 'id' | 'createdAt' | 'updatedAt'>>,
): Promise<void> {
  await updateDoc(doc(db, 'emailTemplates', id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteEmailTemplate(id: string): Promise<void> {
  await deleteDoc(doc(db, 'emailTemplates', id));
}

/**
 * Legt die Standard-Vorlagen an, falls noch keine existieren.
 * Gibt die Anzahl neu erstellter Vorlagen zurück.
 */
export async function seedEmailTemplates(): Promise<number> {
  const existing = await getDocs(templatesCol());
  if (!existing.empty) return 0;
  await Promise.all(
    SEED_TEMPLATES.map((t) =>
      addDoc(templatesCol(), {
        ...t,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
    ),
  );
  return SEED_TEMPLATES.length;
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
// VERTRÄGE (Contracts)
// ===================================================================

const contractsCol = () => collection(db, 'contracts');
const contractTypesCol = () => collection(db, 'contractTypes');

export async function listContracts(): Promise<Contract[]> {
  const snap = await getDocs(query(contractsCol(), orderBy('createdAt', 'desc')));
  return snap.docs.map((d) => fromDoc<Contract>(d));
}

export async function listContractsByCustomer(
  customerId: string,
): Promise<Contract[]> {
  const snap = await getDocs(
    query(contractsCol(), where('customerId', '==', customerId)),
  );
  const list = snap.docs.map((d) => fromDoc<Contract>(d));
  return list.sort(
    (a, b) => tsToMillis(b.createdAt) - tsToMillis(a.createdAt),
  );
}

export async function getContract(id: string): Promise<Contract | null> {
  const snap = await getDoc(doc(db, 'contracts', id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Contract;
}

export async function createContract(
  data: Omit<Contract, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<string> {
  const ref = await addDoc(contractsCol(), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateContract(
  id: string,
  data: Partial<Omit<Contract, 'id' | 'createdAt' | 'updatedAt'>>,
): Promise<void> {
  await updateDoc(doc(db, 'contracts', id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteContract(id: string): Promise<void> {
  await deleteDoc(doc(db, 'contracts', id));
}

export async function listContractTypes(): Promise<ContractType[]> {
  const snap = await getDocs(query(contractTypesCol(), orderBy('label')));
  return snap.docs.map((d) => fromDoc<ContractType>(d));
}

export async function createContractType(
  data: Omit<ContractType, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<string> {
  const ref = await addDoc(contractTypesCol(), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateContractType(
  id: string,
  data: Partial<Omit<ContractType, 'id' | 'createdAt' | 'updatedAt'>>,
): Promise<void> {
  await updateDoc(doc(db, 'contractTypes', id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteContractType(id: string): Promise<void> {
  await deleteDoc(doc(db, 'contractTypes', id));
}

/** Legt die Standard-Vertragstypen an, falls keine existieren. */
export async function seedContractTypes(): Promise<number> {
  const existing = await getDocs(contractTypesCol());
  if (!existing.empty) return 0;
  const defaults: Array<Omit<ContractType, 'id' | 'createdAt' | 'updatedAt'>> = [
    {
      label: 'Dienstleistungsvertrag',
      shortLabel: 'DSV',
      description: 'Vertrag über die Erstellung und Wartung einer Website.',
      active: true,
    },
    {
      label: 'Auftragsverarbeitungsvertrag',
      shortLabel: 'AVV',
      description: 'DSGVO-AVV gemäß Art. 28 für Hosting und Wartung.',
      active: true,
    },
  ];
  await Promise.all(
    defaults.map((d) =>
      addDoc(contractTypesCol(), {
        ...d,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
    ),
  );
  return defaults.length;
}

// ===================================================================
// AUFGABEN (Tasks Kanban)
// ===================================================================

const taskColumnsCol = () => collection(db, 'taskColumns');
const tasksCol = () => collection(db, 'tasks');

export async function listTaskColumns(): Promise<TaskColumn[]> {
  const snap = await getDocs(query(taskColumnsCol(), orderBy('order')));
  return snap.docs.map((d) => fromDoc<TaskColumn>(d));
}

export async function createTaskColumn(
  data: Omit<TaskColumn, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<string> {
  const ref = await addDoc(taskColumnsCol(), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateTaskColumn(
  id: string,
  data: Partial<Omit<TaskColumn, 'id' | 'createdAt' | 'updatedAt'>>,
): Promise<void> {
  await updateDoc(doc(db, 'taskColumns', id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteTaskColumn(id: string): Promise<void> {
  // Tasks der Spalte ebenfalls löschen, damit keine Waisen übrig bleiben.
  const tasks = await getDocs(query(tasksCol(), where('columnId', '==', id)));
  await Promise.all(tasks.docs.map((d) => deleteDoc(d.ref)));
  await deleteDoc(doc(db, 'taskColumns', id));
}

export async function listTasks(): Promise<Task[]> {
  const snap = await getDocs(query(tasksCol(), orderBy('order')));
  return snap.docs.map((d) => fromDoc<Task>(d));
}

export async function createTask(
  data: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<string> {
  const ref = await addDoc(tasksCol(), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateTask(
  id: string,
  data: Partial<Omit<Task, 'id' | 'createdAt' | 'updatedAt'>>,
): Promise<void> {
  await updateDoc(doc(db, 'tasks', id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteTask(id: string): Promise<void> {
  await deleteDoc(doc(db, 'tasks', id));
}

/** Legt die Standard-Spalten an, falls noch keine existieren. */
export async function seedTaskColumns(): Promise<number> {
  const existing = await getDocs(taskColumnsCol());
  if (!existing.empty) return 0;
  const defaults: Array<Omit<TaskColumn, 'id' | 'createdAt' | 'updatedAt'>> = [
    { label: 'Hoch', color: 'high', order: 0 },
    { label: 'Mittel', color: 'medium', order: 1 },
    { label: 'Niedrig', color: 'low', order: 2 },
    { label: 'Ideen', color: 'idea', order: 3 },
  ];
  await Promise.all(
    defaults.map((d) =>
      addDoc(taskColumnsCol(), {
        ...d,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
    ),
  );
  return defaults.length;
}

// ===================================================================
// GOCARDLESS EVENTS (Webhook-Audit-Log)
// ===================================================================

export interface GocardlessEventDoc {
  id: string;
  resource_type: string;
  action: string;
  created_at: string;
  links?: Record<string, string>;
  details?: {
    origin?: string;
    cause?: string;
    description?: string;
    reason_code?: string;
  };
  receivedAt: Timestamp;
  processedAt?: Timestamp;
  processStatus?: 'ok' | 'ignored' | 'error';
  processNote?: string | null;
  invoiceId?: string | null;
  customerId?: string | null;
}

export async function listGocardlessEvents(
  max = 200,
): Promise<GocardlessEventDoc[]> {
  const snap = await getDocs(
    query(
      collection(db, 'gocardlessEvents'),
      orderBy('receivedAt', 'desc'),
      limit(max),
    ),
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as GocardlessEventDoc);
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
