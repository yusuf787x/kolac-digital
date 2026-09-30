import type { Expense } from './types';
import { grossToNet } from './utils';

/**
 * Erkennt Belege, die im Zusammenhang mit Autofahrten stehen, und
 * bewertet, ob sie neben einer Kilometerpauschale noch als
 * Betriebsausgabe stehen bleiben duerfen.
 *
 * Hintergrund: Wird fuer betriebliche Fahrten mit einem Fahrzeug
 * ausserhalb des Betriebsvermoegens die Kilometerpauschale angesetzt,
 * sind damit SAEMTLICHE Fahrzeugkosten abgegolten. Treibstoff,
 * Wartung, Versicherung, Steuer, Wertverlust und auch Parkgebuehren
 * und Maut. Diese Belege duerfen dann nicht zusaetzlich abgezogen
 * werden.
 *
 * Nicht abgegolten und damit weiter abziehbar sind Kosten, die nichts
 * mit dem Betrieb des Fahrzeugs zu tun haben: Hotel, Bahn, Flug,
 * Taxi, Mietwagen.
 *
 * Die Erkennung ist eine Heuristik. Sie entscheidet nichts, sondern
 * bereitet nur eine Liste zur Durchsicht vor.
 */

export type FahrtkostenVerdict =
  /** Treibstoff oder Ladestrom. Von der Pauschale abgegolten. */
  | 'treibstoff'
  /** Parken, Maut, Vignette, Waesche. Von der Pauschale abgegolten. */
  | 'fahrzeugnebenkosten'
  /** Werkstatt, Versicherung, Kfz-Steuer. Von der Pauschale abgegolten. */
  | 'fahrzeughaltung'
  /** Hotel, Bahn, Flug, Taxi. Bleibt unabhaengig davon abziehbar. */
  | 'reise_bleibt'
  /**
   * CarSharing, Mietwagen, Taxi. Fremde Fahrzeuge, die nicht unter die
   * Kilometerpauschale fallen. Bleiben mit vollem Vorsteuerabzug
   * abziehbar, gehoeren aber in die Kategorie Kfz-Kosten (Zeile 70).
   */
  | 'mietfahrzeug'
  /** In einer Fahrt-Kategorie, aber nicht zuzuordnen. Bitte pruefen. */
  | 'unklar';

export interface FahrtkostenFinding {
  expense: Expense;
  verdict: FahrtkostenVerdict;
  /** Worauf die Einstufung beruht, damit die Zuordnung nachvollziehbar ist. */
  matched: string;
  gross: number;
  net: number;
  /**
   * Vorsteuer, die fuer diesen Beleg gezogen wurde. Bei
   * Kleinunternehmer-Belegen (vatRate 0) ist das null, da war nie
   * etwas abzuziehen.
   */
  vat: number;
}

/** Marken und Begriffe rund um Treibstoff und Ladestrom. */
const TREIBSTOFF = [
  'tankstelle',
  'tanken',
  'tankbeleg',
  'treibstoff',
  'kraftstoff',
  'benzin',
  'diesel',
  'sprit',
  'super e10',
  'super e5',
  'adblue',
  'aral',
  'shell',
  'esso',
  'agip',
  'avia',
  'omv',
  'totalenergies',
  'total energies',
  'jet tank',
  'hem tank',
  'star tank',
  'westfalen tank',
  'ladestrom',
  'ladesaeule',
  'ladesäule',
  'ionity',
  'supercharger',
  'allego',
  'ewe go',
];

/** Kosten, die beim Betrieb des Fahrzeugs anfallen. */
const NEBENKOSTEN = [
  'parkhaus',
  'parkplatz',
  'parkgebühr',
  'parkgebuehr',
  'parkschein',
  'apcoa',
  'contipark',
  'q-park',
  'easypark',
  'parkster',
  'maut',
  'vignette',
  'toll collect',
  'waschanlage',
  'autowäsche',
  'autowaesche',
];

