/**
 * Belege für die Branchen-Landingpages. Nur echte Werte, keine Kundennamen
 * bei der Praxis-Referenz (Name auf Wunsch weggelassen).
 */

/**
 * Klicks und Einblendungen pro Tag aus der Google Search Console der
 * Praxis-Referenz: [Datum, Klicks, Einblendungen]. Ab Einrichtung der Search
 * Console (25.09.2026) bis zum letzten abgeschlossenen Monat im Kundenportal.
 * Abgerufen am 22.11.2026 über portal.mjs data (Feld daily). Den November
 * nach Monatsende ergänzen (portal.mjs fetch geht erst ab 01.12.).
 * Am 02.10.2026 gingen 21 neue Ratgeber-Beiträge online.
 */
export const PRAXIS_DAILY: [string, number, number][] = [
  ['2026-09-25', 21, 155],
  ['2026-09-26', 22, 194],
  ['2026-09-27', 21, 291],
  ['2026-09-28', 13, 289],
  ['2026-09-29', 14, 365],
  ['2026-09-30', 23, 342],
  ['2026-10-01', 22, 348],
  ['2026-10-02', 19, 242],
  ['2026-10-03', 17, 333],
  ['2026-10-04', 19, 1076],
  ['2026-10-05', 35, 1825],
  ['2026-10-06', 23, 2045],
  ['2026-10-07', 41, 2075],
  ['2026-10-08', 43, 2206],
  ['2026-10-09', 46, 2235],
  ['2026-10-10', 20, 1765],
  ['2026-10-11', 31, 1805],
  ['2026-10-12', 37, 1823],
  ['2026-10-13', 28, 1595],
  ['2026-10-14', 38, 1749],
  ['2026-10-15', 26, 1929],
  ['2026-10-16', 32, 1860],
  ['2026-10-17', 22, 1643],
  ['2026-10-18', 29, 1614],
  ['2026-10-19', 23, 1904],
  ['2026-10-20', 37, 1916],
  ['2026-10-21', 39, 1931],
  ['2026-10-22', 40, 2077],
  ['2026-10-23', 32, 2058],
  ['2026-10-24', 24, 1704],
  ['2026-10-25', 26, 1716],
  ['2026-10-26', 28, 2002],
  ['2026-10-27', 27, 2358],
  ['2026-10-28', 33, 2284],
  ['2026-10-29', 33, 2287],
  ['2026-10-30', 37, 2353],
  ['2026-10-31', 40, 1957],
];

/** Markierung in der Grafik. */
export const PRAXIS_MARKER = { date: '2026-10-02', label: '21 neue Ratgeber-Beiträge' };

/** Was bei der Praxis-Referenz umgesetzt wurde (aus den Maßnahmen im Portal). */
export const PRAXIS_MASSNAHMEN: string[] = [
  'Neue Website, alle alten Adressen weitergeleitet',
  'Echte Praxisfotos auf der Website',
  'Eigene Fragen und Antworten auf jeder Leistungsseite',
  '21 Ratgeber-Beiträge zu dem, was Patienten bei Google fragen',
  'Eigene Seiten für die Nachbarstädte',
  'Google-Profil mit Buchungsknopf ergänzt',
  'Alle Google-Bewertungen persönlich beantwortet',
];

/**
 * Echte Search-Console-Screenshots der Praxis-Referenz (ohne Domain), von
 * Yusuf am 21.11.2026 geschickt, liegen in public/images/belege/.
 * Leer = Abschnitt wird nicht angezeigt.
 */
export const BELEG_SCREENSHOTS: { src: string; alt: string; caption: string; width: number; height: number }[] = [
  {
    src: '/images/belege/praxis-search-console-verlauf.png',
    alt: 'Google Search Console der Praxis, Tageswerte vom 25.09. bis 18.11.2026: 1.817 Klicks und 121.219 Impressionen, beide Linien steigen deutlich',
    caption: 'Tageswerte 25.09. bis 18.11.2026: 1.817 Klicks, 121.219 Einblendungen.',
    width: 1236,
    height: 464,
  },
  {
    src: '/images/belege/praxis-search-console-28-tage.png',
    alt: 'Google Search Console der Praxis, letzte 28 Tage gegen die 28 Tage davor: 1.036 statt 781 Klicks, 83.587 statt 37.632 Impressionen',
    caption: 'Letzte 28 Tage (bis 18.11.) gegen die 28 Tage davor: 1.036 statt 781 Klicks, 83.587 statt 37.632 Einblendungen.',
    width: 1231,
    height: 526,
  },
];

/**
 * Gekürzte Google-Bewertungen (Originale in lib/site-config.ts, reviewHighlights).
 * Die Bewertung der Praxis-Referenz bewusst nicht, sonst wäre sie nicht mehr anonym.
 */
export const FUNNEL_REVIEWS: { author: string; text: string }[] = [
  {
    author: 'Kaan',
    text: 'Kolac Digital hat unsere Erwartungen ehrlich gesagt übertroffen. … Die Erreichbarkeit, die Qualität der Arbeit und die schnelle Umsetzung waren top.',
  },
  {
    author: 'may52',
    text: 'Von der Webseitenerstellung bis zum Social-Media-Marketing wurden wir professionell und zuverlässig betreut. Besonders überzeugt haben uns die schnelle Erreichbarkeit, kreative Ideen und die angenehme Zusammenarbeit.',
  },
  {
    author: 'Martin Koebe',
    text: 'Unsere Wünsche wurden schnell verstanden und kreativ umgesetzt, sodass wir mit dem Ergebnis sehr zufrieden sind. … Jederzeit gerne wieder.',
  },
];
