import { planPaymentMerge, analyzeInvoice } from '../invoice-repair';
import type { Invoice } from '../types';

const ts = (iso: string) => ({
  toDate: () => new Date(iso),
  toMillis: () => new Date(iso).getTime(),
});

const inv = (
  nr: string,
  items: Array<{ totalPrice: number; vatRate?: number }>,
  payments: Array<{ d: string; a: number; note?: string }>,
): Invoice =>
  ({
    id: nr,
    invoiceNumber: nr,
    customerId: 'c1',
    invoiceDate: ts('2026-08-01'),
    dueDate: ts('2026-08-14'),
    status: 'paid',
    items,
    vatRate: 0.19,
    totalAmount: items.reduce((a, i) => a + i.totalPrice, 0),
    paidAmount: payments.reduce((a, p) => a + p.a, 0),
    paidAt: ts(payments[0].d),
    payments: payments.map((p) => ({
      paidAt: ts(p.d),
      amount: p.a,
      ...(p.note ? { note: p.note } : {}),
    })),
  }) as unknown as Invoice;

console.log('=== 1. Gesplittete Zahlung zusammenfuehren (R1223) ===');
const r1223 = inv('R1223', [{ totalPrice: 1000, vatRate: 0.19 }], [
  { d: '2026-08-26', a: 1000 },
  { d: '2026-08-26', a: 190, note: 'Korrektur auf Brutto-Gesamtbetrag' },
]);
const m = planPaymentMerge(r1223);
console.log('Zusammenfassen noetig?', m.needsMerge ? 'ja' : 'nein');
console.log('vorher:', m.before.map((p) => p.amount).join(' + '), '=', m.sumBefore);
console.log('nachher:', m.after.map((p) => p.amount).join(' + '), '=', m.sumAfter);
console.log('Summe unveraendert?    ', m.sumBefore === m.sumAfter ? 'OK' : 'FEHLER');
console.log('Nur noch ein Eintrag?  ', m.after.length === 1 ? 'OK' : 'FEHLER');
console.log('Betrag 1190,00?        ', m.after[0].amount === 1190 ? 'OK' : 'FEHLER');

console.log('\n=== 2. Echte Teilzahlungen bleiben unangetastet ===');
const teil = inv('R1240', [{ totalPrice: 1000, vatRate: 0.19 }], [
  { d: '2026-08-01', a: 500 },
  { d: '2026-09-01', a: 690 },
]);
const m2 = planPaymentMerge(teil);
console.log('Zusammenfassen noetig?', m2.needsMerge ? 'ja' : 'nein');
console.log('Teilzahlungen bleiben? ', !m2.needsMerge && m2.after.length === 2 ? 'OK' : 'FEHLER');

console.log('\n=== 3. Gemischte Steuersaetze: Brutto korrekt? ===');
// 95,47 zu 19 % + 286,39 zu 0 %  ->  netto 381,86, USt 18,14, brutto 400,00
const gemischt = inv(
  'R1225',
  [
    { totalPrice: 95.47, vatRate: 0.19 },
    { totalPrice: 286.39, vatRate: 0 },
  ],
  [{ d: '2026-08-07', a: 381.86 }],
);
const plan = analyzeInvoice(gemischt);
console.log('Brutto laut Reparatur:', plan.bruttoTotal.toFixed(2));
console.log('Korrekt waere 400,00: ', Math.abs(plan.bruttoTotal - 400) < 0.02 ? 'OK' : 'FEHLER');
const altFalsch = Math.round(381.86 * 1.19 * 100) / 100;
console.log(`Alte Formel haette ${altFalsch.toFixed(2)} ergeben, also ${(altFalsch - 400).toFixed(2)} zu viel.`);
console.log('Korrektur als EIN Eintrag?', plan.nextPayments.length === 1 ? 'OK' : 'FEHLER');
console.log('Neuer Betrag 400,00?      ', Math.abs(plan.nextPayments[0].amount - 400) < 0.02 ? 'OK' : 'FEHLER');

console.log('\n=== 4. Netto-Bug erzeugt keine zweite Zahlung mehr ===');
const nettoBug = inv('R1250', [{ totalPrice: 1000, vatRate: 0.19 }], [
  { d: '2026-08-05', a: 1000 },
]);
const plan2 = analyzeInvoice(nettoBug);
console.log('Art:', plan2.kind);
console.log('Eintraege nachher:', plan2.nextPayments.length, plan2.nextPayments.length === 1 ? 'OK' : 'FEHLER');
console.log('Betrag 1190,00?   ', plan2.nextPayments[0].amount === 1190 ? 'OK' : 'FEHLER');
