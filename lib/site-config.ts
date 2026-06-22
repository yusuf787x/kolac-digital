/**
 * Zentrale Konstanten der öffentlichen Marketing-Seite.
 *
 * Texte bewusst simpel gehalten. Keine Bindestriche. Du Form.
 */

export const site = {
  name: 'Kolac Digital',
  legalName: 'Kolac Digital',
  baseUrl: 'https://www.kolac-digital.de',
  email: 'yusuf@kolac-digital.de',
  phone: '+49 176 95762018',
  phoneE164: '+4917695762018',
  city: 'Bielefeld',
  region: 'Nordrhein-Westfalen',
  street: 'Beckhausstraße 108',
  zip: '33611',
  founder: 'Yusuf Kolac',
  googleReviewsUrl: 'https://share.google/wT7bMHxCV7NSDWkVp',
  rating: {
    value: 5.0,
    count: 7,
  },
} as const;

/** Pakete und Preise. Immer mit "ab", nie Fixpreis. */
export interface PackageTier {
  id: string;
  name: string;
  pricePrefix: string;
  priceMain: string;
  priceSub?: string;
  description: string;
  bullets: string[];
  highlight?: boolean;
  /** Schema.org Offer Preise */
  priceLow: number;
  priceCurrency: 'EUR';
}

export const packages: PackageTier[] = [
  {
    id: 'basis',
    name: 'Basis Webseite',
    pricePrefix: 'ab',
    priceMain: '1.000 €',
    priceSub: 'plus ab 99 € im Monat',
    description:
      'Eine moderne Webseite für deine Firma. Komplett für dich gebaut.',
    bullets: [
      'Wir bauen alles individuell für dich',
      'Hosting und Wartung sind dabei',
      'Kleine Änderungen sind im Monatspreis drin',
      'Du kannst Texte und Bilder selbst pflegen',
      'Sieht auf Handy und PC gut aus',
      'Fertig in ein bis zwei Wochen',
    ],
    highlight: true,
    priceLow: 1000,
    priceCurrency: 'EUR',
  },
  {
    id: 'baustein',
    name: 'Funktionsbausteine',
    pricePrefix: 'ab',
    priceMain: '500 €',
    description:
      'Wenn du eine bestimmte Funktion brauchst, baue ich sie dir dazu.',
    bullets: [
      'Online Buchungsformular',
      'Anbindung an deinen Shop',
      'Termin Kalender für deine Kunden',
      'Anfragen werden direkt in dein E Mail Postfach geschickt',
      'Anbindung an dein bestehendes System',
    ],
    priceLow: 500,
    priceCurrency: 'EUR',
  },
  {
    id: 'individual',
    name: 'Individualprojekte',
    pricePrefix: 'ab',
    priceMain: '3.000 €',
    priceSub: 'je nach Umfang auch mehr',
    description:
      'Für alle die ein eigenes System brauchen. Mit Datenbank und eigener Logik.',
    bullets: [
      'Komplette eigene Software für dein Geschäft',
      'Übernahme der Daten aus deinem alten System',
      'Verbindung zu deinen Tools und Programmen',
      'Eigene Datenbank für deine Kunden und Aufträge',
      'Wir planen alles vorher gemeinsam',
    ],
    priceLow: 3000,
    priceCurrency: 'EUR',
  },
];

/** Echte Referenz-Projekte. Bilder liegen unter public/images/. */
export interface Reference {
  name: string;
  industry: string;
  image: string;
  blurb: string;
}

