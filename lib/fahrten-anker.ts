import type {
  Customer,
  Invoice,
  Deal,
  Activity,
  Quote,
  BusinessTrip,
} from './types';
import { FAHRTZIELE, type Fahrtziel } from './fahrten-ziele';

/**
 * Findet Belege dafuer, dass an einem bestimmten Tag mit einem
 * bestimmten Kunden etwas lief.
 *
 * Hintergrund: Ein Fahrtenverzeichnis muss die tatsaechlichen Fahrten
 * abbilden. Wer es nachtraegt, braucht Anhaltspunkte, wann er wo war.
 * Rechnungen, Angebote und Termine aus dem eigenen System sind solche
 * Anhaltspunkte, und zwar belastbare: sie stehen unabhaengig vom
 * Fahrtenbuch in den Geschaeftsunterlagen und lassen sich bei einer
 * Pruefung gegenpruefen.
 *
 * Ein Anker beweist KEINE Fahrt. Ein Angebot kann per Mail rausgegangen
 * sein, ein Termin kann telefonisch stattgefunden haben. Deshalb ist
 * jeder Vorschlag einzeln zu bestaetigen. Die Staerke des Hinweises
 * steht an jedem Eintrag dran.
 */

export type AnkerQuelle = 'meeting' | 'vertrag' | 'angebot' | 'rechnung' | 'deal';

/** Wie stark der Hinweis auf eine Vor-Ort-Fahrt ist. */
export type AnkerStaerke = 'stark' | 'mittel' | 'schwach';

export interface Fahrtanker {
  key: string;
  date: Date;
  customerId: string;
  customerName: string;
  /** Adresse des Kunden aus dem Stammsatz, falls hinterlegt. */
  customerAddress: string;
  quelle: AnkerQuelle;
  /** Was genau an dem Tag passiert ist. */
  label: string;
  staerke: AnkerStaerke;
  /** Passendes Ziel aus dem Katalog, falls erkannt. */
  ziel: Fahrtziel | null;
}

const STAERKE: Record<AnkerQuelle, AnkerStaerke> = {
  meeting: 'stark',
  vertrag: 'mittel',
  angebot: 'mittel',
  rechnung: 'schwach',
  deal: 'schwach',
};

const QUELLE_LABEL: Record<AnkerQuelle, string> = {
  meeting: 'Termin',
  vertrag: 'Vertrag',
  angebot: 'Angebot',
  rechnung: 'Rechnung',
  deal: 'Deal angelegt',
};

export const STAERKE_TEXT: Record<AnkerStaerke, string> = {
  stark: 'Termin erfasst, Fahrt wahrscheinlich',
  mittel: 'Vorgang an dem Tag, Fahrt möglich',
  schwach: 'nur Belegdatum, sagt nichts über eine Fahrt',
};

export { QUELLE_LABEL };

/** Sucht das passende Katalogziel zu einem Kundennamen. */
export function zielFuerKunde(c: Customer): Fahrtziel | null {
  const hay = `${c.company} ${c.firstName} ${c.lastName}`.toLowerCase();
  for (const z of FAHRTZIELE) {
    const needle = z.name.toLowerCase();
    if (hay.includes(needle)) return z;
    // Auch der markante Wortteil zaehlt, damit "CarHiFi Herford" auf
    // "CarHiFi Halim" passt.
    const haupt = needle.split(' ')[0];
    if (haupt.length >= 5 && hay.includes(haupt)) return z;
  }
  return null;
}

function adresse(c: Customer): string {
  return [c.street, [c.zip, c.city].filter(Boolean).join(' ')]
    .filter(Boolean)
    .join(', ');
}

export interface AnkerInput {
  customers: Customer[];
  invoices: Invoice[];
  quotes: Quote[];
  deals: Deal[];
  activities: Activity[];
  /** Nur Anker ab diesem Datum. */
  von: Date;
  /** Nur Anker bis zu diesem Datum. */
  bis: Date;
}

export function sammleAnker(input: AnkerInput): Fahrtanker[] {
  const { customers, invoices, quotes, deals, activities, von, bis } = input;
  const kundeById = new Map(customers.map((c) => [c.id, c]));
  const dealById = new Map(deals.map((d) => [d.id, d]));
  const anker: Fahrtanker[] = [];

  const imZeitraum = (d: Date) => d >= von && d <= bis;

  const push = (
    date: Date,
    customerId: string,
    quelle: AnkerQuelle,
    detail: string,
  ) => {
    if (!imZeitraum(date)) return;
    const c = kundeById.get(customerId);
    if (!c) return;
    anker.push({
      key: `${quelle}-${customerId}-${date.toISOString().slice(0, 10)}-${detail.slice(0, 20)}`,
      date,
      customerId,
      customerName: c.company || `${c.firstName} ${c.lastName}`.trim(),
      customerAddress: adresse(c),
      quelle,
      label: detail,
      staerke: STAERKE[quelle],
      ziel: zielFuerKunde(c),
    });
  };

  for (const inv of invoices) {
    push(
      inv.invoiceDate.toDate(),
      inv.customerId,
      'rechnung',
      inv.invoiceNumber ? `Rechnung ${inv.invoiceNumber}` : 'Rechnung',
    );
  }

  for (const q of quotes) {
    const d = q.quoteDate?.toDate?.();
    if (d) push(d, q.customerId, 'angebot', 'Angebot');
  }

  for (const d of deals) {
    push(d.createdAt.toDate(), d.customerId, 'deal', d.title || 'Deal');
  }

  for (const a of activities) {
    if (!a.dealId) continue;
    const deal = dealById.get(a.dealId);
    if (!deal) continue;
    const d = (a.completedAt ?? a.dueDate ?? a.createdAt)?.toDate?.();
    if (!d) continue;
    if (a.type === 'meeting') {
      push(d, deal.customerId, 'meeting', a.description || 'Termin');
    } else if (a.type === 'vertrag') {
      push(d, deal.customerId, 'vertrag', a.description || 'Vertrag');
    } else if (a.type === 'angebot') {
      push(d, deal.customerId, 'angebot', a.description || 'Angebot');
    }
  }

  // Pro Kunde und Tag nur der staerkste Hinweis. Sonst schlaegt ein Tag
  // mit Termin, Angebot und Rechnung dreimal dieselbe Fahrt vor.
  const rang: Record<AnkerStaerke, number> = {
    stark: 3,
    mittel: 2,
    schwach: 1,
  };
  const beste = new Map<string, Fahrtanker>();
  for (const a of anker) {
    const k = `${a.customerId}-${a.date.toISOString().slice(0, 10)}`;
    const vorhanden = beste.get(k);
    if (!vorhanden || rang[a.staerke] > rang[vorhanden.staerke]) {
      beste.set(k, a);
    }
  }

  return Array.from(beste.values()).sort(
    (a, b) => a.date.getTime() - b.date.getTime(),
  );
}

/** Blendet Anker aus, zu denen schon eine Fahrt am selben Tag steht. */
export function ohneBereitsErfasste(
  anker: Fahrtanker[],
  trips: BusinessTrip[],
): Fahrtanker[] {
  const belegt = new Set(
    trips.map(
      (t) =>
        `${t.destinationName.toLowerCase()}-${t.date.toDate().toISOString().slice(0, 10)}`,
    ),
  );
  return anker.filter(
    (a) =>
      !belegt.has(
        `${(a.ziel?.name ?? a.customerName).toLowerCase()}-${a.date.toISOString().slice(0, 10)}`,
      ),
  );
}
