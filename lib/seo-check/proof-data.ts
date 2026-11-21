/**
 * Belege für die Branchen-Landingpages. Nur echte Werte, keine Kundennamen
 * bei der Praxis-Referenz (Name auf Wunsch weggelassen).
 */

/**
 * Einblendungen und Klicks pro Woche aus der Google Search Console der
 * Praxis-Referenz, ab Einrichtung der Search Console (25.09.2026).
 * Abgerufen am 21.11.2026 über das Kundenportal (Tageswerte, zu Wochen summiert,
 * nur volle Wochen). Am 02.10.2026 gingen 21 neue Ratgeber-Beiträge online.
 */
export const PRAXIS_WEEKS: { label: string; impressions: number; clicks: number }[] = [
  { label: 'ab 25.9.', impressions: 1984, clicks: 136 },
  { label: 'ab 2.10.', impressions: 9802, clicks: 197 },
  { label: 'ab 9.10.', impressions: 12901, clicks: 226 },
  { label: 'ab 16.10.', impressions: 12945, clicks: 222 },
  { label: 'ab 23.10.', impressions: 14409, clicks: 203 },
];

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
 * Echte Search-Console-Screenshots (Domain geschwärzt), liegen in
 * public/images/belege/. Leer = Abschnitt wird nicht angezeigt.
 */
export const BELEG_SCREENSHOTS: { src: string; alt: string; caption: string; width: number; height: number }[] = [];

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
