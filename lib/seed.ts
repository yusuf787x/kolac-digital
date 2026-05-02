import { Timestamp } from 'firebase/firestore';
import { listCustomers, createCustomer, ensureSettings } from './firestore';
import type { Customer } from './types';

const SEED_CUSTOMERS: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    company: 'Mironi',
    salutation: 'Herr',
    firstName: 'Selim',
    lastName: 'Özdemir',
    street: '',
    zip: '',
    city: '',
    email: '',
    phone: '',
    notes: 'Organic Cotton Socks & Underwear, Shopify',
  },
  {
    company: 'CarHifi-Herford',
    salutation: 'Herr',
    firstName: 'Halim',
    lastName: 'Özdemir',
    street: 'Wittekindstr. 10',
    zip: '32051',
    city: 'Herford',
    email: '',
    phone: '',
    notes: '',
  },
  {
    company: 'MK Automobile',
    salutation: 'Herr',
    firstName: 'Mert',
    lastName: 'Külah',
    street: 'Goebenstraße 82',
    zip: '32051',
    city: 'Herford',
    email: '',
    phone: '',
    notes: '',
  },
  {
    company: 'BitsAndBucks',
    salutation: 'Herr',
    firstName: '',
    lastName: '',
    street: '',
    zip: '',
    city: '',
    email: '',
    phone: '',
    notes: '',
  },
];

export interface SeedResult {
  settingsCreated: boolean;
  customersCreated: number;
  customersSkipped: number;
}

export async function seedInitialData(): Promise<SeedResult> {
  const result: SeedResult = {
    settingsCreated: false,
    customersCreated: 0,
    customersSkipped: 0,
  };

  await ensureSettings();
  result.settingsCreated = true;

  const existing = await listCustomers();
  const existingNames = new Set(existing.map((c) => c.company.toLowerCase()));

  for (const customer of SEED_CUSTOMERS) {
    if (existingNames.has(customer.company.toLowerCase())) {
      result.customersSkipped++;
      continue;
    }
    await createCustomer(customer);
    result.customersCreated++;
  }

  return result;
}

// Helper to create a Date Timestamp inline (used by other seeders).
export function dateToTimestamp(d: Date): Timestamp {
  return Timestamp.fromDate(d);
}