/** Kosten der Fahrzeughaltung. */
const HALTUNG = [
  'werkstatt',
  'inspektion',
  'ölwechsel',
  'oelwechsel',
  'reifen',
  'tüv',
  'tuev',
  'hauptuntersuchung',
  'kfz-steuer',
  'kfz-versicherung',
  'autoversicherung',
  'atu',
  'pit stop',
  'vergölst',
  'vergoelst',
];

/**
 * Fahrzeuge, die dir nicht gehoeren und die du pro Fahrt bezahlst.
 * Die Kilometerpauschale deckt nur das eigene Fahrzeug ab, deshalb
 * bleiben diese Kosten vollstaendig abziehbar, auch die Vorsteuer.
 */
const MIETFAHRZEUG = [
  'carsharing',
  'car-sharing',
  'car sharing',
  'cambio',
  'stadtmobil',
  'greenwheels',
  'book-n-drive',
  'teilauto',
  'miles mobility',
  'share now',
  'sixt share',
  'mietwagen',
  'leihwagen',
  'sixt',
  'europcar',
  'hertz',
  'avis',
  'enterprise rent',
  'buchbinder',
  'taxi',
  'uber',
  'bolt.eu',
  'free now',
];

/** Reisekosten, die neben der Kilometerpauschale bestehen bleiben. */
const REISE_OK = [
  'hotel',
  'übernachtung',
  'uebernachtung',
  'pension',
  'airbnb',
  'booking.com',
  'deutsche bahn',
  'db fernverkehr',
  'bahnticket',
  'bahncard',
  'flixbus',
  'flixtrain',
  'lufthansa',
  'eurowings',
  'ryanair',
  'flugticket',
];

function findMatch(haystack: string, needles: string[]): string | null {
  for (const n of needles) {
    if (haystack.includes(n)) return n;
  }
  return null;
}

/**
 * Stuft einen einzelnen Beleg ein. Gibt null zurueck, wenn der Beleg
 * nichts mit Fahrten zu tun hat und deshalb nicht in die Liste gehoert.
 */
export function classifyExpense(e: Expense): FahrtkostenFinding | null {
  const haystack = `${e.description} ${e.supplier}`.toLowerCase();
  const inFahrtKategorie = e.category === 'Kfz-Kosten' || e.category === 'Reisen';

  let verdict: FahrtkostenVerdict | null = null;
  let matched = '';

  const m = findMatch(haystack, MIETFAHRZEUG);
  const t = findMatch(haystack, TREIBSTOFF);
  const n = findMatch(haystack, NEBENKOSTEN);
  const h = findMatch(haystack, HALTUNG);
  const r = findMatch(haystack, REISE_OK);

  if (m) {
    verdict = 'mietfahrzeug';
    matched = m;
  } else if (t) {
    verdict = 'treibstoff';
    matched = t;
  } else if (n) {
    verdict = 'fahrzeugnebenkosten';
    matched = n;
  } else if (h) {
    verdict = 'fahrzeughaltung';
    matched = h;
  } else if (r) {
    verdict = 'reise_bleibt';
    matched = r;
  } else if (inFahrtKategorie) {
    verdict = 'unklar';
    matched = `Kategorie ${e.category}`;
  }

  if (!verdict) return null;

  // Reverse Charge kommt bei Tankbelegen praktisch nicht vor, wird der
  // Vollstaendigkeit halber aber korrekt behandelt: dort ist `amount`
  // bereits netto.
  const vatRate = e.vatRate ?? 0;
  let gross: number;
  let net: number;
  let vat: number;
  if (e.reverseCharge) {
    net = Math.round(e.amount * 100) / 100;
    vat = 0;
    gross = net;
  } else {
    const split = grossToNet(e.amount, vatRate);
    gross = split.gross;
    net = split.net;
    vat = split.vat;
  }

  return { expense: e, verdict, matched, gross, net, vat };
}

