import { buildEurReport, pruefeEurReport } from '../euer-report';
import type { Expense, BusinessTrip } from '../types';

const ts = (iso: string) => ({ toDate: () => new Date(iso), toMillis: () => new Date(iso).getTime() });
const exp = (d: string, cat: string, brutto: number, vat: number, excluded = false) =>
  ({ id: d + cat + brutto, date: ts(d), description: cat, supplier: 'x', category: cat,
     amount: brutto, vatRate: vat, excluded: excluded ? { at: ts(d), reason: 'kilometerpauschale' } : null,
     receiptUrl: null, driveUrl: null, createdAt: ts(d) }) as unknown as Expense;
const trip = (d: string, km: number) =>
  ({ id: 'trip' + d, date: ts(d), startAddress: 'a', destinationName: 'Herford', destinationAddress: 'b',
     purpose: 'Termin', distanceKm: km / 2, roundTrip: true, totalKm: km, ratePerKm: 0.30,
     amount: Math.round(km * 0.30 * 100) / 100, receiptExpenseIds: [], createdAt: ts(d), updatedAt: ts(d) }) as unknown as BusinessTrip;

const expenses: Expense[] = [
  exp('2026-08-20', 'Kfz-Kosten', 71.14, 0.19, true),   // ausgebucht
  exp('2026-09-29', 'Kfz-Kosten', 65.78, 0.19, true),   // ausgebucht
  exp('2026-06-29', 'Kfz-Kosten', 30.00, 0,    true),   // ausgebucht
  exp('2026-08-04', 'Reisen',     24.24, 0.19),          // CarSharing, bleibt
  exp('2026-07-10', 'Software/Tools', 119.00, 0.19),
  exp('2026-07-15', 'Bewirtung',  100.00, 0.19),         // 70 %
  exp('2026-05-01', 'Werbung/Ads', 238.00, 0),           // Kleinunternehmer
  exp('2025-12-01', 'Büro',       50.00, 0.19),          // anderes Jahr
];
const trips: BusinessTrip[] = [trip('2026-07-15', 33.4), trip('2026-08-20', 101.8), trip('2026-09-10', 33.4)];

const r = buildEurReport(expenses, trips, 2026);

console.log('--- EUER-Zeilen 2026 ---');
r.zeilen.forEach((z) => console.log(
  `Z${String(z.line).padStart(3)}  KZ${z.kennzahl}${z.kennzahlNichtAbziehbar ? '/' + z.kennzahlNichtAbziehbar : '    '}  netto ${z.net.toFixed(2).padStart(8)}  abziehbar ${z.deductible.toFixed(2).padStart(8)}  nicht ${z.nonDeductible.toFixed(2).padStart(6)}  ${z.label.slice(0, 45)}`));

console.log('\n--- Summen ---');
console.log('netto gesamt     ', r.totalNet.toFixed(2));
console.log('abziehbar gesamt ', r.totalDeductible.toFixed(2));
console.log('nicht abziehbar  ', r.totalNonDeductible.toFixed(2));
console.log('Fahrten          ', r.tripCount, 'Stueck,', r.tripKm, 'km =', r.tripSum.toFixed(2), 'EUR');
console.log('ausgebucht       ', r.excludedCount, 'Belege,', r.excludedGross.toFixed(2), 'EUR brutto');

console.log('\n--- Gegenproben ---');
const erwartetTrip = 33.4*0.3 + 101.8*0.3 + 33.4*0.3;
console.log('Fahrtsumme 50,58 EUR?       ', Math.abs(r.tripSum - Math.round(erwartetTrip*100)/100) < 0.005 ? 'OK' : 'FEHLER ' + r.tripSum);
console.log('Tankbelege draussen?        ', r.zeilen.every((z) => z.line !== 70) ? 'OK' : 'FEHLER: Zeile 70 taucht auf');
console.log('CarSharing in Z44 drin?     ', r.zeilen.find((z) => z.line === 44)?.net.toFixed(2) === '20.37' ? 'OK' : 'FEHLER');
console.log('Bewirtung 70/30 getrennt?   ', (() => { const b = r.zeilen.find((z) => z.line === 63); return b && Math.abs(b.deductible - 58.82) < 0.02 && Math.abs(b.nonDeductible - 25.21) < 0.02 ? 'OK' : 'FEHLER ' + JSON.stringify(b); })());
console.log('Zweite Kennzahl bei Bewirt.?', r.zeilen.find((z) => z.line === 63)?.kennzahlNichtAbziehbar === 165 ? 'OK' : 'FEHLER');
console.log('Fahrten in Z71 KZ147?       ', (() => { const z = r.zeilen.find((x) => x.line === 71); return z && z.kennzahl === 147 && Math.abs(z.deductible - r.tripSum) < 0.005 ? 'OK' : 'FEHLER'; })());
console.log('Vorjahr ignoriert?          ', r.zeilen.every((z) => z.line !== 51) ? 'OK' : 'FEHLER: Buero 2025 drin');
console.log('Summe Zeilen = Gesamt?      ', Math.abs(r.zeilen.reduce((a,z)=>a+z.deductible,0) - r.totalDeductible) < 0.02 ? 'OK' : 'FEHLER');
console.log('Fahrten im Monat 7 drin?    ', r.byMonth[6] > 100 ? 'OK (' + r.byMonth[6].toFixed(2) + ')' : 'FEHLER ' + r.byMonth[6]);
console.log('Fahrtkosten als Kategorie?  ', r.byCategory['Fahrtkosten (Pauschale)'] ? 'OK' : 'FEHLER');

console.log('\n--- Pruefung ---');
pruefeEurReport(r).forEach((h) => console.log(`[${h.art}] ${h.text}`));