export const references: Reference[] = [
  {
    name: 'Carhifi Herford',
    industry: 'Auto und Hifi in Herford',
    image: '/images/carhifi-herford-website.webp',
    blurb:
      'Neue Webseite mit Galerie für die Werkstatt in Herford. Mehr Anrufe in den ersten Wochen.',
  },
  {
    name: 'Bacara',
    industry: 'Restaurant in Bielefeld',
    image: '/images/bacara-website.webp',
    blurb:
      'Stilvolle Webseite mit Speisekarte und direkten Reservierungen.',
  },
  {
    name: 'Mironi',
    industry: 'Mode und Lifestyle',
    image: '/images/mironi-website.webp',
    blurb:
      'Webseite mit Verknüpfung zum Shop. Sauber, schnell und mobil zuerst.',
  },
  {
    name: 'AF Gebäudeservice',
    industry: 'Handwerk in OWL',
    image: '/images/AF-Gebäudeservice.webp',
    blurb:
      'Klare Webseite die Vertrauen aufbaut. Anfragen kommen direkt aufs Handy.',
  },
];

/**
 * Highlight Zitate aus den 7 Google Bewertungen. Platzhalter Texte die
 * realistisch klingen. Vor dem ersten Live Gang gegen die echten Texte
 * von share.google/wT7bMHxCV7NSDWkVp tauschen.
 */
export interface Review {
  author: string;
  text: string;
}

export const reviewHighlights: Review[] = [
  {
    author: 'Cem',
    text:
      'Yusuf hat unsere Webseite in einer Woche neu gebaut. Wir bekommen seit dem deutlich mehr Anrufe. Klare Empfehlung.',
  },
  {
    author: 'Selina',
    text:
      'Endlich eine Webseite die ich auch selbst pflegen kann. Yusuf erklärt alles in Ruhe und ohne Fachchinesisch.',
  },
  {
    author: 'Daniel',
    text:
      'Schnell, freundlich, fair im Preis. Die Anbindung an unser System hat sofort geklappt. Sehr gerne wieder.',
  },
];

/** Häufige Fragen. Auch für FAQPage Schema. */
export interface FaqItem {
  question: string;
  answer: string;
}

export const faqs: FaqItem[] = [
  {
    question: 'Was kostet eine Webseite bei dir?',
    answer:
      'Eine Basis Webseite startet ab 1.000 € Einrichtung und ab 99 € im Monat. Wenn du mehr willst sage ich dir vorher genau was es kostet. Du bekommst nie eine Rechnung die du nicht erwartet hast.',
  },
  {
    question: 'Wie lange dauert das?',
    answer:
      'Eine Basis Webseite ist in ein bis zwei Wochen fertig. Größere Projekte brauchen ein paar Wochen mehr. Wir reden vorher genau über deinen Zeitplan.',
  },
  {
    question: 'Kann ich meine alte Seite und meine alten Daten behalten?',
    answer:
      'Ja. Ich übernehme deine Texte, Bilder und Daten aus deiner alten Seite oder deinem alten System. Du fängst nicht bei Null an.',
  },
  {
    question: 'Funktioniert das auch bei mir vor Ort?',
    answer:
      'Ja. Ich arbeite mit Firmen in ganz Bielefeld, Herford, Gütersloh, Paderborn und im Rest von Nordrhein Westfalen. Wir treffen uns wenn du willst oder reden online.',
  },
  {
    question: 'Kann ich die Webseite später selbst ändern?',
    answer:
      'Ja. Du bekommst einen eigenen Zugang. Du kannst Texte, Bilder und Termine selbst ändern. Wenn du Hilfe brauchst bin ich da.',
  },
  {
    question: 'Was passiert wenn etwas nicht klappt?',
    answer:
      'Ich kümmere mich. Hosting und Wartung sind im Monatspreis dabei. Du brauchst keinen extra Techniker.',
  },
  {
    question: 'Wie geht es nach dem Formular weiter?',
    answer:
      'Ich melde mich innerhalb von 24 Stunden bei dir. Wir reden kurz über dein Projekt. Das Gespräch ist kostenlos und unverbindlich.',
  },
];

/** Service-Regionen. Für lokale Sichtbarkeit. */
export const serviceAreas = [
  'Bielefeld',
  'Herford',
  'Gütersloh',
  'Paderborn',
  'Detmold',
  'Minden',
  'Lippstadt',
  'Münster',
  'Dortmund',
  'OWL',
  'Nordrhein Westfalen',
];