export interface FahrtkostenAnalyse {
  findings: FahrtkostenFinding[];
  /** Belege, die bei Ansatz der Kilometerpauschale entfallen muessen. */
  betroffen: FahrtkostenFinding[];
  /** Belege, die unabhaengig davon stehen bleiben. */
  bleibt: FahrtkostenFinding[];
  /** Belege, die manuell entschieden werden muessen. */
  unklar: FahrtkostenFinding[];
  summeBrutto: number;
  summeNetto: number;
  /** Vorsteuer, die zurueckgedreht werden muss. */
  summeVorsteuer: number;
  /** Jahre, in denen betroffene Belege liegen. Fuer die EÜR-Korrektur. */
  jahre: number[];
  /** Monate mit gezogener Vorsteuer. Fuer berichtigte Voranmeldungen. */
  ustvaMonate: string[];
  /**
   * Vorsteuer-Korrektur je Quartal. Wer vierteljaehrlich voranmeldet,
   * liest hier direkt ab, um wie viel die Vorsteuer im jeweiligen
   * Zeitraum zu kuerzen ist.
   */
  vorsteuerProQuartal: Array<{
    quartal: string;
    vorsteuer: number;
    belege: number;
  }>;
  /** Belege, die bereits ausgebucht sind. */
  bereitsAusgebucht: FahrtkostenFinding[];
  /** Belege, die noch ausgebucht werden muessen. */
  offen: FahrtkostenFinding[];
}

const BETROFFEN: FahrtkostenVerdict[] = [
  'treibstoff',
  'fahrzeugnebenkosten',
  'fahrzeughaltung',
];

export function analysiereFahrtkosten(
  expenses: Expense[],
): FahrtkostenAnalyse {
  const findings = expenses
    .map(classifyExpense)
    .filter((f): f is FahrtkostenFinding => f !== null)
    .sort((a, b) => a.expense.date.toMillis() - b.expense.date.toMillis());

  const betroffen = findings.filter((f) => BETROFFEN.includes(f.verdict));
  const bleibt = findings.filter(
    (f) => f.verdict === 'reise_bleibt' || f.verdict === 'mietfahrzeug',
  );
  const unklar = findings.filter((f) => f.verdict === 'unklar');

  const round2 = (n: number) => Math.round(n * 100) / 100;

  const jahre = Array.from(
    new Set(betroffen.map((f) => f.expense.date.toDate().getFullYear())),
  ).sort();

  const ustvaMonate = Array.from(
    new Set(
      betroffen
        .filter((f) => f.vat > 0)
        .map((f) => {
          const d = f.expense.date.toDate();
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        }),
    ),
  ).sort();

  const quartalMap = new Map<string, { vorsteuer: number; belege: number }>();
  for (const f of betroffen) {
    const d = f.expense.date.toDate();
    const q = `${d.getFullYear()}-Q${Math.floor(d.getMonth() / 3) + 1}`;
    const prev = quartalMap.get(q) ?? { vorsteuer: 0, belege: 0 };
    quartalMap.set(q, {
      vorsteuer: prev.vorsteuer + f.vat,
      belege: prev.belege + 1,
    });
  }
  const vorsteuerProQuartal = Array.from(quartalMap.entries())
    .map(([quartal, v]) => ({
      quartal,
      vorsteuer: round2(v.vorsteuer),
      belege: v.belege,
    }))
    .sort((a, b) => a.quartal.localeCompare(b.quartal));

  return {
    findings,
    betroffen,
    bereitsAusgebucht: betroffen.filter((f) => !!f.expense.excluded),
    offen: betroffen.filter((f) => !f.expense.excluded),
    vorsteuerProQuartal,
    bleibt,
    unklar,
    summeBrutto: round2(betroffen.reduce((a, f) => a + f.gross, 0)),
    summeNetto: round2(betroffen.reduce((a, f) => a + f.net, 0)),
    summeVorsteuer: round2(betroffen.reduce((a, f) => a + f.vat, 0)),
    jahre,
    ustvaMonate,
  };
}

export const VERDICT_LABEL: Record<FahrtkostenVerdict, string> = {
  treibstoff: 'Treibstoff',
  fahrzeugnebenkosten: 'Fahrzeug-Nebenkosten',
  fahrzeughaltung: 'Fahrzeug-Haltung',
  reise_bleibt: 'Reisekosten, bleibt',
  mietfahrzeug: 'Mietfahrzeug, bleibt',
  unklar: 'Unklar, bitte prüfen',
};
