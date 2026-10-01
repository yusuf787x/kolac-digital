import { buildUstvaDetail, summiereDetail, formatRate } from '../ustva-detail';
import type { Invoice } from '../types';

const ts = (iso: string) => ({
  toDate: () => new Date(iso),
  toMillis: () => new Date(iso).getTime(),
});

/** Rechnung mit Positionen und beliebig vielen Zahlungseingaengen. */
const inv = (
  nr: string,
  items: Array<{ totalPrice: number; vatRate?: number }>,
  payments: Array<[string, number]>,
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
    paidAmount: payments.reduce((a, p) => a + p[1], 0),
    paidAt: ts(payments[0][0]),
    payments: payments.map(([d, amount]) => ({ paidAt: ts(d), amount })),
  }) as unknown as Invoice;

const alles = () => true;

// R1223: 1000 netto + 19 % = 1190 brutto, aber als ZWEI Zahlungen
// erfasst (1000 netto + 190 USt). Genau der Fall aus der Praxis.
const r1223 = inv('R1223', [{ totalPrice: 1000, vatRate: 0.19 }], [
  ['2026-08-26', 1000],
  ['2026-08-26', 190],
]);

// Gemischte Saetze: 95 netto zu 19 % plus 286,39 als durchlaufender
// Posten zu 0 %.
const r1225 = inv(
  'R1225',
  [
    { totalPrice: 95.47, vatRate: 0.19 },
    { totalPrice: 286.39, vatRate: 0 },
  ],
  [['2026-08-07', 400]],
);

const rows = buildUstvaDetail([r1223, r1225], alles);

console.log('--- Detailzeilen ---');
rows.forEach((r) =>
  console.log(
    `${r.invoiceNumber}  ${r.paymentCount} Zahlung(en)  brutto ${r.paidGross.toFixed(2).padStart(8)}  netto ${r.paidNet.toFixed(2).padStart(8)}  USt ${r.paidVat.toFixed(2).padStart(7)}  ${r.mehrfachZahlung ? '[zusammengefasst]' : ''}`,
  ),
);

console.log('\n--- Aufteilung nach Steuersatz ---');
rows.forEach((r) => {
  console.log(`${r.invoiceNumber}:`);
  r.byRate.forEach((x) =>
    console.log(
      `   ${formatRate(x.rate).padStart(6)}  netto ${x.net.toFixed(2).padStart(8)}  USt ${x.vat.toFixed(2).padStart(7)}  brutto ${x.gross.toFixed(2).padStart(8)}`,
    ),
  );
});

const s = summiereDetail(rows);
console.log('\n--- Summen ---');
console.log('brutto', s.gross, '| netto', s.net, '| USt', s.vat);
s.byRate.forEach((r) =>
  console.log(`  ${formatRate(r.rate)}: netto ${r.net}, USt ${r.vat}`),
);

console.log('\n--- Gegenproben ---');
const a = rows.find((r) => r.invoiceNumber === 'R1223')!;
console.log('R1223 nur EINE Zeile?        ', rows.filter((r) => r.invoiceNumber === 'R1223').length === 1 ? 'OK' : 'FEHLER');
console.log('R1223 brutto 1190,00?        ', a.paidGross === 1190 ? 'OK' : 'FEHLER ' + a.paidGross);
console.log('R1223 netto 1000,00?         ', a.paidNet === 1000 ? 'OK' : 'FEHLER ' + a.paidNet);
console.log('R1223 USt exakt 190,00?      ', a.paidVat === 190 ? 'OK' : 'FEHLER ' + a.paidVat);
console.log('R1223 als mehrfach markiert? ', a.mehrfachZahlung ? 'OK' : 'FEHLER');
const b = rows.find((r) => r.invoiceNumber === 'R1225')!;
console.log('R1225 zeigt 0 %-Anteil?      ', b.byRate.some((x) => x.rate === 0) ? 'OK' : 'FEHLER');
console.log('R1225 zeigt 19 %-Anteil?     ', b.byRate.some((x) => x.rate === 0.19) ? 'OK' : 'FEHLER');
console.log('0 %-Anteil ohne USt?         ', b.byRate.find((x) => x.rate === 0)?.vat === 0 ? 'OK' : 'FEHLER');
console.log('Summe Saetze = Gesamt-USt?   ', Math.abs(s.byRate.reduce((x, r) => x + r.vat, 0) - s.vat) < 0.02 ? 'OK' : 'FEHLER');
